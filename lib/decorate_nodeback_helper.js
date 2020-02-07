const Tags = require('./tracer_tags');

module.exports = (defaultTracer) => function(opName, fn, spanOptions, tracerImpl) {
  const tracer = tracerImpl || defaultTracer;

  return function(...args) {
    // if there are no args just call the original function
    // no tracing action will take place
    if (args.length === 0) {
      return fn.apply(this);
    }

    // check to make sure that the last parameter is a function
    if (args.length > 0 && typeof args[args.length -1] !== 'function') {
      return fn.apply(this, args);
    }

    // last argument is a function, use it as the callback
    const cb = args.pop();
    const span = tracer.startSpan(opName, spanOptions || {});

    // wrap the provided callback with our custom callback
    // that records the function duration
    args.push(function(...cbArgs) {
      if (!!cbArgs[0]) {
        span.setTag(Tags.ERROR, true);
        span.setTag(Tags.SAMPLING_PRIORITY, 1);
      }

      span.finish();
      cb.apply(this, cbArgs);
    });

    return fn.apply(this, args);
  };
};
