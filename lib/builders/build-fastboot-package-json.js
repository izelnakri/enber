import fs from 'fs/promises';
import findProjectRoot from '../utils/find-project-root.js';

export default async function(
  assetMap = {},
  buildConfig = {
    applicationName: null,
    buildCache: {
      vendorAppends: '',
      vendorPrepends: '',
      applicationAppends: '',
      applicationPrepends: ''
    },
    cliArguments: {},
    ENV: {},
    indexHTMLInjections: {},
    projectRoot: null
  },
  distPath = 'dist'
) {
  const ENV = buildConfig.ENV || { APP: {}, environment: 'development' };
  const applicationName = ENV.modulePrefix || 'frontend';
  const applicationPath = assetMap['assets/application.js'];
  const projectRoot = buildConfig.projectRoot || (await findProjectRoot());
  const packageJSON = JSON.parse((await fs.readFile(`${projectRoot}/package.json`)).toString());

  return fs.writeFile(
    `${projectRoot}/${distPath}/package.json`,
    JSON.stringify(
      {
        dependencies: {
          'node-fetch': '^2.6.0'
        },
        fastboot: {
          appName: applicationName,
          config: {
            [applicationName]: Object.assign(ENV, {
              APP: Object.assign(ENV.APP, {
                autoboot: false,
                name: ENV.modulePrefix,
                version: '0.0.0+b5f80b0d'
              }),
              exportApplicationGlobal: true, // NOTE: research this new key
              isModuleUnification: true
            })
          },
          hostWhitelist:
            ENV.fastboot && ENV.fastboot.hostWhitelist ? ENV.fastboot.hostWhitelist : [],
          manifest: {
            appFiles:
              ENV.memserver && ENV.memserver.enabled
                ? [applicationPath, assetMap['assets/memserver.js']]
                : [applicationPath],
            htmlFile: 'index.html',
            vendorFiles: [assetMap['assets/vendor.js']]
          },
          moduleWhitelist: Array.from(new Set((packageJSON.fastbootDependencies || []).concat([
            'node-fetch'
          ]))),
          schemaVersion: 3
        }
      },
      null,
      2
    )
  );
}

// NOTE: this manifest file is stupid all fastboot needs should be ENV object(or maybe even environment string) + index.html location
