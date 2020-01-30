const bunyan = require('bunyan');
const Auth0SentryStream = require('./auth0_sentry_stream').Auth0SentryStream;
const ProcessInfo = require('auth0-common-logging').ProcessInfo;
const Serializers = require('auth0-common-logging').Serializers;
const Streams = require('auth0-common-logging').Streams;
const KinesisWritable = require('aws-kinesis-writable');

const utils = require('./utils');
const KeepAliveAgentRegistry = require('./keep_alive_agent');
const decorateLogger = require('./utils').decorateLogger;
const spawn = require('child_process').spawn;

module.exports = function getLogger(pkg, env, serializers, agent, errorReporter) {
  if (!serializers) {
    serializers = Serializers;
  }

  const bunyan_streams = [];

  if (env.LOG_FILE) {
    bunyan_streams.push({
      level: env.CONSOLE_LOG_LEVEL || env.LOG_LEVEL,
      path: env.LOG_FILE
    });
  } else if (env.CONSOLE_NICE_FORMAT) {
    const bunyanFormatter = spawn(`${__dirname}/../node_modules/.bin/bunyan`,
      [ '--color' ], {
        stdio: [ 'pipe', 'inherit', 'inherit' ]
      });
    bunyan_streams.push({
      level: env.CONSOLE_LOG_LEVEL || env.LOG_LEVEL,
      stream: bunyanFormatter.stdin
    });
  } else {
    bunyan_streams.push({
      level: env.CONSOLE_LOG_LEVEL || env.LOG_LEVEL,
      stream: process.stdout
    });
  }

  if (process.env.NODE_ENV === 'production' && env.LOG_TO_WEB_URL) {
    var httpStream = new Streams.HttpWritableStream(env.LOG_TO_WEB_URL);
    httpStream.on('error', function(err) {
      if (err) {
        console.error('Error on writing logs to web url', JSON.stringify({
          message: err.message,
          stack: err.stack
        }));
      } else {
        console.error('Error on writing logs to web url');
      }
    });
    bunyan_streams.push({
      name: 'web-url',
      stream: httpStream,
      level: env.LOG_TO_WEB_LEVEL || 'error'
    });
  }

  if (env.LOG_TO_KINESIS) {
    agent = agent || KeepAliveAgentRegistry(env);
    var stream = new KinesisWritable(utils.buildKinesisOptions(env, agent));

    var streamErrorHandler = function(err) {
      if (err) {
        console.error('Error on writing logs to Kinesis', JSON.stringify({
          message: err.message,
          records: err.records,
          stack: err.stack
        }));
      } else {
        console.error('Error on writing logs to Kinesis');
      }
    };

    stream.on('error', streamErrorHandler);

    bunyan_streams.push({
      name: 'kinesis',
      stream: stream,
      level: env.LOG_TO_KINESIS_LEVEL,
      type: env.LOG_TO_KINESIS_LOG_TYPE
    });

  }

  if (env.LOG_STREAM_ENABLE_SCHEMA_DEBUG) {
     bunyan_streams.push({
       name: 'schema-debug',
       stream: new Streams.Standardization.SchemaDebugStream({
         exitOnError: env.LOG_STREAM_ENABLE_SCHEMA_EXIT_ON_ERROR || false,
       }),
       level: env.CONSOLE_LOG_LEVEL
     });
  }

  bunyan_streams.push({
    name: 'sentry',
    stream: new Auth0SentryStream(errorReporter),
    level: env.ERROR_REPORTER_LOG_LEVEL || 'error',
    type: 'raw'
  });

  const process_info = ProcessInfo &&
    !env.IGNORE_PROCESS_INFO &&
    ProcessInfo.version !== '0.0.0' ? ProcessInfo : undefined;

  const logger = bunyan.createLogger({
    name:         pkg.name,
    process:      process_info,
    region:       env.AWS_REGION,
    service_name: env.SERVICE_NAME,
    environment:  env.ENVIRONMENT,
    purpose:      env.PURPOSE,
    channel:      env.RELEASE_CHANNEL,
    streams:      bunyan_streams,
    serializers:  serializers
  });

  logger.on('error', function(err, stream) {
    console.error('Cannot write to log stream ' + stream.name + ' ' + (err && err.message));
  });

  return decorateLogger(logger);
};
