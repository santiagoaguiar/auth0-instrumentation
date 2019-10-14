'use strict';

exports.tag = function(key, val) {
  return key + ':' + val;
};

exports.processTags = function(tags) {
  if (Array.isArray(tags)) {
    return tags;
  } else if (typeof tags === 'object') {
    const processedTags = [];
    for (let key in tags) {
      processedTags.push(exports.tag(key, tags[key]));
    }
    return processedTags;
  }
  return [];
};


/**
 * buildMetricPrefix constructs a prefix that will be used for all
 * submitted metrics.  It supports omitting the prefix completely
 * when METRICS_PREFIX is set to an empty string.
 *
 * @param env
 * @param pkg
 * @returns {string|string}
 */
exports.buildMetricPrefix = function(env, pkg) {
  if (typeof env.METRICS_PREFIX !== "undefined") {
    return env.METRICS_PREFIX;
  }

  return pkg.name + '.';
};

exports.buildKinesisOptions = function (configMap, keepAliveAgent) {
  return {
    accessKeyId: configMap.AWS_ACCESS_KEY_ID,
    secretAccessKey: configMap.AWS_ACCESS_KEY_SECRET,
    sessionToken: configMap.AWS_SESSION_TOKEN,
    credentials: configMap.AWS_CREDENTIALS,
    streamName: configMap.LOG_TO_KINESIS,
    region: configMap.AWS_KINESIS_REGION || configMap.AWS_REGION,
    partitionKey: function getPartitionKey() { return Date.now().toString() + Math.random(); },
    httpOptions: {
      agent: keepAliveAgent
    },
    objectMode: typeof configMap.KINESIS_OBJECT_MODE !== 'undefined' ? configMap.KINESIS_OBJECT_MODE : true,
    buffer: {
      timeout: configMap.KINESIS_TIMEOUT || 5,
      length: configMap.KINESIS_LENGTH || 50,
      isPrioritaryMsg: function (entry) {
        return entry.level >= 40;
      }
    }
  };
};

exports.decorateLogger = function(logger) {
  const createChildLoggerFactory = function(logger) {
    return function child(childOptions, simple) {
      return exports.decorateLogger(logger.child(childOptions, simple));
    };
  };
  const createLogFormatter = function(logger, lvl) {
    return function formatLog() {
      const args = Array.from(arguments);
      if (typeof args[0] === 'string' && typeof args[1] !== 'string') {
        const swap = args[0];
        args[0] = args[1] || {};
        args[1] = swap;
      }
      return logger[lvl].apply(logger, args);
    };
  };

  return {
    child: createChildLoggerFactory(logger),
    trace: createLogFormatter(logger, 'trace'),
    debug: createLogFormatter(logger, 'debug'),
    info: createLogFormatter(logger, 'info'),
    warn: createLogFormatter(logger, 'warn'),
    error: createLogFormatter(logger, 'error'),
    fatal: createLogFormatter(logger, 'fatal'),
    reopenFileStreams: () => {
      if (!logger || !logger.reopenFileStreams) { return; }
      logger.reopenFileStreams();
    }
  };
};
