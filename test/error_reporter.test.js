const assert = require('assert');
const buildErrorReporter = require('../lib/error_reporter');

describe('error reporter', () => {
  function buildErrorReporterClient(ClientConstructorStub) {
    return {
      Client: ClientConstructorStub,
      middleware: {
        express: {
          requestHandler: () => {},
          errorHandler: () => {}
        }
      }
    };
  }

  describe('when using `splitEnvironmentByReleaseChannel` option', () => {
    it('sends environment as environment : release channel to sentry', () => {
      let ravenURL;
      let ravenOptions;

      const ClientConstructorStub = function(url, options) {
        ravenURL = url;
        ravenOptions = options;
      };

      buildErrorReporter({
        name: 'myName',
        version: '0.0.0'
      }, {
        ERROR_REPORTER_URL: 'myErrorReporter',
        ENVIRONMENT: 'myEnvironment',
        RELEASE_CHANNEL: 'myReleaseChannel'
      }, {
        splitEnvironmentByReleaseChannel: true,
        reporterLib: buildErrorReporterClient(ClientConstructorStub)
      });

      assert.equal(ravenURL, 'myErrorReporter');
      assert.deepEqual(ravenOptions,  {
        release: `myName@0.0.0`,
        environment: `myEnvironment:myReleaseChannel`
      });
    });
  });

  it('sends the environment to sentry', () => {
    let ravenURL;
    let ravenOptions;

    const ClientConstructorStub = function(url, options) {
      ravenURL = url;
      ravenOptions = options;
    };

    buildErrorReporter({
      name: 'myName',
      version: '0.0.0'
    }, {
      ERROR_REPORTER_URL: 'myErrorReporter',
      ENVIRONMENT: 'myEnvironment',
      RELEASE_CHANNEL: 'myReleaseChannel'
    }, {
      reporterLib: buildErrorReporterClient(ClientConstructorStub)
    });

    assert.equal(ravenURL, 'myErrorReporter');
    assert.deepEqual(ravenOptions,  {
      release: `myName@0.0.0`,
      environment: `myEnvironment`
    });
  });
});
