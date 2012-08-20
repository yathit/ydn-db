// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Query.
 */


goog.provide('ydn.db.Query');
goog.provide('ydn.db.Query.KeyRange');
goog.provide('ydn.db.Query.KeyRangeImpl');
goog.require('goog.functions');



/**
 * @param {string} store store name.
 * @param {string} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {!ydn.db.Query.Config=} select configuration in json format
 * @constructor
 */
ydn.db.Query = function(store, index, select) {
  select = /** @type {ydn.db.Query.Config} */ (select || {});
  /**
   * Store name.
   * @final
   * @type {string}
   */
  this.store = store;
  /**
   * Indexed field.
   * @final
   * @type {string}
   */
  this.index = index;
  this.keyRange = ydn.db.Query.parseKeyRange(select['keyRange']);
  this.limit = select['limit'];
  this.direction = select['direction'];
  this.offset = select['offset'];
  this.filter = select['filter'];
  this.reduce = select['reduce'];
  this.map = select['map'];
  this.continue = select['continue'];
};


/**
 * @inheritDoc
 */
ydn.db.Query.prototype.toJSON = function () {
  return {
    'store':this.store,
    'index':this.index,
    'key_range': ydn.db.Query.KeyRangeImpl.toJSON(this.keyRange),
    'direction':this.direction,
    'offset':this.offset,
    'limit':this.limit
  }
};

/**
 * Right value for query operation.
 * @type {ydn.db.Query.IDBKeyRange}
 */
ydn.db.Query.prototype.keyRange;

/**
 * Cursor direction.
 * @type {(string|undefined)}
 */
ydn.db.Query.prototype.direction;

/**
 * Result to be start by.
 * @type {(number|undefined)}
 */
ydn.db.Query.prototype.offset;

/**
 * Maximum number of result.
 * @type {(number|undefined)}
 */
ydn.db.Query.prototype.limit;


/**
 * @type {function(!Object): boolean}
 */
ydn.db.Query.prototype.filter;

/**
 * @type {function(!Object): boolean}
 */
ydn.db.Query.prototype.continue;

/**
 * @type {function(!Object): *}
 */
ydn.db.Query.prototype.map;

/**
 * Reduce is execute after map.
 * @type {function(*, *, number): *}
 * function(previousValue, currentValue, index)
 */
ydn.db.Query.prototype.reduce;


/**
 * Convenient method for SQL <code>WHEN</code> method.
 * @param {string} field
 * @param {string} op
 * @param {string} value
 * @param {string=} op2
 * @param {string=} value2
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.when = function(field, op, value, op2, value2) {

  var op_test = function(op, lv) {
    if (op === '=' || op === '==') {
      return function(x) {return x == lv};
    } else if (op === '===') {
      return function(x) {return x === lv};
    } else if (op === '>') {
      return function(x) {return x > lv};
    } else if (op === '>=') {
      return function(x) {return x >= lv};
    } else if (op === '<') {
      return function(x) {return x < lv};
    } else if (op === '<=') {
      return function(x) {return x <= lv};
    } else if (op === '!=') {
      return function(x) {return x != lv};
    } else {
      goog.asserts.assert(false, 'Invalid op: ' + op);
    }
  };

  var test1 = op_test(op, value);
  var test2 = goog.isDef(op2) && goog.isDef(value2) ?
      op_test(op2, value2) : goog.functions.TRUE;

  var prev_filter = this.filter || goog.functions.TRUE;

  this.filter = function (obj) {
    return prev_filter(obj) && test1(obj[field]) && test2(obj[field]);
  };
  return this;
};


/**
 * Convenient method for SQL <code>COUNT</code> method.
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.count = function() {
  this.reduce = function(prev) {
    if (!prev) {
      prev = 0;
    }
    return prev + 1;
  };
  return this;
};


/**
 * Convenient method for SQL <code>SUM</code> method.
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.sum = function(field) {
  this.reduce = function(prev, curr, i) {
    if (!goog.isDef(prev)) {
      prev = 0;
    }
    return prev + curr[field];
  };
  return this;
};


/**
 * Convenient method for SQL <code>AVERAGE</code> method.
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.average = function(field) {
  this.reduce = function(prev, curr, i) {
    if (!goog.isDef(prev)) {
      prev = 0;
    }
    return (prev * i + curr[field]) / (i + 1);
  };
  return this;
};


/**
 *
 * @param {string|Array.<string>} arg1
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.select = function(arg1) {
  this.map =  function(data) {
    if (goog.isString(arg1)) {
      return data[arg1];
    } else {
      var selected_data = {};
      for (var i = 0; i < arg1.length; i++) {
        selected_data[arg1[i]] = data[arg1[i]];
      }
      return selected_data;
    }
  };
  return this;
};


/**
 * JSON definition for IDBKeyRange.
 * @typedef {{
 *  lower: (*|undefined),
 *  lowerOpen: (boolean|undefined),
 *  upper: (*|undefined),
 *  upperOpen: (boolean|undefined)
 * }}
 */
ydn.db.Query.KeyRange;


/**
 * This is similar to SQL SELECT statement.
 * @typedef {{
 *  store: (string|undefined),
 *  index: (string|undefined),
 *  keyRange: (ydn.db.Query.KeyRange|Object|undefined),
 *  limit: (number|undefined),
 *  direction: (string|undefined),
 *  offset: (number|undefined)
 *  }}
 */
ydn.db.Query.Config;


/**
 * For those browser that not implemented IDBKeyRange.
 * @constructor
 */
