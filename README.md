# auth0-instrumentation

[![Build Status](https://travis-ci.org/auth0/auth0-instrumentation.svg?branch=master)](https://travis-ci.org/auth0/auth0-instrumentation)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The goal of this package is to make it easier to collect information about our services through logs, metrics, tracing and error reporting.

## Logs

With the right configuration, logs will go from the local server to "THE CLOUD", then a bunch of awesome stuff will happen and they'll become available on [Kibana](https://www.elastic.co/products/kibana).

The logger is powered by [bunyan](https://github.com/trentm/node-bunyan), check their documentation for best practices.

Usage:

```js
var serializers = require('./serializers'); // See https://github.com/trentm/node-bunyan#serializers
var pkg = require('./package.json');
var env = require('./lib/env');
var agent = require('@a0/instrumentation');
agent.init(pkg, env, serializers);
var logger = agent.logger;

logger.info('Foo');
// logs something along the lines of:
// {"name":"foo","process":{"app":"my-app","version":"0.0.1","node":"v5.7.1"},"hostname":"dirceu-auth0.local","pid":24102,"level":30,"msg":"Foo","time":"2016-03-22T19:39:21.609Z","v":0}
logger.info({foo: 'bar'}, 'hi');
// The first field can optionally be a "fields" object, which
// is merged into the log record.
```

## Metrics

Using the right configuration, you can use a metrics collector to... well, collect metrics.

Usage:

```js
var pkg = require('./package.json');
var env = require('./lib/env');
var agent = require('@a0/instrumentation');
agent.init(pkg, env);
var metrics = agent.metrics;

var tags = {
  'user': 'foo',
  'endpoint': '/login'
};

metrics.gauge('mygauge', 42, tags);
metrics.increment('requests.served', tags); // increment by 1
metrics.increment('some.other.thing', 5, tags); // increment by 5
metrics.histogram('service.time', 0.248);
```

## Traces

The tracing feature can be used with any backend that supports [opentracing](http://opentracing.io/).

SLI Tracer:
Initializes a "multitracer" that calls the requested tracer (lightstep, jaeger, etc.)
and the [SLI Tracer](https://github.com/auth0/observability-nodejs) which allows you to send
metrics for certain operations discounting particular spans. All the tools and middlewares work
out of the box.

```js
const agent = require('@a0/instrumentation');

agent.init(pkg, env, null, {
  slis: {
    operationsToTrack: {
      'mySLIOperation': {},
    }
  }
});

const span = sliTracer.startSpan('http.request', {
  tags: {
    sli: true,
  }
});

span.setTag(
  'sli.operation',
  'mySLIOperation'
);

span.finish();
```

Basic Usage:

```js
var pkg = require('./package.json');
var env = require('./lib/env');
var agent = require('@a0/instrumentation');
agent.init(pkg, env);
var tracer = agent.tracer;

// single span
var span = tracer.startSpan('http_request');
span.setTag('external_service', 'foo');
span.finish();

// function wrapper
var parentSpan = tracer.startSpan('parent');
tracer.captureFunc('child_operation', function(span) {
  span.setTag('in_child', true);
}, parentSpan);
parentSpan.finish();

// nesting
var rootSpan = tracer.startSpan('parent');
tracer.captureFunc('child1', function(child1) {
  tracer.captureFunc('child2', function(child2) {
    child2.setTag('in_child_two', true);
  }, child1);
}, rootSpan);
rootSpan.finish();
```

Opentracing:

Auth0-instrumentation configures the global tracer from opentracing javascript,
it is advisable to use it instead of calling the implementation from auth0/instrumentation,
this is specially true en the case of libraries, if possible avoid referencing auth0-instrumentation
tracer directly and use `opentracing.globalTracer()` instead, the implementations must match in general,
however, `opentracing` is standard and allows auth0-instrumentation to change without having to change
your libraries and implementation.

```js
const opentracing = require('opentracing');

const tracer = opentracing.globalTracer();

const span1 = tracer.startSpan('myOperation', {
  tags: {
    sli: true
  }
})

const span2 = tracer.startSpan('myOperation', {
  childOf: span2
})

span2.finish();
span1.finish();
```

The tracer also provides middleware for several common frameworks

For expressjs

```js
var pkg = require('./package.json');
var env = require('./lib/env');
var agent = require('@a0/instrumentation');
var express = require('express');

agent.init(pkg, env);
var tracer = agent.tracer;
var app = express();

// This will automatically extract any parent span from the headers
// of incoming requests, wraps the request in a span, and will make
// the request span available to handlers as 'req.a0trace.span'
app.use(tracer.middleware.express);
```

For hapijs:

Version 16 (and below)


```js
var pkg = require('./package.json');
var env = require('./lib/env');
var agent = require('@a0/instrumentation');
var hapi = require('hapi');

agent.init(pkg, env);
var tracer = agent.tracer;

var server = new hapi.Server();


// This will automatically extract any parent span from the headers
// of incoming requests, wraps the request is a span, and will make
// the request span available to handlers as 'req.a0trace.span'.
// Additional child spans are automatically created for events in
// the hapi request lifecycle.
server.register(tracer.middleware.hapi16);
```

Version 17 (and above)
```
const pkg = require('/package.json');
const env = require('./lib/env');
const agent = require('@a0/instrumentation');
var hapi = require('hapi');

agent.init(pkg, env);
const tracer = agent.tracer;

const server = new hapi.Server();
await server.register(tracer.middleware.hapi17);
```


There is also a helper for wrapping outgoing requests made by
the `requests` HTTP client library.

Wrapped requests will automatically be wrapped in a span, and
contextual information will be injected into the headers
of outgoing requests.

```js
var pkg = require('./package.json');
var env = require('./lib/env');
var agent = require('@a0/instrumentation');
var request = require('request');

agent.init(pkg, env, {
  errorReporter: {
    splitEnvironmentByReleaseChannel: true
  }
});

var tracer = agent.tracer;
var wrapRequest = tracer.agent.helpers.wrapRequest;

// This works with 'streams'
wrapRequest(request)('http://example.com')
  .on('response', (res) => {
    console.log(res.statusCode);
  });

// And callbacks.
wrapRequest(request)('http://example.com', (err, res, body) => {
  console.log(res.statusCode);
});

// Additional span tags and any parent context may be passed
// as options when creating the wrapper.
const opts = {
  spanTags: {
    foo: 'bar'
  },
  parentSpan: someSpan
};
wrapRequest(opts, request)('http://example.com')
  .on('response', (res) => {
    console.log(res.statusCode);
  });
```

## Errors

You can use the error reporter to send exceptions to an external service. You can set it up on your app in three ways, depending on what framework is being used.

### Hapi

For `hapi`, the error reporter is a plugin. To use it, you can do something like this:

```js
var pkg = require('./package.json');
var env = require('./lib/env');
var agent = require('@a0/instrumentation');
agent.init(pkg, env);

var hapi = require('hapi');
var server = new hapi.Server();

// to capture hapi exceptions with context
server.register([agent.errorReporter.hapi.plugin], function() {});

// to capture a specific error with some extra information
agent.errorReporter.captureException('My error', {
  extra: {
    user: myUser,
    something: somethingElse,
    foo: 'bar'
  }
});
```

For `hapi` version 17 and above there's a specific plugin for this. You may setup this using:

```js
var hapi = require('hapi');
var server = new hapi.Server();
agent.init(pkg, env);

await server.register(agent.errorReporter.hapi.pluginV17);
```


## Express

For `express`, the error reporter is composed of two middlewares. To use it, you can do something like this:

```js
var pkg = require('./package.json');
var env = require('./lib/env');
var agent = require('@a0/instrumentation');
agent.init(pkg, env);

var express = require('express');
var app = express();

// before any other request handlers
app.use(agent.errorReporter.express.requestHandler);

// before any other error handlers
app.use(agent.errorReporter.express.errorHandler);

// to capture a specific error with some extra information
agent.errorReporter.captureException('My error', {
  extra: {
    user: myUser,
    something: somethingElse,
    foo: 'bar'
  }
});
```

## Other

If you don't use `hapi` or `express` - maybe it's not an HTTP API, it's a worker process or a command-line application - you can do something like this:

```js
var pkg = require('./package.json');
var env = require('./lib/env');
var agent = require('@a0/instrumentation');
agent.init(pkg, env);

// to capture all uncaughts
agent.errorReporter.patchGlobal(function() {
  setTimeout(function(){
    process.exit(1);
  }, 200);
});

// to capture a specific error with some extra information
agent.errorReporter.captureException('My error', {
  extra: {
    user: myUser,
    something: somethingElse,
    foo: 'bar'
  }
});
```

## Configuration

Configuration is done through an object with predefined keys, usually coming from environment variables. You only need to configure the variables you want to change.

These are the variables that can be used, along with their default values:

```js

const env = {
  // general configuration
  'NODE_ENV': undefined, // If you don't set it to 'production', it will try to use http keepalive agent instead of https and you will receive a "Protocol https not supported. Expected http" error
  'CONSOLE_LOG_LEVEL': 'info', // log level for console
  'LOG_FILE': undefined,
  'LOG_TO_WEB_URL': undefined,

  // AWS configuration for Kinesis
  'AWS_ACCESS_KEY_ID': undefined,
  'AWS_ACCESS_KEY_SECRET': undefined,
  'AWS_REGION': undefined, // @a0/instrumentation uses 'AWS_KINESIS_REGION' and if not defined it will use 'AWS_REGION'

  // Kinesis configuration (single stream)
  'LOG_TO_KINESIS': undefined, // Kinesis stream name
  'LOG_TO_KINESIS_LEVEL': 'info', // log level for Kinesis
  'LOG_TO_KINESIS_LOG_TYPE': undefined, // bunyan stream type
  'KINESIS_OBJECT_MODE': true,
  'KINESIS_TIMEOUT': 5,
  'KINESIS_LENGTH': 50,

  // Kinesis configuration (pool of streams for failover)
  'KINESIS_POOL': [
    {
      // if any of this config options are undefined will take root level,
      // if exists
      'LOG_TO_KINESIS': undefined, // Kinesis stream name
      'LOG_TO_KINESIS_LEVEL': 'info', // log level for Kinesis
      'LOG_TO_KINESIS_LOG_TYPE': undefined, // bunyan stream type
      'AWS_ACCESS_KEY_ID': undefined,
      'AWS_ACCESS_KEY_SECRET': undefined,
      'AWS_REGION': undefined,
      'IS_PRIMARY': undefined // set as true for the kinesis instance you want to work as primary

    }
  ],

  // Error reporter configuration
  'ERROR_REPORTER_URL': undefined, // Sentry URL
  'ERROR_REPORTER_LOG_LEVEL': 'error',

  // Metrics collector configuration
  'METRICS_API_KEY': undefined, // DataDog API key
  'METRICS_HOST': require('os').hostname(),
  'METRICS_PREFIX': pkg.name + '.',
  'METRICS_FLUSH_INTERVAL': 15, // seconds

  // Tracing configuration
  'TRACE_AGENT_API_KEY': undefined,
  'TRACE_AGENT_CLIENT': undefined, // e.g. 'jaeger', 'lightstep'
  'TRACE_AGENT_USE_TLS': true,
  'TRACE_AGENT_HOST': 'localhost',
  'TRACE_AGENT_PORT': 443,
  'TRACE_REPORTING_INTERVAL_MILLIS': 500,

  'SENTRY_RELEASE': '...', // Optional overrides the default sentry release name (package.name@package.version)
  'SENTRY_ENVIRONMENT': '...' // Optional override for the environment we send to sentry (default: environment or environment:release channel depending on splitEnvironmentByReleaseChannel)
};
```

## Docker Testing
To test `@a0/instrumentation` locally in a simple container simply run
```sh
docker-compose up && docker-compose rm -f
```
