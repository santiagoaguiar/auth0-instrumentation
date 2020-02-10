const tracingFactory = require('../lib/tracer_factory');
const assert = require('assert');
const opentracing = require('opentracing');
const o11y = require('@a0/observability-nodejs');

describe('tracer factory', () => {
  describe('when setting up SLI tracer', () => {
    it('returns the multitracer with the selected tracer as primary and the sli trace as secondary tracer', () => {
      const tracer = tracingFactory.create({}, {}, { TRACE_AGENT_CLIENT: 'mock' }, {
        slis: {
          operationsToTrack: {
            'my_operation': {}
          }
        }
      });
      assert.ok(tracer instanceof o11y.tracing.MultiTracer);
      assert.ok(tracer.primaryTracer instanceof opentracing.MockTracer);
      assert.ok(tracer.additionalTracers[0] instanceof o11y.slis.tracing.Tracer);
    });
  });

  describe('when TRACE_AGENT_CLIENT is mock', () => {
    it('returns the mock', () => {
      const tracer = tracingFactory.create({}, {}, { TRACE_AGENT_CLIENT: 'mock' }, {});

      assert.ok(tracer instanceof opentracing.MockTracer);
    });

    describe('extract mock', () => {
      it('extracts the parent span', () => {
        const tracer = tracingFactory.create({}, {}, { TRACE_AGENT_CLIENT: 'mock' }, {});

        const carrier = {
          'ot-mock-tracer': 'myId',
          'ot-mock-operation': 'myOperation'
        };

        const newSpan = tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier);

        assert.strictEqual(newSpan.uuid(), 'myId');
        assert.strictEqual(newSpan.operationName(), 'myOperation');
      });

      it('extracts baggage items', () => {
        const tracer = tracingFactory.create({}, {}, { TRACE_AGENT_CLIENT: 'mock' }, {});

        const carrier = {
          'ot-mock-tracer': 'myId',
          'ot-mock-operation': 'myOperation',
          'ot-mock-baggage-a': 'b'
        };

        const newSpan = tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier);

        assert.strictEqual(newSpan.getBaggageItem('a'), 'b');
      });
    });

    describe('inject mock', () => {
      it('injects the parent span', () => {
        const tracer = tracingFactory.create({}, {}, { TRACE_AGENT_CLIENT: 'mock' }, {});

        const span = tracer.startSpan('myOperation');

        const carrier = {};
        tracer.inject(span, opentracing.FORMAT_TEXT_MAP, carrier);

        assert.deepEqual(carrier, {
          'ot-mock-tracer': span.uuid(),
          'ot-mock-operation': 'myOperation'
        });
      });

      it('propagates baggage items', () => {
        const tracer = tracingFactory.create({}, {}, { TRACE_AGENT_CLIENT: 'mock' }, {});

        const span = tracer.startSpan('myOperation');
        span.setBaggageItem('a', 'b');

        const carrier = {};
        tracer.inject(span, opentracing.FORMAT_TEXT_MAP, carrier);

        assert.deepEqual(carrier, {
          'ot-mock-tracer': span.uuid(),
          'ot-mock-operation': 'myOperation',
          'ot-mock-baggage-a': 'b'
        });
      });
    });
  });

  describe('setBaggageItem/getBaggageItem', () => {
    it('supports propagating baggage items', () => {
      const tracer = tracingFactory.create({}, {}, { TRACE_AGENT_CLIENT: 'mock' }, {});
      const spanA = tracer.startSpan('myOperation');
      const spanB = tracer.startSpan('myOperation1', { childOf: spanA });

      spanA.setBaggageItem('a', 'b');

      assert(spanA.getBaggageItem('a'), 'b');
      assert(spanB.getBaggageItem('a'), 'b');
    });
  });
});
