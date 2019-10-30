var assert = require('assert');
var sinon  = require('sinon');
var $require = require('proxyquire').noPreserveCache();

var metrics = require('../lib/metrics')({
  name: 'test'
}, {
  STATSD_HOST: 'http://localhost:8125'
});

var processTags = require('../lib/utils').processTags;

describe('metrics', function() {

  after(function(){
    metrics.close();
  });

  it('should return isActive as true', function(done) {
    assert.equal(metrics.isActive, true);
    done();
  });

  it('should run gauge without throwing', function(done) {
    assert.doesNotThrow(function() {
      metrics.gauge('foo.bar', 14);
      metrics.gauge('foo.bar', 14, ['tag1:a', 'tag2:b']);
      metrics.gauge('foo.bar', 14, {'tag1': 'a', 'tag2': 'b'});
    }, TypeError);
    done();
  });

  it('should run increment without throwing', function(done) {
    assert.doesNotThrow(function() {
      metrics.increment('foo.bar', 1);
      metrics.increment('foo.bar', 1, ['tag1:a', 'tag2:b']);
      metrics.increment('foo.bar', 1, {'tag1': 'a', 'tag2': 'b'});
      metrics.increment('foo.bar');
      metrics.increment('foo.bar', ['tag1:a', 'tag2:b']);
      metrics.increment('foo.bar', {'tag1': 'a', 'tag2': 'b'});
    }, TypeError);
    done();
  });

  it('should run track without throwing', function(done) {
    assert.doesNotThrow(function() {
      var id = metrics.time('foo.bar');
      assert.ok(id);
      metrics.endTime(id);
      id = metrics.time('foo.bar', ['tag1:a', 'tag2:b']);
      assert.ok(id);
      metrics.endTime(id, ['tag1:a', 'tag2:b']);
      id = metrics.time('foo.bar', {'tag1': 'a', 'tag2': 'b'});
      metrics.endTime(id, {'tag1': 'a', 'tag2': 'b'});
      assert.ok(id);
    }, TypeError);
    done();
  });

  it('should run histogram without throwing', function(done) {
    assert.doesNotThrow(function() {
      metrics.gauge('foo.bar', 5.5);
      metrics.gauge('foo.bar', 5.5, ['tag1:a', 'tag2:b']);
      metrics.gauge('foo.bar', 5.5, {'tag1': 'a', 'tag2': 'b'});
    }, TypeError);
    done();
  });

  it('should run setDefaultTags without throwing', function(done) {
    assert.doesNotThrow(metrics.setDefaultTags, TypeError);
    done();
  });

  it('should set default tags', function(done) {
    metrics.setDefaultTags({'color': 'red', 'region': 'west'});
    assert.deepEqual(metrics.__defaultTags, ['color:red', 'region:west']);
    done();
  });

  describe('processTags', function() {

    it('should accept an array of strings', function(done) {
      assert.deepEqual(
        processTags(['foo:bar', 'bar:baz']),
        ['foo:bar', 'bar:baz']);
      done();
    });

    it('should accept an object', function(done) {
      assert.deepEqual(
        processTags({'foo':'bar', 'bar':'baz'}),
        ['foo:bar', 'bar:baz']);
      done();
    });

    it('should return an empty array otherwise', function(done) {
      assert.deepEqual(processTags(3), []);
      assert.deepEqual(processTags('lol'), []);
      assert.deepEqual(processTags(4.5), []);
      done();
    });

  });

  describe('incrementOne', function() {
    var $metrics;
    var metricsSpy;
    beforeEach(function () {
      metricsSpy = sinon.spy();
      $metrics = $require('../lib/metrics', {
        './metrics_factory': {
          create: function(){
            return { increment: metricsSpy };
          }
        }
      })({
        name: 'test'
      }, {
        STATSD_HOST: 'http://localhost:8125'
      });
    });

    describe('when called with name', function() {
      it('should call metrics.increment with name and value 1', function() {
        $metrics.incrementOne('foobar', undefined);
        sinon.assert.calledWithMatch(metricsSpy, 'foobar', 1, []);
      });
    });

    describe('when called with name and tags', function() {
      it('should call metrics.increment with name, tags and value 1', function() {
        $metrics.incrementOne('foobar', ['bar', 'foo']);
        sinon.assert.calledWithMatch(metricsSpy, 'foobar', 1, ['bar', 'foo']);
      });
    });
  });

  describe('observeBucketed', function() {
    var $metrics;
    var metricsSpy;
    beforeEach(function () {
      metricsSpy = sinon.spy();
      $metrics = $require('../lib/metrics', {
        './metrics_factory': {
          create: function(){
            return { increment: metricsSpy };
          }
        }
      })({
        name: 'test'
      }, {
        STATSD_HOST: 'http://localhost:8125'
      });
    });

    it('should assign tags based on buckets', function() {
      $metrics.observeBucketed('foobar', 34, [20, 50, 100], []);
      sinon.assert.calledWith(metricsSpy, 'foobar', 1, sinon.match.array.contains(['le:50', 'le:100', 'le:Inf']));
    });

    it('should always set the Inf tag', function() {
      $metrics.observeBucketed('foobar', 200, [20], []);
      sinon.assert.calledWith(metricsSpy, 'foobar', 1, sinon.match.array.contains(['le:Inf']));
    });

    it('should preserve existing tags', function() {
      $metrics.observeBucketed('foobar', 95, [20, 50, 100], ['tag1', 'tag2:val2']);
      sinon.assert.calledWith(metricsSpy, 'foobar', 1, sinon.match.array.contains(['le:100', 'le:Inf', 'tag1', 'tag2:val2']));
    });
  });

  describe('flush', function() {
    var $metrics;
    var metricsSpy;

    const buildMetrics = (config) => {
      metricsSpy = sinon.spy();
      $metrics = $require('../lib/metrics', {
        './metrics_factory': {
          create: function(){
            return { flush: metricsSpy };
          }
        }
      })({
        name: 'test'
      }, config);
    };

    describe('when STATSD_HOST and METRICS_API_KEY are defined', function() {
      beforeEach(function () {
        buildMetrics({
          STATSD_HOST: 'http://localhost:8125',
          METRICS_API_KEY: 'datadogkey'
        });
      });

      it('should not call metrics.flush', function() {
        $metrics.flush();
        sinon.assert.notCalled(metricsSpy);
      });
    });

    describe('when STATSD_HOST is defined and METRICS_API_KEY is undefined', function() {
      beforeEach(function () {
        buildMetrics({
          STATSD_HOST: 'http://localhost:8125'
        });
      });

      it('should not call metrics.flush', function() {
        $metrics.flush();
        sinon.assert.notCalled(metricsSpy);
      });
    });

    describe('when METRICS_API_KEY is defined and STATSD_HOST is undefined', function() {
      beforeEach(function () {
        buildMetrics({
          METRICS_API_KEY: 'datadogkey'
        });
      });

      it('should call metrics.flush', function() {
        $metrics.flush();
        sinon.assert.called(metricsSpy);
      });

      describe('API adapter', () => {
        function buildMetricsMock() {
          const gauge = sinon.stub();
          const increment = sinon.stub();
          const histogram = sinon.stub();
          const flush = sinon.stub();

          const metrics = $require('../lib/metrics_factory', {
            'datadog-metrics': {
              BufferedMetricsLogger: function() {
                return { gauge, increment, histogram, flush };
              }
            }
          }).create({ name: 'test' }, {
            METRICS_API_KEY: 'datadogkey'
          });

          return { metrics, gauge, increment, histogram, flush };
        }

        describe('without callback', () => {
          it('calls gauge correctly', () => {
            const mock = buildMetricsMock();

            mock.metrics.gauge('my_metric', 1, { mytag: 'value' });

            sinon.assert.calledOnce(mock.gauge);
            sinon.assert.calledWith(mock.gauge, 'my_metric', 1, { mytag: "value" });
          });

          it('calls increment correctly', () => {
            const mock = buildMetricsMock();

            mock.metrics.increment('my_metric', 1, { mytag: 'value' });

            sinon.assert.calledOnce(mock.increment);
            sinon.assert.calledWith(mock.increment, 'my_metric', 1, { mytag: "value" });
          });

          it('calls histogram correctly', () => {
            const mock = buildMetricsMock();

            mock.metrics.histogram('my_metric', 100, { mytag: 'value' });

            sinon.assert.calledOnce(mock.histogram);
            sinon.assert.calledWith(mock.histogram, 'my_metric', 100, { mytag: "value" });
          });
        });

        describe('with callback', () => {
          it('calls gauge correctly', (done) => {
            const mock = buildMetricsMock();

            mock.metrics.gauge('my_metric', 1, { mytag: 'value' }, () => {
              sinon.assert.calledOnce(mock.gauge);
              sinon.assert.calledWith(mock.gauge, 'my_metric', 1, { mytag: "value" });
              done();
            });
          });

          it('calls increment correctly', (done) => {
            const mock = buildMetricsMock();

            mock.metrics.increment('my_metric', 1, { mytag: 'value' }, () => {
              sinon.assert.calledOnce(mock.increment);
              sinon.assert.calledWith(mock.increment, 'my_metric', 1, { mytag: "value" });
              done();
            });
          });

          it('calls histogram correctly', (done) => {
            const mock = buildMetricsMock();

            mock.metrics.histogram('my_metric', 100, { mytag: 'value' }, () => {
              sinon.assert.calledOnce(mock.histogram);
              sinon.assert.calledWith(mock.histogram, 'my_metric', 100, { mytag: "value" });
              done();
            });
          });
        });

      });
    });
  });
});
