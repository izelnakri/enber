import cheerio from 'cheerio';
import fs from 'fs-extra';
import {  promisify } from 'util';
import child_process from 'child_process'; // TODO: instead spawn or fork
import test from 'ava';
import createAdvancedDummyApp from '../helpers/create-advanced-dummy-app';
import http from '../helpers/http';
import mockProcessCWD from '../helpers/mock-process-cwd';
import startBackendAPIServer from '../helpers/start-backend-api-server';
import injectTestContentToHTML from '../helpers/inject-test-content-to-hbs';
import {
  getTimeTakenForApplicationCSS,
  getTimeTakenForApplicationJS,
  getTimeTakenForVendorJS,
  getTimeTakenForMemServerJS
} from '../helpers/parse-time-taken-for-build';
import {
  APPLICATION_CSS_BUILD_TIME_TRESHOLD,
  APPLICATION_CSS_COMPRESSED_BUILD_TIME_TRESHOLD,
  VENDOR_JS_BUILD_TIME_TRESHOLD,
  VENDOR_JS_COMPRESSED_BUILD_TIME_TRESHOLD,
  APPLICATION_JS_BUILD_TIME_TRESHOLD,
  APPLICATION_JS_COMPRESSED_BUILD_TIME_TRESHOLD,
  MEMSERVER_JS_BUILD_TIME_TRESHOLD
} from '../helpers/asset-build-thresholds';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';

const CWD = process.cwd();
const shell = promisify(child_process.exec);
const PROJECT_ROOT = `${process.cwd()}/dummyapp`;
const OUTPUT_INDEX_HTML = `${PROJECT_ROOT}/tmp/index.html`;
const OUTPUT_PACKAGE_JSON = `${PROJECT_ROOT}/tmp/package.json`;
const HTTP_PORT = 1234;
const contentToInject = '<h1 id="inject">injectedTestcontent</h1>'

let childProcessTree = [];

test.beforeEach(async () => {
  await fs.remove('dummyapp');

  try {
    await shell(`kill -9 $(lsof -i TCP:${HTTP_PORT} | grep LISTEN | awk '{print $2}'`);
  } catch(error) {
  }
});

test.afterEach.always(async () => {
  childProcessTree.forEach((childProcess) => childProcess.kill('SIGKILL'));
  childProcessTree.length = 0; // NOTE: JS trick: reset without replacing an array in memory
});

