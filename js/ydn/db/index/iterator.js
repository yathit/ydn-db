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
 * @fileoverview Iterate cursor of an index or an object store.
 *
 *
 */


goog.provide('ydn.db.Iterator');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.db.base');
goog.require('ydn.error.ArgumentException');


/**
 * Create an iterator object.
 * @param {string} store store name.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!KeyRangeJson|ydn.db.KeyRange|!ydn.db.IDBKeyRange)=} keyRange
 * configuration in json or native format. Alternatively key range
 * constructor parameters can be given.
 * @param {boolean=} reverse reverse.
 * @param {boolean=} unique unique.
 * @param {boolean=} key_only true for key only iterator. Default value is
 * true if index is specified, false if not defined.
 * @constructor
 */
ydn.db.Iterator = function(store, index, keyRange, reverse, unique, key_only) {
  // Note for V8 optimization, declare all properties in constructor.
  if (!goog.isString(store)) {
    throw new ydn.error.ArgumentException('store');
  }
  if (goog.isDef(index) && !goog.isString(index)) {
    throw new ydn.error.ArgumentException('index');
  }
  if (arguments.length > 6) {
    throw new ydn.error.ArgumentException('too many input arguments.');
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

  this.key_only_ = goog.isDef(key_only) ? key_only :
      !!(goog.isString(this.index));
  if (!goog.isBoolean(this.key_only_)) {
    throw new ydn.error.ArgumentException('key_only');
  }

  if (goog.isDef(reverse) && !goog.isBoolean(reverse)) {
    throw new ydn.error.ArgumentException('reverse');
  }
  if (goog.isDef(unique) && !goog.isBoolean(unique)) {
    throw new ydn.error.ArgumentException('unique');
  }
  var direction = ydn.db.base.Direction.NEXT;
  if (reverse && unique) {
    direction = ydn.db.base.Direction.PREV_UNIQUE;
  } else if (reverse) {
    direction = ydn.db.base.Direction.PREV;
  } else if (unique) {
    direction = ydn.db.base.Direction.NEXT_UNIQUE;
  }

  /**
   * @final
   * @type {ydn.db.base.Direction}
   */
  this.direction = direction;

  if (goog.DEBUG) {
    var msg = ydn.db.KeyRange.validate(keyRange);
      if (msg) {
        throw new ydn.error.ArgumentException(msg);
      }
  }
  /**
   *
   * @final
   */
  this.key_range_ = ydn.db.KeyRange.parseKeyRange(keyRange);

  this.filter_index_names_ = [];
  this.filter_key_ranges_ = [];
  this.filter_store_names_ = [];

  // set all null so that no surprise from inherit prototype

  // transient properties during cursor iteration
  this.counter = 0;
  this.store_key = undefined;
  this.index_key = undefined;
  this.has_done = undefined;

};



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
 * @return {ydn.db.IDBKeyRange} return key range.
 */
ydn.db.Iterator.prototype.keyRange = function() {
  return this.key_range_;
};


/**
 *
 * @return {IDBKeyRange} return a clone of key range.
 */
ydn.db.Iterator.prototype.getKeyRange = function() {
  return ydn.db.KeyRange.parseIDBKeyRange(this.key_range_);
};


/**
 *
 * @private
 * @type {ydn.db.IDBKeyRange}
 */
ydn.db.Iterator.prototype.key_range_;


/**
 *
 * @type {boolean}
 * @private
 */
ydn.db.Iterator.prototype.key_only_ = true;


/**
 *
 * @return {boolean}
 */
ydn.db.Iterator.prototype.isKeyOnly = function() {
  return this.key_only_;
};



/**
 * @inheritDoc
 */
ydn.db.Iterator.prototype.toJSON = function() {
  return {
    'store': this.store_name,
    'index': this.index,
    'key_range': this.key_range_ ? ydn.db.KeyRange.toJSON(this.key_range_) : null,
    'direction': this.direction
  };
};



/**
 * Cursor direction.
 * @type {(ydn.db.base.Direction|undefined)}
 */
ydn.db.Iterator.prototype.direction;


/**
 * @override
 */
ydn.db.Iterator.prototype.toString = function() {
  var idx = goog.isDef(this.index) ? ':' + this.index : '';
  return 'Iterator:' + this.store_name + idx;
};


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
 * Resume from a saved position.
 * @param key
 * @param index_key
 */
ydn.db.Iterator.prototype.resume = function(key, index_key) {
  // todo: check valid state
  this.store_key = key;
  this.index_key = index_key;
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
  return [this.store_name].concat(this.peer_store_names_);
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
  return new ydn.db.Iterator(store_name, field, key_range);
};


/**
 *
 * @type {Array.<string>}
 * @private
 */
ydn.db.Iterator.prototype.peer_store_names_ = [];


/**
 *
 * @type {Array.<string|undefined>}
 * @private
 */
ydn.db.Iterator.prototype.peer_index_names_ = [];


/**
 *
 * @type {Array.<string|undefined>}
 * @private
 */
ydn.db.Iterator.prototype.base_index_names_ = [];


/**
 *
 * @param {string} peer_store_name Peer store name to join with base store in
 * LEFT OUTER join sense.
 * @param {string=} base_index_name Base index name. If not provide,
 * base primary key is taken.
 * @param {string=} peer_index_name Peer index name. If not provide,
 * peer primary key is assumed.
 */
ydn.db.Iterator.prototype.join = function(peer_store_name, base_index_name,
                                          peer_index_name) {
  if (!goog.isString(peer_store_name)) {
    throw new ydn.error.ArgumentException();
  }
  if (!goog.isString(base_index_name) || !goog.isDef(base_index_name)) {
    throw new ydn.error.ArgumentException();
  }
  if (!goog.isString(peer_index_name) || !goog.isDef(peer_index_name)) {
    throw new ydn.error.ArgumentException();
  }
  this.peer_store_names_.push(peer_store_name);
  this.peer_index_names_.push(peer_index_name);
  this.base_index_names_.push(base_index_name);
};


/**
 *
 * @param {number} i index of peer.
 * @return {string} peer store name.
 */
ydn.db.Iterator.prototype.getPeerStoreName = function(i) {
  goog.asserts.assert(i >= 0 && i < this.peer_store_names_.length);
  return this.peer_store_names_[i];
};


/**
 *
 * @param {number} i index of peer.
 * @return {string|undefined} peer index name.
 */
ydn.db.Iterator.prototype.getPeerIndexName = function(i) {
  goog.asserts.assert(i >= 0 && i < this.peer_index_names_.length);
  return this.peer_index_names_[i];
};


/**
 *
 * @param {number} i index of peer.
 * @return {string|undefined} base index name.
 */
ydn.db.Iterator.prototype.getBaseIndexName = function(i) {
  goog.asserts.assert(i >= 0 && i < this.base_index_names_.length);
  return this.base_index_names_[i];
};


/**
 * Degree of iterator is the total number of stores.
 * @return {number}
 */
ydn.db.Iterator.prototype.degree = function () {
  return this.peer_store_names_.length + 1;
};


/**
 *
 * @return {boolean}
 */
ydn.db.Iterator.prototype.isReversed = function() {
  return this.direction === ydn.db.base.Direction.PREV ||
      this.direction === ydn.db.base.Direction.PREV_UNIQUE;
};


/**
 *
 * @return {boolean}
 */
ydn.db.Iterator.prototype.isUnique = function() {
  return this.direction === ydn.db.base.Direction.NEXT_UNIQUE ||
    this.direction === ydn.db.base.Direction.PREV_UNIQUE;
};


/**
 *
 * @type {!Array.<string>}
 * @private
 */
ydn.db.Iterator.prototype.filter_index_names_ = [];

/**
 *
 * @type {!Array.<!IDBKeyRange>}
 * @private
 */
ydn.db.Iterator.prototype.filter_key_ranges_ = [];


/**
 *
 * @type {!Array.<string>}
 * @private
 */
ydn.db.Iterator.prototype.filter_store_names_ = [];


/**
 * Filter primary key. It is assumed that primary keys running from the filter
 * are ordered.
 * @param {string} index_name index name.
 * @param {!ydn.db.KeyRange|!Array|number|string} key_range if not key range, a key is build
 * using ydn.db.KeyRange.only().
 * @param {string=} store_name store name if different from this iterator.
 */
ydn.db.Iterator.prototype.setFilter = function(index_name, key_range, store_name) {
  if (arguments.length > 3) {
    throw new ydn.error.ArgumentException('too many input arguments.');
  }
  if (!goog.isString(index_name)) {
    throw new ydn.error.ArgumentException('index name');
  }
  ydn.db.Iterator.prototype.filter_index_names_.push(index_name);
  var kr;
  if (key_range instanceof ydn.db.KeyRange) {
    kr = ydn.db.KeyRange.parseIDBKeyRange(key_range);
  } else if (goog.isDef(key_range)) {
    kr = ydn.db.KeyRange.only(key_range);
  } else {
    throw new ydn.error.ArgumentException('key range');
  }
  this.filter_key_ranges_.push(kr);
  if (goog.isDef(store_name) && !goog.isString(store_name)) {
    throw new ydn.error.ArgumentException('store name');
  }
  this.filter_store_names_.push(store_name);
};


/**
 *
 * @return {number}
 */
ydn.db.Iterator.prototype.countFilter = function() {
  return this.filter_index_names_.length;
};


/**
 *
 * @param {number} idx
 * @return {string} index name of idx'th filter.
 */
ydn.db.Iterator.prototype.getFilterIndexName = function(idx) {
  return this.filter_index_names_[idx];
};


/**
 *
 * @param {number} idx
 * @return {string|undefined} store name of idx'th filter.
 */
ydn.db.Iterator.prototype.getFilterStoreName = function(idx) {
  return this.filter_store_names_[idx];
};


/**
 *
 * @param {number} idx
 * @return {IDBKeyRange} key range of idx'th filter.
 */
ydn.db.Iterator.prototype.getFilterKeyRange = function(idx) {
  return this.filter_key_ranges_[idx];
};

