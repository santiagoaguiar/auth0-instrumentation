'use strict';

const assert = require('assert');
const sentry = require('../lib/error_reporter')({}, {});
const buildLogger = require('../lib/logger');
const spy = require('sinon').spy;

describe('logger', function() {
  let logger;

  beforeEach(function() {
    sentry.captureException = spy();
    sentry.captureMessage = spy();
    sentry.captureException.resetHistory();
    sentry.captureMessage.resetHistory();

    logger = buildLogger({ name: 'test' },
                                        { LOG_LEVEL: 'fatal',
                                          PURPOSE: 'test-purpose',
                                          ENVIRONMENT: 'test-env',
                                          RELEASE_CHANNEL: 'test-channel',
                                          AWS_REGION: 'test-region'
                                        }, null, null, sentry);

  });

  describe('logger.child()', function() {
    it('should support creating child loggers', function() {
      const childLogger = logger.child({
        child: 'child'
      });

      childLogger.error({
        log_type: 'not really an error'
      }, 'test');
      assert(sentry.captureException.calledOnce === false);
      assert(sentry.captureMessage.calledOnce);
      assert.strictEqual(sentry.captureMessage.getCall(0).args[1].tags.log_type, 'not really an error');
      assert.strictEqual(sentry.captureMessage.getCall(0).args[1].extra.child, 'child');
    });

    it('should support creating nested child loggers', function() {
      const childLogger = logger.child({
        child: 'child'
      });
      const grandChildLogger = childLogger.child({
        child: 'grandchild',
        parent: 'child',
      });

      grandChildLogger.error({
        log_type: 'not really an error'
      }, 'test');
      assert(sentry.captureException.calledOnce === false);
      assert(sentry.captureMessage.calledOnce);
      assert.strictEqual(sentry.captureMessage.getCall(0).args[1].tags.log_type, 'not really an error');
      assert.strictEqual(sentry.captureMessage.getCall(0).args[1].extra.child, 'grandchild');
      assert.strictEqual(sentry.captureMessage.getCall(0).args[1].extra.parent, 'child');
    });
  });

  describe('SentryStream', function() {
    it('should call captureException on error when level is error', function() {
      logger.error(new Error('test'));
      assert(sentry.captureException.calledOnce);
      assert(sentry.captureMessage.calledOnce === false);
    });

    it('should call captureMessage on string when level is error', function() {
      logger.error('test');
      assert(sentry.captureException.calledOnce === false);
      assert(sentry.captureMessage.calledOnce);
    });

    it('should add standard tags when the log entry has an error', function() {
      logger.error({
        err: new Error('test err')
      }, 'test');
      assert(sentry.captureException.calledOnce);
      assert(sentry.captureMessage.calledOnce === false);
      assert.deepStrictEqual(sentry.captureException.getCall(0).args[1].tags, {
        region: 'test-region',
        environment: 'test-env',
        channel: 'test-channel'
      });
    });

    it('should add standard tags when the log entry does not have an error', function() {
      logger.error('test');
      assert(sentry.captureException.calledOnce === false);
      assert(sentry.captureMessage.calledOnce);
      assert.deepStrictEqual(sentry.captureMessage.getCall(0).args[1].tags, {
        region: 'test-region',
        environment: 'test-env',
        channel: 'test-channel'
      });
    });

    it('should add a log_type tag when the log entry has an error and has a log_type property', function() {
      logger.error({
        log_type: 'uncaughtException',
        err: new Error('test err')
      }, 'test');
      assert(sentry.captureException.calledOnce);
      assert(sentry.captureMessage.calledOnce === false);
      assert.deepStrictEqual(sentry.captureException.getCall(0).args[1].tags, {
        log_type: 'uncaughtException',
        region: 'test-region',
        environment: 'test-env',
        channel: 'test-channel'
      });
    });

    it('should add a log_type tag when the log entry does not have an error and has a log_type property', function() {
      logger.error({
        log_type: 'not really an error'
      }, 'test');
      assert(sentry.captureException.calledOnce === false);
      assert(sentry.captureMessage.calledOnce);
      assert.deepStrictEqual(sentry.captureMessage.getCall(0).args[1].tags, {
        log_type: 'not really an error',
        region: 'test-region',
        environment: 'test-env',
        channel: 'test-channel'
      });
    });
  });

  it('should add default values from environment', function() {
    logger.error('testing');
    assert(sentry.captureException.calledOnce === false);
    assert(sentry.captureMessage.calledOnce);
    const captured = sentry.captureMessage.getCall(0).args[1];
    assert.equal(captured.extra.purpose, 'test-purpose');
    assert.equal(captured.extra.environment, 'test-env');
    assert.equal(captured.extra.region, 'test-region');
    assert.equal(captured.extra.channel, 'test-channel');
  });

});
