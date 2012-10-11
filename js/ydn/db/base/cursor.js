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
 * @fileoverview Cursor object.
 */


goog.provide('ydn.db.Cursor');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.error.ArgumentException');



/**
 * @param {string} store store name.
 * @param {string=} direction cursor direction.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!KeyRangeJson|!ydn.db.KeyRange|!ydn.db.IDBKeyRange|string|number)=}
  * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given.
 * @param {...} opt_args additional parameters for key range constructor.
 * @constructor
 */
ydn.db.Cursor = function(store, direction, index, keyRange, opt_args) {
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

  // set all null so that no surprise from inherit prototype
  this.filter = null;
  this.reduce = null;
  this.map = null;
  this.continued = null;
};


/**
 * Cursor direction.
 * @links http://www.w3.org/TR/IndexedDB/#dfn-direction
 * @enum {string}
 */
ydn.db.Cursor.Direction = {
  NEXT: 'next',
  NEXT_UNIQUE: 'nextunique',
  PREV: 'prev',
  PREV_UNIQUE: 'prevunique'
};


/**
 * @const
 * @type {!Array.<ydn.db.Cursor.Direction>}
 */
ydn.db.Cursor.DIRECTIONS = [
  ydn.db.Cursor.Direction.NEXT,
  ydn.db.Cursor.Direction.NEXT_UNIQUE,
  ydn.db.Cursor.Direction.PREV,
  ydn.db.Cursor.Direction.PREV_UNIQUE
];


/**
 *
 * @param {ydn.db.Cursor.Direction|string=} str
 * @return {ydn.db.Cursor.Direction|undefined}
 */
ydn.db.IndexSchema.toDir = function(str) {
  var idx = goog.array.indexOf(ydn.db.Cursor.DIRECTIONS, str);
  return ydn.db.Cursor.DIRECTIONS[idx]; // undefined OK.
};


/**
 * @inheritDoc
 */
ydn.db.Cursor.prototype.toJSON = function() {
  return {
    'store': this.store_name,
    'index': this.index,
    'key_range': ydn.db.KeyRange.toJSON(this.keyRange || null),
    'direction': this.direction
  };
};

/**
 * Right value for query operation.
 * @type {ydn.db.IDBKeyRange|undefined}
 */
ydn.db.Cursor.prototype.keyRange;

/**
 * Cursor direction.
 * @type {(ydn.db.Cursor.Direction|undefined)}
 */
ydn.db.Cursor.prototype.direction;

/**
 * @type {?function(): *}
 */
ydn.db.Cursor.prototype.initial = null;

/**
 * @type {?function(!Object): boolean}
 */
ydn.db.Cursor.prototype.filter = null;

/**
 * @type {?function(!Object): boolean}
 */
ydn.db.Cursor.prototype.continued = null;

/**
 * @type {?function(!Object): *}
 */
ydn.db.Cursor.prototype.map = null;

/**
 * Reduce is execute after map.
 * @type {?function(*, *, number): *}
 * function(previousValue, currentValue, index)
 */
ydn.db.Cursor.prototype.reduce = null;


/**
 * @type {?function(*): *}
 */
ydn.db.Cursor.prototype.finalize = null;



/**
 *
 * @param {*} value the only value.
 * @return {!ydn.db.Cursor} The query for chaining.
 */
ydn.db.Cursor.prototype.only = function(value) {
  this.keyRange = ydn.db.IDBKeyRange.only(value);
  return this;
};


/**
 *
 * @param {*} value The value of the upper bound.
 * @param {boolean=} is_open If true, the range excludes the upper bound value.
 * @return {!ydn.db.Cursor} The query for chaining.
 */
ydn.db.Cursor.prototype.upperBound = function(value, is_open) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.upperBound(value, is_open);
  return this;
};

/**
 *
 * @param {*} value  The value of the lower bound.
 * @param {boolean=} is_open  If true, the range excludes the lower bound value.
 * @return {!ydn.db.Cursor} The query for chaining.
 */
ydn.db.Cursor.prototype.lowerBound = function(value, is_open) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.lowerBound(value, is_open);
  return this;
};


/**
 *
 * @param {*} lower  The value of the lower bound.
 * @param {*} upper  The value of the upper bound.
 * @param {boolean=} lo If true, the range excludes the lower bound value.
 * @param {boolean=} uo If true, the range excludes the upper bound value.
 * @return {!ydn.db.Cursor} The query for chaining.
 */
ydn.db.Cursor.prototype.bound = function(lower, upper, lo, uo) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.bound(lower, upper, lo, uo);
  return this;
};



/**
 * @override
 */
ydn.db.Cursor.prototype.toString = function() {
  var idx = goog.isDef(this.index) ? ':' + this.index : '';
  return 'Cursor:' + this.store_name + idx;
};

