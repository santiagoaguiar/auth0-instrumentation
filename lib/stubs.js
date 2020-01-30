const noop = function() {};
const returnEmptyLogger = function() { return emptyLogger; };
const returnValue = function() { return 1; };
const returnNull = () => { return null; };
const emptyMiddleware = function (a, b, next) { if (next) { next(); } };

var emptySpan = {
  log: noop,
  error: noop,
  finish: noop,
  setTag: noop,
  addTags: noop,
  context: returnNull,
  tracer: () => { return emptyTracer; },
  setOperationName: noop,
  isStub: true,
  setBaggageItem: noop,
  getBaggageItem: noop
};

var emptyTracer = {
  startSpan: () => { return emptySpan; },
  inject: noop,
  extract: returnNull,
  Tags: {}
};

const emptyLogger = {
  child: returnEmptyLogger,
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop
};

const emptyErrorReporter = {
  isActive: false,
  captureException: noop,
  captureMessage: noop,
  patchGlobal: noop,
  hapi: {
    plugin: {
      register: emptyMiddleware,
      pkg: require('../package.json')
    },
  },
  express: {
    requestHandler: emptyMiddleware,
    errorHandler: emptyMiddleware
  },
};
emptyErrorReporter.hapi.plugin.register.attributes = { pkg: require('../package.json') };

const emptyMetrics = {
  isActive: false,
  gauge: noop,
  increment: noop,
  incrementOne: noop,
  observeBucketed: noop,
  histogram: noop,
  flush: noop,
  setDefaultTags: noop,
  startResourceCollection: noop,
  time: returnValue,
  endTime: noop,
  callback: noop
};

const emptyProfiler = {
  setupProcessListener: noop,
  createDebouncedSnapshot: noop,
  report: noop,
  setupGCReporter: noop
};

module.exports = {
  logger: emptyLogger,
  errorReporter: emptyErrorReporter,
  metrics: emptyMetrics,
  profiler: emptyProfiler,
  tracer: emptyTracer
};
