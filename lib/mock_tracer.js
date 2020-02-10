const opentracing = require('opentracing');
const _ = require('lodash');

// This is useful for integration tests
module.exports = function() {
  tracer = new opentracing.MockTracer();
  tracer._baggageItems = {};

  tracer._setBaggageItem = function(key, val) {
    tracer._baggageItems[key] = val;
  };

  tracer._getBaggageItem = function(key) {
    return tracer._baggageItems[key];
  };

  tracer.getBaggageItems = function() {
    return tracer._baggageItems;
  };

  const superAllockSpan = tracer._allocSpan;
  tracer._allocSpan = function () {
    const span = superAllockSpan();
    span._baggageItems = tracer._baggageItems;
    span._setBaggageItem = tracer._setBaggageItem;
    span._getBaggageItem = tracer._getBaggageItem;

    return span;
  };

  tracer._inject = function inject(span, format, carrier) {
    span = span._span || span;
    if (typeof carrier === 'object' && (format === opentracing.FORMAT_HTTP_HEADERS || format === opentracing.FORMAT_TEXT_MAP)) {
      carrier['ot-mock-tracer'] = span.uuid();
      carrier['ot-mock-operation'] = span.operationName();

      _.forEach(span._baggageItems, (value, key) => {
        carrier[`ot-mock-baggage-${key}`] = value;
      });
    }
  };

  tracer._extract = function extract(format, carrier) {
    if (typeof carrier === 'object' && (format === opentracing.FORMAT_HTTP_HEADERS || format === opentracing.FORMAT_TEXT_MAP)) {
      const span = tracer.startSpan(carrier['ot-mock-operation']);
      span._uuid = carrier['ot-mock-tracer'];

      _.forEach(carrier, (value, key) => {
        if (key.indexOf('ot-mock-baggage-') === 0) {
          span.setBaggageItem(key.replace('ot-mock-baggage-', ''), value);
        }
      });

      return span;
    }
  };

  return tracer;
};
