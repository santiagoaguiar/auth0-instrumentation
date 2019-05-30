// Random values but it is good to have limits on the amount of work
const MAX_STRING_LENGTH = 25;
const MAX_ARRAY_LENGTH = 25;
const MAX_OBJECT_KEYS = 25;

function serializeArray(array) {
  let workArray = array;

  if (array.length > MAX_ARRAY_LENGTH) {
    // Let's limit the amount of work
    workArray = array.slice(0, MAX_ARRAY_LENGTH);
  }

  // We sort the array so arrays with same elements are equal when show as a tag
  // search capacity is kind of limited and this should help locating certain tags
  const result = workArray.map((e) => serialize(e)).filter((e) => !!e).sort().join(',');

  if (array.length > MAX_ARRAY_LENGTH) {
    return `${result}...[${array.length}]`;
  }

  return result;
}

function serializeObject(obj) {
  return `Object:${obj.constructor ? obj.constructor.name : ''}`;
}

function serializeNumber(number) {
  return number.toString();
}

function serializeString(str) {
  if (str.length > MAX_STRING_LENGTH) {
    return `${str.slice(0, MAX_STRING_LENGTH)}...[${str.length}]`;
  }

  return str;
}

function serialize(data) {
  if (data === null) {
    return 'null';
  } else if (typeof data === 'undefined') {
    return 'undefined';
  } else if (Array.isArray(data)) {
    return serializeArray(data);
  } else if (typeof data === 'object') {
    return serializeObject(data);
  } else if (typeof data === 'number') {
    return serializeNumber(data);
  } else if (typeof data === 'string') {
    return serializeString(data);
  }
}

exports.mapToTags = function mapToTags(map) {
  let keys = Object.keys(map);

  if (keys.length > MAX_OBJECT_KEYS) {
    keys = keys.splice(0, MAX_OBJECT_KEYS);
  }

  return keys.reduce((tags, key) => {
    tags[key] = serialize(map[key]);

    return tags;
  }, {});
};
