const hapiPluginBuilder = require('./hapi_plugin_builder');
const defaultReporterLib = require('raven');

/**
 * @param {Object} options
 * @param {boolean} options.useFullyQualifiedEnvironment Send release channel as part of the environment
 */
module.exports = function(pkg, env, options) {
  options = options || {};

  if (!env.ERROR_REPORTER_URL) {
    return require('./stubs').errorReporter;
  }

  // `splitEnvironmentByReleaseChannel` is preferred over overriding the environment
  // manually: for this to be useful it must match the convention we are
  // using when sending the deployments to sentry.
  //
  // The reason to support this format instead of plain-old environment is so
  // we can take advantage of sentry features, for example, we might decide to
  // take some action if we see an increase of error in canary but not in stable.
  // Those capabilities are associated with sentry being able to correctly isolate
  // the different deployment environments.
  var environment = env.ENVIRONMENT;
  if (env.RELEASE_CHANNEL && options.splitEnvironmentByReleaseChannel) {
    environment = `${env.ENVIRONMENT}:${env.RELEASE_CHANNEL}`;
  }

  var raven = options.reporterLib || defaultReporterLib;
  var client = new raven.Client(env.ERROR_REPORTER_URL, {
    release: env.SENTRY_RELEASE || `${pkg.name}@${pkg.version}`,
    environment: env.SENTRY_ENVIRONMENT || environment
  });

  client.hapi = {
    plugin: hapiPluginBuilder(client)
  };

  client.express = {
    requestHandler: raven.middleware.express.requestHandler(env.ERROR_REPORTER_URL),
    errorHandler: raven.middleware.express.errorHandler(env.ERROR_REPORTER_URL)
  };

  client.isActive = true;
  return client;
};
