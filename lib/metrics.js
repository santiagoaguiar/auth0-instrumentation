const blocked = require('blocked');
const pusage = require('pidusage');
const uuid = require('uuid');
const utils = require('./utils');
const metricsFactory = require('./metrics_factory');
const stubs = require('./stubs').metrics;


module.exports = function (pkg, env) {
  if (!env.STATSD_HOST && !env.METRICS_API_KEY) {
    return stubs;
  }

  const metrics = metricsFactory.create(pkg, env);

  const obj = {
    isActive: true,
    trackIds: {},
    __defaultTags: []
  };

  if (env.SERVICE_NAME) {
    obj.__defaultTags.push(`service_name:${env.SERVICE_NAME}`);
  } else if (env.METRICS_PKG_AS_SERVICE_NAME) {
    obj.__defaultTags.push(`service_name:${pkg.name}`);
  }
  const getTags = function (tags) {
    return obj.__defaultTags.concat(utils.processTags(tags));
  };

  obj.setDefaultTags = function (tags) {
    obj.__defaultTags = utils.processTags(tags);
  };

  obj.gauge = function (name, value, tags, callback) {
    callback = callback || stubs.callback;
    return metrics.gauge(name, value, getTags(tags), callback);
  };

  obj.increment = function (name, value, tags, callback) {
    callback = callback || stubs.callback;
    if (Array.isArray(value)) {
      tags = value;
      value = 1;
    }
    return metrics.increment(name, value, getTags(tags), callback);
  };

  obj.incrementOne = function(name, tags, callback){
    return obj.increment(name, 1, tags, callback);
  };

  // Observe a value, and increment a counter with tags that
  // correspond to the values given in `buckets`. This generates
  // metrics similar to a prometheus histogram, and is useful for
  // measuring latency values.
  // For example, given a set of buckets [10, 100, 250], a value
  // of 55 would increment a counter metric with tags le:100 and le:250,
  // since it is less than (or equal to) both of those values, along
  // with a special 'le:Inf' tag, which is present even for values that
  // exceed the largest specified bucket. Since it is greater than
  // 10, a le:10 tag would not be added.
  obj.observeBucketed = function(name, value, buckets, tags, callback) {
    var t = getTags(tags);
    t.push('le:Inf');
    buckets.forEach((bucket) => {
      if (value <= bucket) {
        t.push(`le:${bucket}`);
      }
    });
    return metrics.increment(name, 1, t, callback);
  };

  obj.histogram = function (name, value, tags, callback) {
    callback = callback || stubs.callback;
    return metrics.histogram(name, value, getTags(tags), callback);
  };

  obj.flush = function () {
    if (!env.STATSD_HOST) {
      return metrics.flush();
    }
    // STATSD does not require flush.
    return;
  };

  obj.time = function (metricName, tags) {
    const id = uuid.v4();
    obj.increment(`${metricName}.started`, 1, tags);
    obj.trackIds[id] = { date: Date.now(), metricName: metricName };
    return id;
  };

  obj.endTime = function (id, tags) {
    if (!obj.trackIds[id]) {
      return;
    }

    const metricName = obj.trackIds[id].metricName;
    var time = Date.now() - obj.trackIds[id].date;
    delete obj.trackIds[id];
    obj.increment(`${metricName}.ended`, 1, tags);
    obj.histogram(`${metricName}.time`, time, tags);
    return time;
  };

  obj.startResourceCollection = function (tags) {
    if (!env.COLLECT_RESOURCE_USAGE) {
      return;
    }

    tags = tags || {};

    setInterval(function () {
      var memUsage = process.memoryUsage();
      obj.gauge('resources.memory.heapTotal', memUsage.heapTotal, tags);
      obj.gauge('resources.memory.heapUsed', memUsage.heapUsed, tags);

      // added in Node 7.2: memory usage of C++ objects bound to JavaScript objects managed by V8
      if (memUsage.external) {
        obj.gauge('resources.memory.external', memUsage.external, tags);
      }

      pusage.stat(process.pid, function (err, stat) {
        if (err) {
          return;
        }
        obj.gauge('resources.memory.usage', stat.memory, tags);
        obj.gauge('resources.cpu.usage', stat.cpu, tags);
      });
    }, env.COLLECT_RESOURCE_USAGE_INTERVAL || 5000);

    blocked(function (ms) {
      obj.histogram('event_loop.blocked', ms, tags);
    });
  };

  obj.close = function () {
    metrics.socket.close()
  }

  return obj;
};
