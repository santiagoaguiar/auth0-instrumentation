const assert = require('assert');
const buildSwitchableTracer = require('../lib/switchable_tracer');
const stubs = require('../lib/stubs');

describe('Switchable tracer', () => {
  function buildMockTracer(tags) {
    const startSpanCalls = [];
    const injectCalls = [];
    const extractCalls = [];

    return {
      mock: {
        startSpan: (name, options) => {
          startSpanCalls.push({ name, options });
        },
        inject: (spanContext, format, carrier) => {
          injectCalls.push({ spanContext, format, carrier });
        },
        extract: (format, carrier) => {
          extractCalls.push({ format, carrier });
        },
        Tags: tags
      },
      getResult: () => ({ startSpanCalls, injectCalls, extractCalls })
    };
  }

  let switchableTracer;
  let baseTracerMock;
  let tracerStubsMock;

  describe('when isEnabled fails', () => {
    let error = new Error();

    beforeEach(() => {
      baseTracerMock = buildMockTracer({ base_tracer: true });
      tracerStubsMock = buildMockTracer({ base_tracer: false });

      switchableTracer = buildSwitchableTracer({
        baseTracer: baseTracerMock.mock,
        tracerStubs: tracerStubsMock.mock,
        isEnabled: () => { throw error; },
        logger: {
          error: () => {}
        }
      });
    });

    it('calls startSpan from stubs', () => {
      const name = 'name';
      const options = {};
      switchableTracer.startSpan(name, options);

      assert.equal(tracerStubsMock.getResult().startSpanCalls[0].name, name);
      assert.equal(tracerStubsMock.getResult().startSpanCalls[0].options, options);
      assert.equal(baseTracerMock.getResult().startSpanCalls.length, 0);
    });

    it('calls inject from stubs', () => {
      const format = 'format';
      const carrier = 'carrier';
      const spanContext = {};
      switchableTracer.inject(spanContext, format, carrier);

      assert.equal(tracerStubsMock.getResult().injectCalls[0].format, format);
      assert.equal(tracerStubsMock.getResult().injectCalls[0].carrier, carrier);
      assert.equal(tracerStubsMock.getResult().injectCalls[0].spanContext, spanContext);
      assert.equal(baseTracerMock.getResult().injectCalls.length, 0);
    });

    it('calls extract from stubs', () => {
      const format = 'format';
      const carrier = 'carrier';
      switchableTracer.extract(format, carrier);

      assert.equal(tracerStubsMock.getResult().extractCalls[0].format, format);
      assert.equal(tracerStubsMock.getResult().extractCalls[0].carrier, carrier);
      assert.equal(baseTracerMock.getResult().extractCalls.length, 0);
    });
  });

  describe('when tracer is disabled', () => {
    beforeEach(() => {
      baseTracerMock = buildMockTracer({ base_tracer: true });
      tracerStubsMock = buildMockTracer({ base_tracer: false });

      switchableTracer = buildSwitchableTracer({
        baseTracer: baseTracerMock.mock,
        tracerStubs: tracerStubsMock.mock,
        isEnabled: () => false
      });
    });

    it('calls startSpan from stubs', () => {
      const name = 'name';
      const options = {};
      switchableTracer.startSpan(name, options);

      assert.equal(tracerStubsMock.getResult().startSpanCalls[0].name, name);
      assert.equal(tracerStubsMock.getResult().startSpanCalls[0].options, options);
      assert.equal(baseTracerMock.getResult().startSpanCalls.length, 0);
    });

    it('calls inject from stubs', () => {
      const format = 'format';
      const carrier = 'carrier';
      const spanContext = {};
      switchableTracer.inject(spanContext, format, carrier);

      assert.equal(tracerStubsMock.getResult().injectCalls[0].format, format);
      assert.equal(tracerStubsMock.getResult().injectCalls[0].carrier, carrier);
      assert.equal(tracerStubsMock.getResult().injectCalls[0].spanContext, spanContext);
      assert.equal(baseTracerMock.getResult().injectCalls.length, 0);
    });

    it('calls extract from stubs', () => {
      const format = 'format';
      const carrier = 'carrier';
      switchableTracer.extract(format, carrier);

      assert.equal(tracerStubsMock.getResult().extractCalls[0].format, format);
      assert.equal(tracerStubsMock.getResult().extractCalls[0].carrier, carrier);
      assert.equal(baseTracerMock.getResult().extractCalls.length, 0);
    });

    describe('and when creating a span with a non stubbed parent', () => {
      it('removes the parent', () => {
        const name = 'name';
        const options = { childOf: {} };
        switchableTracer.startSpan(name, options);

        assert.equal(tracerStubsMock.getResult().startSpanCalls[0].name, name);
        assert.deepEqual(tracerStubsMock.getResult().startSpanCalls[0].options, {});
        assert.equal(baseTracerMock.getResult().startSpanCalls.length, 0);
      });
    });

    describe('and when creating a span with a stubbed parent', () => {
      it('does not removes the parent', () => {
        const name = 'name';
        const options = { childOf: stubs.tracer.startSpan() };
        switchableTracer.startSpan(name, options);

        assert.equal(tracerStubsMock.getResult().startSpanCalls[0].name, name);
        assert.equal(tracerStubsMock.getResult().startSpanCalls[0].options, options);
        assert.equal(baseTracerMock.getResult().startSpanCalls.length, 0);
      });
    });
  });

  describe('when tracer is enabled', () => {
    beforeEach(() => {
      baseTracerMock = buildMockTracer({ base_tracer: true });
      tracerStubsMock = buildMockTracer({ base_tracer: false });

      switchableTracer = buildSwitchableTracer({
        baseTracer: baseTracerMock.mock,
        tracerStubs: tracerStubsMock.mock,
        isEnabled: () => true
      });
    });

    it('calls startSpan from base tracer', () => {
      const name = 'name';
      const options = {};
      switchableTracer.startSpan(name, options);

      assert.equal(baseTracerMock.getResult().startSpanCalls[0].name, name);
      assert.equal(baseTracerMock.getResult().startSpanCalls[0].options, options);
      assert.equal(tracerStubsMock.getResult().startSpanCalls.length, 0);
    });

    it('calls inject from base tracer', () => {
      const format = 'format';
      const carrier = 'carrier';
      const spanContext = {};
      switchableTracer.inject(spanContext, format, carrier);

      assert.equal(baseTracerMock.getResult().injectCalls[0].format, format);
      assert.equal(baseTracerMock.getResult().injectCalls[0].carrier, carrier);
      assert.equal(baseTracerMock.getResult().injectCalls[0].spanContext, spanContext);
      assert.equal(tracerStubsMock.getResult().injectCalls.length, 0);
    });

    describe('and when injecting a stubbed span when the tracer is enabled', () => {
      it('does not call the tracer (calls the stub instead)', () => {
        const format = 'format';
        const carrier = 'carrier';
        const spanContext = stubs.tracer.startSpan();
        switchableTracer.inject(spanContext, format, carrier);

        assert.equal(tracerStubsMock.getResult().injectCalls[0].format, format);
        assert.equal(tracerStubsMock.getResult().injectCalls[0].carrier, carrier);
        assert.equal(tracerStubsMock.getResult().injectCalls[0].spanContext, spanContext);
        assert.equal(baseTracerMock.getResult().injectCalls.length, 0);
      });
    });

    it('calls extract from base tracer', () => {
      const format = 'format';
      const carrier = 'carrier';
      switchableTracer.extract(format, carrier);

      assert.equal(baseTracerMock.getResult().extractCalls[0].format, format);
      assert.equal(baseTracerMock.getResult().extractCalls[0].carrier, carrier);
      assert.equal(tracerStubsMock.getResult().extractCalls.length, 0);
    });

    describe('and when creating an span with an stubbed parent', () => {
      it('removes the parent', () => {
        const name = 'name';
        const options = { childOf: stubs.tracer.startSpan() };
        switchableTracer.startSpan(name, options);

        assert.equal(baseTracerMock.getResult().startSpanCalls[0].name, name);
        assert.deepEqual(baseTracerMock.getResult().startSpanCalls[0].options, {});
        assert.equal(tracerStubsMock.getResult().startSpanCalls.length, 0);
      });
    });

    describe('and when creating an span with an non stubbed parent', () => {
      it('does not removes the parent', () => {
        const name = 'name';
        const options = { childOf: { myChildSpan: 1 } };
        switchableTracer.startSpan(name, options);

        assert.equal(baseTracerMock.getResult().startSpanCalls[0].name, name);
        assert.equal(baseTracerMock.getResult().startSpanCalls[0].options, options);
        assert.equal(tracerStubsMock.getResult().startSpanCalls.length, 0);
      });
    });
  });
});
