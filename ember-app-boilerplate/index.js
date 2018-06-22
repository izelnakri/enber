/* eslint-env node */
const app = require('../index.js');

module.exports = function(ENV) {
  const { environment } = ENV;

  app.importAddon('mber-head', { type: 'vendor' });
  // app.importAsAMDModule('moment', 'node_modules/moment/min/moment.min.js');
  // app.importAsAMDModule('bip39');

  if (environment !== 'production') {
    app.importAddon('ember-devtools', { type: 'vendor' });
  }

  if (ENV.googleAnalyticsId) {
    app.injectInlineContent('googleAnalytics', `
      <script>
        window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
        ga('create', '${ENV.googleAnalyticsId}', 'auto');
      </script>
      <script async src='https://www.google-analytics.com/analytics.js'></script>
    `);
  }

  return app.build(environment);
}