test('$ mber serve -> builds and watches successfully', async (t) => {
  t.plan(48);

  const mock = mockProcessCWD(CWD);

  await createAdvancedDummyApp();

  t.true(!(await fs.exists(`${PROJECT_ROOT}/tmp/assets`)));

  const server = await startBackendAPIServer(3000);
  const { stdout, childProcess } = await spawnProcess(`node ${CWD}/cli.js serve`, {
    cwd: PROJECT_ROOT
  });

  t.true(stdout.includes('ember BUILDING: application.css...'));
  t.true(getTimeTakenForApplicationCSS(stdout) < APPLICATION_CSS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.css in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: vendor.js...'));
  t.true(getTimeTakenForVendorJS(stdout) < VENDOR_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: vendor\.js in \d+ms \[\d+\.\d+ MB\] Environment: development/g.test(stdout));
  t.true(stdout.includes('ember BUILDING: application.js...'));
  t.true(getTimeTakenForApplicationJS(stdout) < APPLICATION_JS_BUILD_TIME_TRESHOLD);
  t.true(/ember BUILT: application\.js in \d+ms \[\d+\.\d+ kB\] Environment: development/g.test(stdout));

  const { html, document } = await testSuccessfullServe(t, stdout, { memserver: false, fastboot: true });

  t.true(!document.querySelector('html').innerHTML.includes(contentToInject));
  t.true(!html.includes(contentToInject));

  const { stdoutAfterInjection } = await injectTestContentToHTML(PROJECT_ROOT, contentToInject, childProcess);

  t.true(stdoutAfterInjection.includes('ember CHANGED: /src/ui/routes/index/template.hbs'));
  t.true(stdoutAfterInjection.includes('ember BUILDING: application.js...'));
  t.true(stdoutAfterInjection.includes('ember BUILT: application.js'));

  const result = await testSuccessfullServe(t, stdout, { memserver: false, fastboot: true });
  const newHTML = result.html;
  // TODO: injectBrowserToNode -> USE pupetteer for content changes, jsdom doesnt support refreshes
  // const newDocument = result.document;

  t.true(newHTML.includes(contentToInject));
  // t.true(newDocument.querySelector('html').innerHTMl.includes(contentToInject))

  server.close();
  mock.removeMock();
});

// test.serial('$ mber serve --env=production -> serves successfully', async (t) => {
//
// });

// test.serial('$ mber serve --env=memserver -> serves successfully', async (t) => {
//
// });

// test.serial('$ mber serve --env=custom -> serves successfully', async (t) => {
//
// });

// test.serial('$ mber serve --fastboot=false -> serves successfully', async (t) => {

// test.serial('$ mber serve --env=memserver --fastboot=false -> builds successfully', async (t) => {

// TODO: different port and socketPort

async function spawnProcess(command, options) {
  return new Promise((resolve, reject) => {
    let stdout = [];
    let childProcess = child_process.exec(command, options);

    childProcessTree.push(childProcess);
    childProcess.stdout.on('data', (data) => {
      stdout.push(data);

      if (data.includes('Server is running on http://localhost:')) {
        setTimeout(() => {
          const result = stdout.join('');
          console.log('stdout is');
          console.log(result);
          resolve({ stdout: result, childProcess });
        }, 2000);
      }
    });
    childProcess.stderr.on('data', (data) => {
      console.log('SPAWNED PROCESS STDERR ERROR:');
      console.log(data);
      reject(data);
    });

    setTimeout(() => {
      console.log('SPAWNED PROCESS RETURNS STDOUT FROM TIMEOUT...');
      const result = stdout.join('');
      console.log('stdout is');
      console.log(result);
      resolve({ stdout: result, childProcess });
    }, 10000);
  });
}

async function testSuccessfullServe(t, stdout, options={ memserver: false, fastboot: true }) {
  const [tmpAssetsFolder, indexHTMLBuffer, packageJSONExists] = await Promise.all([
    fs.readdir('./dummyapp/tmp/assets'),
    fs.readFile(OUTPUT_INDEX_HTML),
    fs.exists(OUTPUT_PACKAGE_JSON)
  ]);
  const indexHTML = indexHTMLBuffer.toString();

  t.true(tmpAssetsFolder.some((entity) => /application\.css/g.test(entity)));
  t.true(tmpAssetsFolder.some((entity) => /vendor\.js/g.test(entity)));
  t.true(tmpAssetsFolder.some((entity) => /application\.js/g.test(entity)));

  if (options.memserver) {
    t.true(tmpAssetsFolder.some((entity) => /memserver\.js/g.test(entity)));
  }

  options.fastboot ? t.true(packageJSONExists) : t.true(!packageJSONExists);
  if (options.fastboot) {
    t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_TITLE -->'));
    t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_HEAD -->'));
    t.true(indexHTML.includes('<!-- EMBER_CLI_FASTBOOT_BODY -->'));
  }

  const window = await injectBrowserToNode({ url: `http://localhost:${HTTP_PORT}` });

  [
    window.Ember, window.Ember.Object, window.requirejs,
    window.require, window.define
  ].forEach((object) => t.truthy(object));

  t.true(document.querySelector('#title').innerHTML === 'Congratulations, you made it!');
  t.deepEqual(Array.from(document.querySelectorAll('#users h4')).map((li) => li.innerHTML), [
    'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
  ]);

  if (options.fastboot) {
    const html = await http.get(`http://localhost:${HTTP_PORT}`);
    const $ = cheerio.load(html);

    console.log('html is', html);

    t.true($('#title').text() === 'Congratulations, you made it!');
    t.deepEqual($('#users h4').toArray().map((li) => $(li).text()), [
      'Izel Nakri', 'Ash Belmokadem', 'Constantijn van de Wetering'
    ]);

    return { html, document: document };
  }

  return { html: document.querySelector('html').innerHTML, document: document };
}
