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
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.error.ArgumentException');



/**
 * @param {string} store store name.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {string=} direction cursor direction.
 * @param {(!ydn.db.KeyRangeJson|!ydn.db.KeyRange|!ydn.db.IDBKeyRange|string|number)=}
 * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given
 * @param {...} opt_args additional parameters for key range constructor
 * @constructor
 */
ydn.db.Query = function(store, index, direction, keyRange, opt_args) {
  // Note for V8 optimization, declare all properties in constructor.
  if (!goog.isString(store)) {
    throw new ydn.error.ArgumentException('store name required');
  }
  /**
   * Store name.
   * @final
   * @type {string}
   */
  this.store_name = store;
  /**
   * Indexed field.
   * @final
   * @type {string|undefined}
   */
  this.index = index;

  if (!goog.isDefAndNotNull(direction)) {
    direction = undefined;
  } else if (['next', 'prev'].indexOf(direction) == -1) {
    throw new ydn.error.ArgumentException('direction');
  }
  /**
   * @final
   * @type {string}
   */
  this.direction = direction;

  var kr;
  if (keyRange instanceof ydn.db.KeyRange) {
    kr = ydn.db.KeyRange.parseKeyRange(keyRange);
  } else if (goog.isObject(keyRange)) {
    // must be JSON object
    kr = ydn.db.KeyRange.parseKeyRange(keyRange);
  } else if (goog.isDef(keyRange)) {
    kr = ydn.db.IDBKeyRange.bound.apply(this,
      Array.prototype.slice.call(arguments, 3));
  }
  /**
   * @final
   * @type {!ydn.db.IDBKeyRange|undefined}
   */
  this.keyRange = kr;
  if (goog.isDef(this.keyRange) && !goog.isDef(this.index)) {
    throw new ydn.error.ArgumentException('index required.');
  }
  // set all null so that no surprise from inherit prototype
  this.filter = null;
  this.reduce = null;
  this.map = null;
  this.continued = null;
};


/**
 * @inheritDoc
 */
ydn.db.Query.prototype.toJSON = function () {
  return {
    'store':this.store_name,
    'index':this.index,
    'key_range': ydn.db.KeyRange.toJSON(this.keyRange || null),
    'direction':this.direction
  }
};

/**
 * Right value for query operation.
 * @type {ydn.db.IDBKeyRange|undefined}
 */
ydn.db.Query.prototype.keyRange;

/**
 * Cursor direction.
 * @type {(string|undefined)}
 */
ydn.db.Query.prototype.direction;

/**
 * @type {?function(!Object): boolean}
 */
ydn.db.Query.prototype.filter;

/**
 * @type {?function(!Object): boolean}
 */
ydn.db.Query.prototype.continued;

/**
 * @type {?function(!Object): *}
 */
ydn.db.Query.prototype.map;

/**
 * Reduce is execute after map.
 * @type {?function(*, *, number): *}
 * function(previousValue, currentValue, index)
 */
ydn.db.Query.prototype.reduce;


/**
 * Convenient method for SQL <code>WHERE</code> predicate.
 * @param {string} field
 * @param {string} op
 * @param {string} value
 * @param {string=} op2
 * @param {string=} value2
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.where = function(field, op, value, op2, value2) {

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
ydn.db.KeyRangeJson;





/**
 *
 * @param {*} value
 */
ydn.db.Query.prototype.only = function(value) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.only(value);
  return this;
};


/**
 *
 * @param {*} value
 * @param {boolean=} is_open
 */
ydn.db.Query.prototype.upperBound = function(value, is_open) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.upperBound(value, is_open);
  return this;
};

/**
 *
 * @param {*} value
 * @param {boolean=} is_open
 */
ydn.db.Query.prototype.lowerBound = function(value, is_open) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.lowerBound(value, is_open);
  return this;
};

/**
 *
 * @param {*} lower
 * @param {*} upper
 * @param {boolean=} lo
 * @param {boolean=} uo
 */
ydn.db.Query.prototype.bound = function(lower, upper, lo, uo) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.bound(lower, upper, lo, uo);
  return this;
};



/**
 * @return {{where_clause: string, params: Array}} return equivalent of keyRange
 * to SQL WHERE clause and its parameters.
 */
ydn.db.Query.prototype.toWhereClause = function() {

  var where_clause = '';
  var params = [];
  goog.asserts.assertString(this.index);
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
 * Helper method for creating useful KeyRange.
 * @param {string} value value.
 */
ydn.db.Query.prototype.startsWith = function (value) {
  var value_upper = value + '\uffff';
  this.bound(value, value_upper);
  return this;
};



/**
 * @private
 * @param keyRange
 */
ydn.db.Query.isLikeOperation_ = function (keyRange) {
  if (!goog.isDefAndNotNull(keyRange)) {
    return false;
  }
  return goog.isDef(keyRange.lower) && goog.isDef(keyRange.upper) &&
    !keyRange.lowerOpen && !keyRange.upperOpen &&
    keyRange.lower.length == keyRange.upper.length + 1 &&
    keyRange.upper[keyRange.lower.length - 1] == '\uffff';
};