ydn.db.Query.KeyRangeImpl = function(lower, upper, lowerOpen, upperOpen) {
  this.lower = lower;
  this.upper = upper;
  this.lowerOpen = !!lowerOpen;
  this.upperOpen = !!upperOpen;
};


ydn.db.Query.KeyRangeImpl.only = function(value) {
  return new ydn.db.Query.KeyRangeImpl(value, value, false, false);
};


/**
 *
 * @param {(string|number)=} lower
 * @param {(string|number)=} upper
 * @param {boolean=} lowerOpen
 * @param {boolean=} upperOpen
 * @return {ydn.db.Query.KeyRangeImpl}
 */
ydn.db.Query.KeyRangeImpl.bound = function(lower, upper,
  lowerOpen, upperOpen) {
  return new ydn.db.Query.KeyRangeImpl(lower, upper, lowerOpen, upperOpen);
};


ydn.db.Query.KeyRangeImpl.upperBound = function(upper, upperOpen) {
  return new ydn.db.Query.KeyRangeImpl(undefined, upper, undefined, upperOpen);
};

ydn.db.Query.KeyRangeImpl.lowerBound = function(lower, lowerOpen) {
  return new ydn.db.Query.KeyRangeImpl(lower, undefined, lowerOpen, undefined);
};


/**
 *
 * @param {ydn.db.Query.IDBKeyRange} keyRange IDBKeyRange.
 * @return {!Object} IDBKeyRange in JSON format.
 */
ydn.db.Query.KeyRangeImpl.toJSON = function(keyRange) {
  return {
    'lower': keyRange.lower,
    'upper': keyRange.upper,
    'lowerOpen': keyRange.lowerOpen,
    'upperOpen': keyRange.upperOpen
  }
};


/**
 *
 * @type {function(new:IDBKeyRange)} The IDBKeyRange interface of the IndexedDB
 * API represents a continuous interval over some data type that is used for
 * keys.
 */
ydn.db.Query.IDBKeyRange = goog.global.IDBKeyRange ||
  goog.global.webkitIDBKeyRange || ydn.db.Query.KeyRangeImpl;


/**
 * @param {ydn.db.Query.KeyRange=} keyRange keyRange.
 * @return {ydn.db.Query.IDBKeyRange} equivalent IDBKeyRange.
 */
ydn.db.Query.parseKeyRange = function (keyRange) {
  if (!goog.isDefAndNotNull(keyRange)) {
    return null;
  }
  if (goog.isDef(keyRange['upper']) && goog.isDef(keyRange['lower'])) {
    if (keyRange.lower === keyRange.upper) {
      return ydn.db.Query.IDBKeyRange.only(keyRange.lower);
    } else {
    return ydn.db.Query.IDBKeyRange.bound(
      keyRange.lower, keyRange.upper,
      keyRange['lowerOpen'], keyRange['upperOpen']);
    }
  } else if (goog.isDef(keyRange.upper)) {
    return ydn.db.Query.IDBKeyRange.upperBound(keyRange.upper,
      keyRange.upperOpen);
  } else if (goog.isDef(keyRange.lower)) {
    return ydn.db.Query.IDBKeyRange.lowerBound(keyRange.lower,
      keyRange.lowerOpen);
  } else {
    return null;
  }
};


/**
 * @private
 * @param keyRange
 */
ydn.db.Query.isLikeOperation_ = function (keyRange) {
  if (goog.isDef(keyRange.lower) && goog.isDef(keyRange.upper) &&
    !keyRange.lowerOpen && keyRange.upperOpen) {
    if (keyRange.lower.length == keyRange.upper.length) {
      var n = keyRange.lower.length - 1;
      return keyRange.lower.substr(0, n) ==
        keyRange.upper.substr(0, n) &&
        keyRange.lower.charCodeAt(n) + 1 == keyRange.upper.charCodeAt(n);
    } else {
      return false;
    }
  } else {
    return false;
  }
};


/**
 * @return {{where_clause: string, params: Array}} return equivalent of keyRange
 * to SQL WHERE clause and its parameters.
 */
ydn.db.Query.prototype.toWhereClause = function() {

  var where_clause = '';
  var params = [];
  var column = goog.string.quote(this.index);

  if (ydn.db.Query.isLikeOperation_(this.keyRange)) {
    where_clause = column + ' LIKE ?';
    params.push(this.keyRange.lower + '%');
  } else {
    if (goog.isDef(this.keyRange.lower)) {
      var lowerOp = this.keyRange.lowerOpen ? ' > ' : ' >= ';
      where_clause += ' ' + column + lowerOp + '?';
      params.push(this.keyRange.lower);
    }
    if (goog.isDef(this.keyRange.upper)) {
      var upperOp = this.keyRange.upperOpen ? ' < ' : ' <= ';
      var and = where_clause.length > 0 ? ' AND ' : ' ';
      where_clause += and + column + upperOp + '?';
      params.push(this.keyRange.upper);
    }
  }

  return {where_clause: where_clause, params: params};
};


/**
 * Query operator
 * @enum {string}
 */
ydn.db.Query.Op = {
  START_WITH: 'st'
};


/**
 * Helper method for creating useful KeyRange.
 * @param {ydn.db.Query.Op} op operator.
 * @param {string} value value.
 * @return {!ydn.db.Query.KeyRange} result.
 */
ydn.db.Query.createKeyRange = function (op, value) {
  if (op == ydn.db.Query.Op.START_WITH) {
    var value_upper = value.substring(0, value.length - 1) + String.fromCharCode(
      value.charCodeAt(value.length - 1) + 1);
    return {
      lower:value,
      lowerOpen:false,
      upper:value_upper,
      upperOpen:true
    };
  } else {
    throw Error('Invalid op');
  }
};

