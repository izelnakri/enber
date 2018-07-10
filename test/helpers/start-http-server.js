import compression from 'compression';
import cors from 'cors';
import express from 'express';
import fastbootMiddleware from '../../lib/utils/fastboot-express-middleware';
import morgan from 'morgan';

// NOTE: express.static() gets index.html by default
export default function(entrypoint, port=3000, options={ fastboot: true, memserver: false }) {
  return new Promise((resolve) => {
    const DIST_ROOT = entrypoint.replace('/index.html', '');
    const app = express();

    app.use(cors());
    app.use(compression());
    app.use(morgan('dev'));
    app.use('/assets', express.static(`${DIST_ROOT}/assets`));
    app.use('/images', express.static(`${DIST_ROOT}/images`));
    app.use('/fonts', express.static(`${DIST_ROOT}/fonts`));
    app.use('/crossdomain.xml', express.static(`${DIST_ROOT}/crossdomain.xml`));
    app.use('/robots.txt', express.static(`${DIST_ROOT}/robots.txt`));

    if (!options.memserver) {
      app.get('/users', (req, res) => {
        res.json({
          users: [
            {
              id: 1,
              first_name: 'Izel',
              last_name: 'Nakri',
              active: true
            },
            {
              id: 2,
              first_name: 'Ash',
              last_name: 'Belmokadem',
              active: true
            },
            {
              id: 3,
              first_name: 'Constantijn',
              last_name: 'van de Wetering',
              active: true
            }
          ]
        });
      });
    }

    if (options.fastboot) {
      const FastBoot = require('fastboot');

      const fastboot = new FastBoot({
        distPath: DIST_ROOT,
        resilient: true,
        shouldRender: true,
        sandboxGlobals: options.memserver ? assignSandboxGlobals() : {}
      });

      const lol = app.use((req, res, next) => { // TODO: reload on filesWatcher
        const fastbootByPassQueryParam = req.query.fastboot && (req.query.fastboot === 'false');

        if (fastbootByPassQueryParam) {
          return res.sendFile(entrypoint);
        }
        const middleware = fastbootMiddleware({
          distPath: DIST_ROOT,
          fastboot: fastboot
        })

        return middleware(req, res, next);
      });

      app.get('/*', lol);
    } else {
      app.get('/*', (req, res) => res.sendFile(entrypoint));
    }

    let server = require('http').createServer(app);

    server.listen(port, () => {
      console.log(`HTTP Server listening on ${port}`);
      resolve(server);
    });
  });
}

function assignSandboxGlobals() { // TODO: maybe add PORT as argument
  const JSDOM = require('jsdom').JSDOM;
  const dom = new JSDOM('<p>Hello</p>', { url: 'http://localhost' });

  global.window = dom.window;
  global.document = window.document;
  global.self = window.self;

  return {
    global: global,
    window: global.window,
    document: global.document,
    location: global.window.location,
    XMLHttpRequest: global.window.XMLHttpRequest,
    navigator: global.window.navigator
  };
}
// const FastBoot = require('fastboot');
//
// global.fastboot = new FastBoot({
//   distPath: DIST_PATH,
//   resilient: true,
//   shouldRender: true,
//   sandboxGlobals: assignSandboxGlobals(ENV)
// });
//
// const fastbootMiddleware = FastBootExpressMiddleware({
//   distPath: DIST_PATH,
//   fastboot: global.fastboot,
//   resilient: true,
//   shouldRender: true
// });
//
// server.use((req, res, next) => { // TODO: reload on filesWatcher
//   if (req.path.includes('.html') || !req.path.includes('.')) {
//     const fastbootByPassQueryParam = req.query.fastboot && (req.query.fastboot === 'false');
//
//     if (fastbootByPassQueryParam) {
//       return res.sendFile(`${DIST_PATH}/index.html`);
//     }
//
//     return fastbootMiddleware(req, res, next);
//   }
//
//   next();
// });
