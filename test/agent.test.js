'use strict';

const assert = require('assert');
const opentracing = require('opentracing');
const agent = require('../');

describe('agent', function() {
  describe('#init', function() {
    beforeEach(() => {
      agent.initialized = false;
    });

    it('should be idempotent', function() {
      agent.init({ name: 'test' }, {});
      assert(agent.initialized);
      const logger = agent.logger;
      const metrics = agent.metrics;
      agent.init({ name: 'test' }, {});
      assert(logger === agent.logger);
      assert(metrics === agent.metrics);
    });

    it('configures opentracing global tracer', () => {
      agent.init({ name: 'test' }, { TRACE_AGENT_CLIENT: 'mock' });
      const agentTracer = agent.tracer;
      const opentracerGlobalTracer = opentracing.globalTracer();

      const span = opentracerGlobalTracer.startSpan('mySpan');
      span.setTag('test_tag', 'test_val');
      span.finish();

      const report = agentTracer._tracer.report();
      const foundSpan = report.firstSpanWithTagValue('test_tag', 'test_val');

      assert.ok(foundSpan);
    });
  });
});
