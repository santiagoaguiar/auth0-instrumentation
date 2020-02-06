const assert = require('assert');
const sinon = require('sinon');
const reqIdHelpers = require('../lib/req_id_helpers');
const _ = require('lodash');

describe('Request id helpers', function() {
  function mockReq(options) {
    return {
      headers: options && Object.prototype.hasOwnProperty.call(options, 'headers') ? options.headers : {}
    };
  }

  describe('.forwardReqIdsToObjectCarrier', () => {
    it('when carrier is not an object it return the same carrier', () => {
      const carrier = "test";
      const req = mockReq();

      assert.strictEqual(reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier), carrier);
    });

    it('when carrier is null it return the same carrier', () => {
      const carrier = null;
      const req = mockReq();

      assert.strictEqual(reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier), carrier);
    });

    it('when there is no request, it returns the carrier', () => {
      const carrier = {};
      const req = null;

      assert.strictEqual(reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier), carrier);
    });

    it('when there are no headers, it returns the carrier', () => {
      const carrier = {};
      const req = {};

      assert.strictEqual(reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier), carrier);
    });

    it('when headers object is null, it returns the carrier', () => {
      const carrier = {};
      const req = { headers: null };

      assert.strictEqual(reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier), carrier);
    });

    it('when headers object is null, it returns the carrier', () => {
      const carrier = {};
      const req = { headers: null };

      assert.equal(reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier), carrier);
    });

    it('when headers is not an object, it returns the carrier', () => {
      const carrier = {};
      const req = { headers: 'test' };

      assert.strictEqual(reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier), carrier);
    });

    it('when headers is not an object but it has no ids, it returns the carrier', () => {
      const carrier = {};
      const req = {
        headers: {
          'myHeader': 'value'
        }
      };

      const result = reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier);
      assert.strictEqual(result, carrier);
      assert.equal(Object.prototype.hasOwnProperty.call(result, 'x-amzn-trace-id'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(result, 'x-auth0-id'), false);
    });

    it('when `x-amzn-trace-id` is available, it returns the carrier with the forwarded header', () => {
      const carrier = {
        test: 'my_test'
      };

      const req = {
        headers: {
          'x-amzn-trace-id': 'myAmzId',
        }
      };

      const result = reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier);
      assert.strictEqual(result, carrier);
      assert.strictEqual(result['x-amzn-trace-id'], 'myAmzId');
    });

    it('when `x-auth0-id` is available, it returns the carrier with the forwarded header', () => {
      const carrier = {
        test: 'my_test'
      };

      const req = {
        headers: {
          'x-auth0-id': 'myAuth0Id'
        }
      };

      const result = reqIdHelpers.forwardReqIdsToObjectCarrier(req, carrier);
      assert.strictEqual(result, carrier);
      assert.strictEqual(result['x-auth0-id'], 'myAuth0Id');
    });
  });

  describe('.forwardReqIdsToSpan', () => {
    it('when there is no span, it does not fail', () => {
      assert.doesNotThrow(() => {
        const span = undefined;
        const req = {
          headers: {
            'x-amzn-trace-id': 'myAuth0Id'
          }
        };

        reqIdHelpers.forwardReqIdsToSpan(req, span);
      });
    });

    it('when span is null, it does not fail', () => {
      assert.doesNotThrow(() => {
        const span = null;
        const req = {
          headers: {
            'x-amzn-trace-id': 'myAuth0Id'
          }
        };

        reqIdHelpers.forwardReqIdsToSpan(req, span);
      });
    });

    it('when span does not has a `setBaggageItem` function', () => {
      assert.doesNotThrow(() => {
        const getBaggageItem = sinon.stub();
        const span = {
          getBaggageItem
        };

        const req = {
          headers: {
            'x-amzn-trace-id': 'myAuth0Id'
          }
        };

        reqIdHelpers.forwardReqIdsToSpan(req, span);
        sinon.assert.notCalled(getBaggageItem);
      });
    });

    it('when span does not has a `getBaggageItem` function', () => {
      assert.doesNotThrow(() => {
        const setBaggageItem = sinon.stub();
        const span = {
          setBaggageItem
        };

        const req = {
          headers: {
            'x-amzn-trace-id': 'myAuth0Id'
          }
        };

        reqIdHelpers.forwardReqIdsToSpan(req, span);
        sinon.assert.notCalled(setBaggageItem);
      });
    });

    it('when span is available with `getBaggageItem` and `setBaggageItem` and `TAG_AUTH0_REQUEST_ID` is not set as baggage item, it sets the id on `TAG_AUTH0_REQUEST_ID` baggage and tag', () => {
      const getBaggageItem = sinon.stub();
      const setBaggageItem = sinon.stub();
      const setTag = sinon.stub();
      const span = {
        getBaggageItem,
        setBaggageItem,
        setTag
      };

      const req = {
        headers: {
          'x-amzn-trace-id': 'Root=1-67891233-abcdef012345678912345678'
        }
      };

      reqIdHelpers.forwardReqIdsToSpan(req, span);
      sinon.assert.calledWith(setBaggageItem, 'auth0.request_id', 'abcdef012345678912345678');
      sinon.assert.calledWith(setTag, 'auth0.request_id', 'abcdef012345678912345678');
    });

    it('when span is available with `getBaggageItem` and `setBaggageItem` and `TAG_AUTH0_REQUEST_ID` is set as baggage item, it does not set the id on `TAG_AUTH0_REQUEST_ID`', () => {
      const getBaggageItem = sinon.stub().returns('myAuth0Id');
      const setBaggageItem = sinon.stub();
      const span = {
        getBaggageItem,
        setBaggageItem
      };

      const req = {
        headers: {
          'x-amzn-trace-id': 'Root=myAuth0Id'
        }
      };

      reqIdHelpers.forwardReqIdsToSpan(req, span);
      sinon.assert.calledWith(getBaggageItem, 'auth0.request_id')
      sinon.assert.notCalled(setBaggageItem);
    });
  });

  describe('.getIdFromReq', () => {
    it('when there is no req, it returns undefined', () => {
      assert.strictEqual(reqIdHelpers.getIdFromReq(), null);
    });

    it('when there is a req but it has no headers, it returns null', () => {
      assert.strictEqual(reqIdHelpers.getIdFromReq({}), null);
    });

    it('when `traceparent` header is defined for version "00", it returns trace id from the header', () => {
      const getBaggageItem = sinon.stub().returns('myID');

      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
          'x-amzn-trace-id': 'Root=1-67891233-abcdef012345678912345678'
        },
        a0trace: {
          span: {
            getBaggageItem
          }
        }
      }), '4bf92f3577b34da6a3ce929d0e0e4736');
    });

    it('when `traceparent` header is for a version other than 00, it ignores it', () => {
      const getBaggageItem = sinon.stub().returns('myID');

      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          traceparent: "02-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
          'x-amzn-trace-id': 'Root=1-67891233-abcdef012345678912345678'
        },
        a0trace: {
          span: {
            getBaggageItem
          }
        }
      }), 'abcdef012345678912345678');
    });

    it('when `traceparent` header is invalid, it ignores it', () => {
      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          traceparent: "00-00f067aa0ba902b7-01"
        }
      }), null);
    });

    it('when `x-amzn-trace-id` header is defined and no traceparent is defined, it returns trace id from the header', () => {
      const getBaggageItem = sinon.stub().returns('myID');

      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': 'Root=1-67891233-abcdef012345678912345678'
        },
        a0trace: {
          span: {
            getBaggageItem
          }
        }
      }), 'abcdef012345678912345678');
    });

    it('when `x-amzn-trace-id` header is defined but is invalid, it ignores the header', () => {
      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': 'Root=67891233-abcdef012345678912345678'
        }
      }), null);

      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': 'Self=1-67891233-abcdef012345678912345678'
        }
      }), null);

      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': '1-67891233-abcdef012345678912345678'
        }
      }), null);
    });

    it('when `x-amzn-trace-id` is available but it is too long, returns null', () => {
      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': _.repeat('Root=1-67891233-abcdef012345678912345678;', 100)
        }
      }), null);
    });

    it('when no id header is defined but baggage item req id is defined in the span, returns req id', () => {
      const getBaggageItem = sinon.stub().returns('myId')
      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': 'invalid'
        },
        a0trace: {
          span: {
            getBaggageItem
          }
        }
      }), 'myId');
    });

    it('when there is no valid a0trace span and there is not other valid id, it return null', () => {
      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': 'invalid'
        }
      }), null);

      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': 'invalid'
        },
        a0trace: {}
      }), null);

      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': 'invalid'
        },
        a0trace: {
          span: {}
        }
      }), null);

      assert.strictEqual(reqIdHelpers.getIdFromReq({
        headers: {
          'x-amzn-trace-id': 'invalid'
        },
        a0trace: {
          span: {
            getBaggageItem: 'getBaggageItem'
          }
        }
      }), null);
    });
  });
});
