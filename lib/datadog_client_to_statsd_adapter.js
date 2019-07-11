/**
 * Wraps datadog agent to make api compatible with node-statsd
 * API. In particular node-statsd accepts a callback as it last parameter
 * whereas the datadog agent accepts a timestamp as a last paramter but does
 * not accept a callback. The API (without the callback) used to be compatible,
 * however this feature was broken for some time after datadog agent update
 * since it is not very used.
 *
 * More information:
 * https://github.com/dbader/node-datadog-metrics/blob/ca55a11/lib/loggers.js#L71
 * VS
 * https://github.com/sivy/node-statsd/blob/6bce04f/lib/statsd.js#L75 (sampleRate is not mandatory)
 */
class DatadogClientToStatsdAdapter {
  constructor(wrapped) {
    this.wrapped = wrapped;
  }

  gauge(name, value, tags, callback) {
    this.wrapped.gauge(name, value, tags);

    if (callback) { setImmediate(callback); }
  }

  increment(name, value, tags, callback) {
    this.wrapped.increment(name, value, tags);

    if (callback) { setImmediate(callback); }
  }

  histogram(name, value, tags, callback) {
    this.wrapped.histogram(name, value, tags);

    if (callback) { setImmediate(callback); }
  }

  flush() {
    if (typeof this.wrapped.flush === 'function') {
      this.wrapped.flush();
    }
  }
}

module.exports = DatadogClientToStatsdAdapter;
