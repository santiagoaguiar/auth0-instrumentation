const url = require('url');
const dns = require('dns');
const StatsD = require('node-statsd');
const datadog = require('datadog-metrics');
const DatadogClientToStatsdAdapter = require('./datadog_client_to_statsd_adapter');

function buildStatsD(pkg, env) {
  const parsedURL = url.parse(env.STATSD_HOST);
  let host = parsedURL.hostname;
  let cacheDNS = true;
  if (parsedURL.hostname === 'localhost' || parsedURL.hostname === '127.0.0.1') {
    host = null;
    cacheDNS = false;
  }

  let client = new StatsD({
    host: host,
    port: Number(parsedURL.port),
    prefix: env.METRICS_PREFIX || (pkg.name + '.'),
    cacheDns: cacheDNS
  });
  client.host = host;
  // client.socket._handle.lookup = dns.lookup.bind(dns);
  if (env.METRICS_BYPASS_DNS && host === null) {
    client.socket._handle.lookup = (hostname, cb) => {
      cb(null, '127.0.0.1', 4);
    };
  }
  return client;
}

function buildDataDog(pkg, env) {
  const dd = new datadog.BufferedMetricsLogger({
    apiKey: env.METRICS_API_KEY,
    host: env.METRICS_HOST || require('os').hostname(),
    prefix: env.METRICS_PREFIX || (pkg.name + '.'),
    flushIntervalSeconds: env.METRICS_FLUSH_INTERVAL || 15
  });

  return new DatadogClientToStatsdAdapter(dd);
}

exports.create = (pkg, env) => {
  var client;

  if (env.STATSD_HOST) {
    client = buildStatsD(pkg, env);
    client.socket.on('error', function noop() {});
  } else if (env.METRICS_API_KEY) {
    client = buildDataDog(pkg, env);
  }

  return client;
};

module.exports = exports;

