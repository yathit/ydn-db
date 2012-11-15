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
 * @fileoverview Query to represent stream of cursor.
 *
 * Cursors are a transient mechanism used to iterate on stream of ordered
 * records from a store. Cursor object define exact stream of records and
 * conditioned iteration process and retain state of cursor position.
 */


goog.provide('ydn.db.Iterator');
goog.provide('ydn.db.Iterator.Direction');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.error.ArgumentException');



/**
 * Create a query object.
 * @param {string} store store name.
 * @param {ydn.db.Iterator.Direction=} direction cursor direction.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!KeyRangeJson|ydn.db.KeyRange|!ydn.db.IDBKeyRange|string|number)=}
  * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given.
 * @param {...} opt_args additional parameters for key range constructor.
 * @constructor
 */
ydn.db.Iterator = function(store, direction, index, keyRange, opt_args) {
  // Note for V8 optimization, declare all properties in constructor.
  if (!goog.isString(store)) {
    throw new ydn.error.ArgumentException('store name required');
  }
  if (goog.isDef(index) && !goog.isString(index)) {
    throw new ydn.error.ArgumentException('index');
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
   * @type {ydn.db.Iterator.Direction|undefined}
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

  // set all null so that no surprise from inherit prototype

  this.filter = null;
  this.continued = null;

  // transient properties during cursor iteration
  this.counter = 0;
  this.store_key = undefined;
  this.index_key = undefined;
  this.has_done = undefined;

};


/**
 * Cursor direction.
 * @link http://www.w3.org/TR/IndexedDB/#dfn-direction
 * @enum {string} Cursor direction.
 */
ydn.db.Iterator.Direction = {
  NEXT: 'next',
  NEXT_UNIQUE: 'nextunique',
  PREV: 'prev',
  PREV_UNIQUE: 'prevunique'
};



/**
 * @const
 * @type {!Array.<ydn.db.Iterator.Direction>} Cursor directions.
 */
ydn.db.Iterator.DIRECTIONS = [
  ydn.db.Iterator.Direction.NEXT,
  ydn.db.Iterator.Direction.NEXT_UNIQUE,
  ydn.db.Iterator.Direction.PREV,
  ydn.db.Iterator.Direction.PREV_UNIQUE
];



/**
 *
 * @return {string} return store name.
 */
ydn.db.Iterator.prototype.getStoreName = function() {
  return this.store_name;
};

/**
 *
 * @return {string|undefined} return store name.
 */
ydn.db.Iterator.prototype.getIndexName = function() {
  return this.index;
};

/**
 *
 * @return {boolean}
 */
ydn.db.Streamer.prototype.isKeyOnly = function() {
  return goog.isString(this.index);
};


/**
 * @inheritDoc
 */
ydn.db.Iterator.prototype.toJSON = function() {
  return {
    'store': this.store_name,
    'index': this.index,
    'key_range': this.keyRange ? ydn.db.KeyRange.toJSON(this.keyRange) : null,
    'direction': this.direction
  };
};

/**
 * Right value for query operation.
 * @type {ydn.db.IDBKeyRange|undefined}
 */
ydn.db.Iterator.prototype.keyRange;

/**
 * Cursor direction.
 * @type {(ydn.db.Iterator.Direction|undefined)}
 */
ydn.db.Iterator.prototype.direction;

/**
 * @type {?function(*): boolean}
 */
ydn.db.Iterator.prototype.filter = null;

/**
 * @type {?function(*): boolean}
 */
ydn.db.Iterator.prototype.continued = null;





/**
 * @override
 */
ydn.db.Iterator.prototype.toString = function() {
  var idx = goog.isDef(this.index) ? ':' + this.index : '';
  return 'Cursor:' + this.store_name + idx;
};



//
///**
// * @final
// * @param {string} op
// * @param {number|string} lv
// * @param {number|string} x
// * @return {boolean}
// */
//ydn.db.Iterator.op_test = function(op, lv, x) {
//  if (op === '=' || op === '==') {
//    return  x == lv;
//  } else if (op === '===') {
//    return  x === lv;
//  } else if (op === '>') {
//    return  x > lv;
//  } else if (op === '>=') {
//    return  x >= lv;
//  } else if (op === '<') {
//    return  x < lv;
//  } else if (op === '<=') {
//    return  x <= lv;
//  } else if (op === '!=') {
//    return  x != lv;
//  } else {
//    throw new Error('Invalid op: ' + op);
//  }
//};



/**
 *
 * @return {*|undefined} Current cursor key.
 */
ydn.db.Iterator.prototype.key = function() {
  return this.store_key;
};


/**
 *
 * @return {*|undefined} Current cursor index key.
 */
ydn.db.Iterator.prototype.indexKey = function() {
  return this.index_key;
};



/**
 *
 * @return {number} number of record iterated.
 */
ydn.db.Iterator.prototype.count = function() {
  return this.counter;
};


/**
 *
 * @return {boolean|undefined} number of record iterated.
 */
ydn.db.Iterator.prototype.done = function() {
  return this.has_done;
};


/**
 *
 * @return {!Array.<string>}
 */
ydn.db.Iterator.prototype.stores = function() {
  return [this.store_name];
};



/**
 * Convenient method for SQL <code>WHERE</code> predicate.
 * @param {string} store_name store name.
 * @param {string} field index field name to query from.
 * @param {string} op where operator.
 * @param {string} value rvalue to compare.
 * @param {string=} op2 secound operator.
 * @param {string=} value2 second rvalue to compare.
 * @return {!ydn.db.Iterator} The query.
 */
ydn.db.Iterator.where = function(store_name, field, op, value, op2, value2) {
  var key_range = new ydn.db.Where(field, op, value, op2, value2);
  return new ydn.db.Iterator(store_name, ydn.db.Iterator.Direction.NEXT, field, key_range);
};



/**
 * @override
 */
ydn.db.Iterator.prototype.toString = function() {
  return 'Iterator:' + this.store_name_ + (this.index_name_ || '');
};