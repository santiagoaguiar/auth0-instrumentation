const stubs = require('./stubs');
const constants = require('./constants');
const buildSwitchableTracer = require('./switchable_tracer');
const opentracing = require('opentracing');

exports.create = (agent, pkg, env, params) => {
  let tracer = stubs.tracer;

  const serviceName = env.SERVICE_NAME || pkg.name;
  if (env.TRACE_AGENT_CLIENT === constants.TRACER_JAEGER) {
    const jaegerClient = require('jaeger-client');

    const config = {
      serviceName: serviceName,
      reporter: {
        agentHost: env.TRACE_AGENT_HOST,
        agentPort: env.TRACE_AGENT_PORT,
      },
      sampler: {
        type: 'const',
        param: 1,
      }
    };
    const options = { logger: agent.logger };

    tracer = jaegerClient.initTracer(config, options);
  }
  if (env.TRACE_AGENT_CLIENT === constants.TRACER_LIGHTSTEP) {
    const lightstepClient = require('lightstep-tracer');
    const config = {
      access_token: env.TRACE_AGENT_API_KEY,
      collector_host: env.TRACE_AGENT_HOST,
      collector_port: env.TRACE_AGENT_PORT,
      collector_encryption: env.TRACE_AGENT_USE_TLS ? 'tls' : 'none',
      component_name: serviceName,
      max_reporting_interval_millis: env.TRACE_REPORTING_INTERVAL_MILLIS || 500
    };
    tracer = new lightstepClient.Tracer(config);
  }
  if (env.TRACE_AGENT_CLIENT === constants.TRACER_MOCK) {
    // This is useful for integration tests
    tracer = new opentracing.MockTracer();
  }

  if (typeof params.isEnabled === 'function') {
    return buildSwitchableTracer({
      baseTracer: tracer,
      tracerStubs: stubs.tracer,
      isEnabled: params.isEnabled,
      logger: params.logger
    });
  }

  return tracer;
};
