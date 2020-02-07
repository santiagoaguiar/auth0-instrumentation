const path = require('path');
const protobuf = require('protobufjs');

const requestHelper = require('./trace_request');
const middleware = require('./tracer_middleware');
const tracing = require('opentracing');
const tracerFactory = require('./tracer_factory');
const os = require('os');
const tracerUtils = require('./tracer_utils');
const opentracing = require('opentracing');
const buildDecorateNodeback = require('./decorate_nodeback_helper');
const Tags = require('./tracer_tags');

const protoRoot = new protobuf.Root();
protoRoot.loadSync(path.join(__dirname, 'trace_context.proto'));
const SpanContext = protoRoot.lookupType('auth0.instrumentation.SpanContext');



class SpanWrapper {
  constructor(span, tracer) {
    this._span = span;
    this._tracer = tracer;
  }

  getSpan() {
    return this._span;
  }

  finish(finishTime) {
    this._span.finish(finishTime);
  }

  setTag(key, value) {
    this._span.setTag(key, value);

    return this;
  }

  addTags(keyValueMap) {
    this._span.addTags(keyValueMap);

    return this;
  }

  context() {
    return this._span.context();
  }

  tracer() {
    return this._tracer;
  }

  setOperationName(name) {
    this._span.setOperationName(name);

    return this;
  }

  setBaggageItem(name, value) {
    return this._span.setBaggageItem(name, value);
  }

  getBaggageItem(name) {
    return this._span.getBaggageItem(name);
  }

  error(err) {
    if (err !== undefined) {
      this.log({
        'event': 'error',
	'error.object': err,
	'message': err.message,
	'stack': err.stack
      });
    }
    this.setTag(Tags.ERROR, true);
    this.setTag(Tags.SAMPLING_PRIORITY, 1);
  }

  // https://github.com/opentracing/specification/blob/1.1/semantic_conventions.md#log-fields-table
  log(obj) {
    return this._span.log(obj);
  }
}

