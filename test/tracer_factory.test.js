const tracingFactory = require('../lib/tracer_factory');
const assert = require('assert');
const opentracing = require('opentracing');

describe('tracer factory', () => {
  describe('when TRACE_AGENT_CLIENT is mock', () => {
    it('returns the mock', () => {
      const tracer = tracingFactory.create({}, {}, { TRACE_AGENT_CLIENT: 'mock' }, {});

      assert.ok(tracer instanceof opentracing.MockTracer);
    });
  });
});
