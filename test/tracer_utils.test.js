const tracerUtils = require('../lib/tracer_utils');
const assert = require('assert');

describe('tracer utils', () => {
  function MyObj() {}

  describe('.mapToTags', () => {
    it('converts an object map into tags', () => {
      const map = {
        'long_array': [1, '2', 3, {}, 4, 5, 6, 7, 8, 9, 10, '11', 12, 13, 14, 15, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'y', 'j', 'k'],
        'short_array': ['1', '2'],
        'constructed_object': new MyObj(),
        'literal_object': {},
        'short_string': 'myString',
        'long_string': '12345678901234567890123456789012345678901234',
        'number': 22,
        'null': null,
        'undefined': undefined
      };

      const expected = {
        'long_array': '1,10,11,12,13,14,15,2,3,4,5,6,7,8,9,Object:Object,a,b,c,d,e,f,g,h,y...[27]',
        'short_array': '1,2',
        'constructed_object': 'Object:MyObj',
        'literal_object': 'Object:Object',
        'short_string': 'myString',
        'long_string': '12345678901234567890123456789012345...[44]',
        'number': '22',
        'null': 'null',
        'undefined': 'undefined'
      };

      assert.deepEqual(tracerUtils.mapToTags(map), expected);
    });
  });
});