module.exports = function Tracer(agent, pkg, env, params) {
  params = params || {};
  const logger = params.logger || console;
  const tracer = params.tracerImpl ? params.tracerImpl : tracerFactory.create(agent, pkg, env, {
    isEnabled: params.isEnabled,
    logger
  });

  const obj = {
    _tracer: tracer,
    _logger: agent.logger,
    FORMAT_HTTP_HEADERS: tracing.FORMAT_HTTP_HEADERS,
    FORMAT_TEXT_MAP: tracing.FORMAT_TEXT_MAP,
    FORMAT_AUTH0_BINARY: 'format-auth0-binary'
  };

  obj.Tags = Tags;

  const DEFAULT_TAGS = {};
  if (env.RELEASE_CHANNEL) {
    DEFAULT_TAGS[Tags.AUTH0_CHANNEL] = env.RELEASE_CHANNEL;
  }
  if (env.PURPOSE) {
    DEFAULT_TAGS[Tags.AUTH0_PURPOSE] = env.PURPOSE;
  }
  DEFAULT_TAGS[Tags.AUTH0_REGION] = env.REGION || env.AWS_REGION;
  DEFAULT_TAGS[Tags.AUTH0_ENVIRONMENT] = env.ENVIRONMENT;
  DEFAULT_TAGS[Tags.AUTH0_HOSTNAME] = env.METRICS_HOST || os.hostname();

  // Wrap the native opentracing 'span' object
  // with a reduced API that discourages the use
  // of features we don't want to use yet, while
  // also giving us a place to hook additional
  // functionality.
  function wrapSpan(srcSpan) {
    return srcSpan instanceof SpanWrapper ? srcSpan : new SpanWrapper(srcSpan, obj);
  }

  function unwrapSpan(srcSpan) {
    return srcSpan instanceof SpanWrapper ? srcSpan.getSpan() : srcSpan;
  }

  obj.startSpan = function(name, spanOptions) {
    const unwrappedOptions = {};

    if (spanOptions) {
      if (spanOptions.childOf) {
        unwrappedOptions.childOf = unwrapSpan(spanOptions.childOf);
      }

      if (spanOptions.followsFrom) {
        // Convert from a Span or a SpanContext into a Reference.
        const followsFrom = opentracing.followsFrom(unwrapSpan(spanOptions.followsFrom));
        unwrappedOptions.references = Array.isArray(spanOptions.references) ?
          spanOptions.references.concat([]) : // Clone
          [];
        unwrappedOptions.references.push(followsFrom);
      }
    }

    const newSpanOptions = Object.assign({}, spanOptions, unwrappedOptions);
    delete newSpanOptions.followsFrom;

    const wrappedSpan = wrapSpan(obj._tracer.startSpan(name, newSpanOptions));
    wrappedSpan.addTags(DEFAULT_TAGS);

    return wrappedSpan;
  };

  // Inject the context required to propagate `spanOrContext` using
  // the specified format and carrier.
  // (see: https://github.com/opentracing/specification/blob/master/specification.md )
  // When using the AUTHO_BINARY format, `carrier` should be a function
  // that will receive the opaque context payload. This function will
  // not be called if injection fails, so it should not have other side
  // effects.
  // e.g.
  // var context;
  // tracer.inject(span, tracer.FORMAT_AUTH0_BINARY, (ctx) => { context = ctx });
  obj.inject = function(spanOrContext, format, carrier) {
    spanOrContext = unwrapSpan(spanOrContext);
    carrier = unwrapSpan(carrier);

    if (format === obj.FORMAT_AUTH0_BINARY) {
      try {
        const textCarrier = {};
        obj.inject(spanOrContext, obj.FORMAT_TEXT_MAP, textCarrier);
        const carrierMsg = SpanContext.create({
          spanContextMap: textCarrier
        });
        const encoded = SpanContext.encode(carrierMsg).finish();

        return carrier(encoded);
      } catch (err) {
        logger.error('Error injecting from carrier', {
          log_type: 'tracing_error_injecting_carrier',
          spanOrContext,
          format,
          carrier,
          err
        });
        return;
        // ignore failures to propagate
      }
    }

    obj._tracer.inject(spanOrContext, format, carrier);
  };

  // Extract span context from a carrier, using the specified format.
  obj.extract = function(format, carrier) {
    carrier = unwrapSpan(carrier);

    if (format === obj.FORMAT_AUTH0_BINARY) {
      // Carrier should be a buffer containing a serialized
      // SpanContext proto, which will we decode, then
      // transform into a TEXT_MAP.
      try {
        const decoded = SpanContext.decode(carrier);
        return obj.extract(obj.FORMAT_TEXT_MAP, decoded.spanContextMap);
      } catch (err) {
        logger.error('Error extracting carrier', {
          log_type: 'tracing_error_injecting_carrier',
          format,
          err,
          carrier
        });
        // ignore decode failures.
        return null;
      }
    }
    const span = obj._tracer.extract(format, carrier);
    return span ? wrapSpan(span) : span;
  };

  // captureFunc is a convenience function for executing a function in a child
  // span, which is passed to the function as an argument. The created span is
  // automatically finished regardless of outcome, and is tagged with an error
  // if an exception is thrown.
  obj.captureFunc = function(name, fn, parentSpan) {
    const span = obj.startSpan(name, {
      childOf: parentSpan
    });
    try {
      fn(span);
      span.finish();
    } catch (e) {
      span.setTag(obj.Tags.ERROR, true);
      span.setTag(obj.Tags.SAMPLING_PRIORITY, 1);
      span.finish();
      throw e;
    }
  };

  // Add middleware hooks.
  obj.middleware = {
    express: middleware.express(obj),
    hapi16: middleware.hapi16(obj),
    hapi17: middleware.hapi17(obj)
  };

  obj.helpers = {
    wrapRequest: requestHelper(obj),
    mapToTags: tracerUtils.mapToTags,
    decorateNodeback: buildDecorateNodeback(obj)
  };

  return obj;
};
