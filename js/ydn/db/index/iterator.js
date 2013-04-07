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


goog.provide('ydn.db.Cursors');
goog.provide('ydn.db.IndexValueCursors');
goog.provide('ydn.db.Iterator');
goog.provide('ydn.db.Iterator.State');
goog.provide('ydn.db.KeyCursors');
goog.provide('ydn.db.ValueCursors');
goog.require('goog.debug.Logger');
goog.require('goog.functions');
goog.require('ydn.db.Cursor');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.db.base');
goog.require('ydn.db.index.req.ICursor');
goog.require('ydn.debug.error.ArgumentException');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Create an iterator object.
 * @param {!string} store store name.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!KeyRangeJson|ydn.db.KeyRange|IDBKeyRange)=} keyRange key range.
 * @param {boolean=} reverse reverse.
 * @param {boolean=} unique unique.
 * @param {boolean=} key_only true for key only iterator. Default value is
 * true if index is specified, false if not defined.
 * @constructor
 */
ydn.db.Iterator = function(store, index, keyRange, reverse, unique, key_only) {
  // Note for V8 optimization, declare all properties in constructor.
  if (!goog.isString(store)) {
    throw new ydn.debug.error.ArgumentException('store name must be a string');
  }

  /**
   * Store name.
   * @final
   */
  this.store_name = store;

  /**
   * Indexed field.
   * @final
   */
  this.index = index;
  /**
   * @final
   */
  this.is_index_iterator_ = goog.isString(this.index);
  /**
   * @final
   */
  this.key_only_ = goog.isDef(key_only) ? key_only :
      !!(goog.isString(this.index));
  if (!goog.isBoolean(this.key_only_)) {
    throw new ydn.debug.error.ArgumentException('key_only');
  }

  if (goog.isDef(reverse) && !goog.isBoolean(reverse)) {
    throw new ydn.debug.error.ArgumentException('reverse');
  }
  if (goog.isDef(unique) && !goog.isBoolean(unique)) {
    throw new ydn.debug.error.ArgumentException('unique');
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
      throw new ydn.debug.error.ArgumentException('Invalid key range: ' + msg);
    }
  }
  /**
   * @final
   */
  this.key_range_ = ydn.db.KeyRange.parseIDBKeyRange(keyRange);

  this.filter_index_names_ = [];
  this.filter_key_ranges_ = [];
  this.filter_store_names_ = [];

  // transient properties during cursor iteration
  this.cursor_ = null;
};


/**
 * @define {boolean} to debug this file.
 */
ydn.db.Iterator.DEBUG = false;


/**
 * @type {!string}
 * @private
 */
ydn.db.Iterator.prototype.store_name;


/**
 * @type {string|undefined}
 * @private
 */
ydn.db.Iterator.prototype.index;


/**
 * @type {ydn.db.Cursor}
 * @private
 */
ydn.db.Iterator.prototype.cursor_;


/**
 * @type {boolean}
 * @private
 */
ydn.db.Iterator.prototype.is_index_iterator_;


/**
 *
 * @private
 * @type {IDBKeyRange}
 */
ydn.db.Iterator.prototype.key_range_;


/**
 *
 * @type {boolean}
 * @private
 */
ydn.db.Iterator.prototype.key_only_ = true;


/**
 * Cursor direction.
 * @type {(ydn.db.base.Direction)}
 */
ydn.db.Iterator.prototype.direction;


/**
 * Create an iterator object.
 * @param {string} store store name.
 * @param {(!KeyRangeJson|ydn.db.KeyRange)=} keyRange key range.
 * @param {boolean=} reverse reverse.
 * @constructor
 * @extends {ydn.db.Iterator}
 */
ydn.db.KeyCursors = function(store, keyRange, reverse) {
  if (arguments.length > 3) {
    throw new ydn.debug.error.ArgumentException('too many argument');
  }
  goog.base(this, store, undefined, keyRange, reverse, undefined, true);
};
goog.inherits(ydn.db.KeyCursors, ydn.db.Iterator);


/**
 *
 * @param {string} store_name
 * @param {string} op where operator.
 * @param {*} value rvalue to compare.
 * @param {string=} op2 second operator.
 * @param {*=} value2 second rvalue to compare.
 * @return {ydn.db.KeyCursors}
 */
ydn.db.KeyCursors.where = function(store_name, op, value, op2, value2) {
  return new ydn.db.KeyCursors(store_name,
    ydn.db.KeyRange.where(op, value, op2, value2));
};


/**
 * Create an iterator object.
 * @param {string} store store name.
 * @param {string} index index name.
 * @param {(!KeyRangeJson|ydn.db.KeyRange|IDBKeyRange)=} keyRange key range.
 * @param {boolean=} reverse reverse.
 * @param {boolean=} unique unique.
 * @constructor
 * @extends {ydn.db.Iterator}
 */
ydn.db.Cursors = function(store, index, keyRange, reverse, unique) {
  if (!goog.isString(index)) {
    throw new ydn.debug.error.ArgumentException('index name must be string');
  }
  goog.base(this, store, index, keyRange, reverse, unique, true);
};
goog.inherits(ydn.db.Cursors, ydn.db.Iterator);


/**
 *
 * @param {string} store_name
 * @param {string} index index name.
 * @param {string} op where operator.
 * @param {*} value rvalue to compare.
 * @param {string=} op2 second operator.
 * @param {*=} value2 second rvalue to compare.
 * @return {ydn.db.Cursors}
 */
ydn.db.Cursors.where = function(store_name, index, op, value, op2, value2) {
  return new ydn.db.Cursors(store_name, index,
    ydn.db.KeyRange.where(op, value, op2, value2));
};


/**
 * Create an iterator object.
 * @param {!string} store store name.
 * @param {(!KeyRangeJson|ydn.db.KeyRange)=} keyRange key range.
 * @param {boolean=} reverse reverse.
 * @constructor
 * @extends {ydn.db.Iterator}
 */
ydn.db.ValueCursors = function(store, keyRange, reverse) {
  if (arguments.length > 3) {
    throw new ydn.debug.error.ArgumentException('too many argument');
  }
  goog.base(this, store, undefined, keyRange, reverse, undefined, false);
};
goog.inherits(ydn.db.ValueCursors, ydn.db.Iterator);

/**
 *
 * @param {string} store_name
 * @param {string} op where operator.
 * @param {*} value rvalue to compare.
 * @param {string=} op2 second operator.
 * @param {*=} value2 second rvalue to compare.
 * @return {ydn.db.ValueCursors}
 */
ydn.db.ValueCursors.where = function(store_name, op, value, op2, value2) {
  return new ydn.db.ValueCursors(store_name,
    ydn.db.KeyRange.where(op, value, op2, value2));
};


/**
 * Create an iterator object.
 * @param {!string} store store name.
 * @param {string} index index name.
 * @param {(!KeyRangeJson|ydn.db.KeyRange|IDBKeyRange)=} keyRange key range.
 * @param {boolean=} reverse reverse.
 * @param {boolean=} unique unique.
 * @constructor
 * @extends {ydn.db.Iterator}
 */
ydn.db.IndexValueCursors = function(store, index, keyRange, reverse, unique) {
  if (!goog.isString(index)) {
    throw new ydn.debug.error.ArgumentException('index name must be string');
  }
  goog.base(this, store, index, keyRange, reverse, unique, false);
};
goog.inherits(ydn.db.IndexValueCursors, ydn.db.Iterator);


/**
 *
 * @param {string} store_name
 * @param {string} index index name.
 * @param {string} op where operator.
 * @param {*} value rvalue to compare.
 * @param {string=} op2 second operator.
 * @param {*=} value2 second rvalue to compare.
 * @return {ydn.db.IndexValueCursors}
 */
ydn.db.IndexValueCursors.where = function(store_name, index, op, value, op2, value2) {
  return new ydn.db.IndexValueCursors(store_name, index,
    ydn.db.KeyRange.where(op, value, op2, value2));
};


/**
 * Iterator state.
 * @enum {string}
 */
ydn.db.Iterator.State = {
  INITIAL: 'initial',
  WORKING: 'working',
  RESTING: 'resting',
  COMPLETED: 'completed'
};


/**
 *
 * @return {ydn.db.Iterator.State}
 */
ydn.db.Iterator.prototype.getState = function() {
  if (!this.cursor_) {
    return ydn.db.Iterator.State.INITIAL;
  } else if (this.cursor_.hasDone()) {
    return ydn.db.Iterator.State.COMPLETED;
  } else {
    if (this.cursor_.isExited()) {
      return ydn.db.Iterator.State.RESTING;
    } else {
      return ydn.db.Iterator.State.WORKING;
    }
  }
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.Iterator.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.Iterator');


/**
 *
 * @return {!string} return store name.
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
 * @return {ydn.db.base.Direction} return store name.
 */
ydn.db.Iterator.prototype.getDirection = function() {
  return this.direction;
};


/**
 *
 * @return {*|undefined} return current primary key.
 */
ydn.db.Iterator.prototype.getPrimaryKey = function() {
  return this.cursor_ ? this.cursor_.getPrimaryKey() : undefined;
};


/**
 *
 * @return {*|undefined} return current effective key.
 */
ydn.db.Iterator.prototype.getEffectiveKey = function() {
  return this.cursor_ ? this.cursor_.getKey() : undefined;
};


/**
 * @return {ydn.db.IDBKeyRange} return key range.
 */
ydn.db.Iterator.prototype.keyRange = function() {
  return this.key_range_;
};


/**
 *
 * @return {boolean}
 */
ydn.db.Iterator.prototype.hasKeyRange = function() {
  return !!this.key_range_;
};


/**
 *
 * @return {*} get lower value of key range.
 */
ydn.db.Iterator.prototype.getLower = function() {
  return this.key_range_ ? undefined : this.key_range_.lower;
};


/**
 *
 * @return {*} get lower value of key range.
 */
ydn.db.Iterator.prototype.getLowerOpen = function() {
  return this.key_range_ ? undefined : this.key_range_.lowerOpen;
};


/**
 *
 * @return {*} get upper value of key range.
 */
ydn.db.Iterator.prototype.getUpper = function() {
  return this.key_range_ ? undefined : this.key_range_.upper;
};


/**
 *
 * @return {*} get upper value of key range.
 */
ydn.db.Iterator.prototype.getUpperOpen = function() {
  return this.key_range_ ? undefined : this.key_range_.upperOpen;
};


/**
 * @return {ydn.db.IDBKeyRange} return a clone of key range.
 */
ydn.db.Iterator.prototype.getKeyRange = function() {
  if (this.key_range_) {
    if (this.key_range_ instanceof ydn.db.IDBKeyRange) {
      return this.key_range_;
    } else {
      return ydn.db.IDBKeyRange.bound(this.key_range_.lower,
          this.key_range_.upper, this.key_range_.lowerOpen,
          this.key_range_.upperOpen);
    }
  } else {
    return null;
  }
};


/**
 *
 * @return {IDBKeyRange} return *the* key range.
 */
ydn.db.Iterator.prototype.getIDBKeyRange = function() {
  return this.key_range_;
};


/**
 *
 * @return {boolean}
 */
ydn.db.Iterator.prototype.isKeyOnly = function() {
  return this.key_only_;
};


/**
 *
 * @return {boolean}
 */
ydn.db.Iterator.prototype.isIndexIterator = function() {
  return this.is_index_iterator_;
};


/**
 * @inheritDoc
 */
ydn.db.Iterator.prototype.toJSON = function() {
  return {
    'store': this.store_name,
    'index': this.index,
    'key_range': this.key_range_ ?
        ydn.db.KeyRange.toJSON(this.key_range_) : null,
    'direction': this.direction
  };
};


if (goog.DEBUG) {
  /**
   * @override
   */
  ydn.db.Iterator.prototype.toString = function() {
    var idx = goog.isDef(this.index) ? ':' + this.index : '';
    if (goog.isDefAndNotNull(this.primary_key)) {
      var close = ']';
      var start = '[';
      var state = this.getState();
      if (state == ydn.db.Iterator.State.WORKING) {
        start = '{';
        close = '}';
      } else if (state == ydn.db.Iterator.State.RESTING) {
        start = '(';
        close = ')';
      }
      var idx_key = this.isIndexIterator() ? ', ' + this.index_key : '';
      idx += ' ' + start + this.primary_key + idx_key + close;
    }
    var s = this.isIndexIterator() ? 'Index' : '';
    s += this.isKeyOnly() ? 'Key' : 'Value';
    return s + 'Iterator:' + this.store_name + idx;
  };
}


/**
 *
 * @return {*|undefined} Current cursor key.
 */
ydn.db.Iterator.prototype.key = function() {
  return this.primary_key;
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
  this.primary_key = key;
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
    throw new ydn.debug.error.ArgumentException();
  }
  if (!goog.isString(base_index_name) || !goog.isDef(base_index_name)) {
    throw new ydn.debug.error.ArgumentException();
  }
  if (!goog.isString(peer_index_name) || !goog.isDef(peer_index_name)) {
    throw new ydn.debug.error.ArgumentException();
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
ydn.db.Iterator.prototype.degree = function() {
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
 *
 * @type {Array}
 * @private
 */
ydn.db.Iterator.prototype.filter_ini_keys_ = [];

/**
 *
 * @type {Array}
 * @private
 */
ydn.db.Iterator.prototype.filter_ini_index_keys_ = [];


/**
 * Filter primary key. It is assumed that primary keys running from the filter
 * are ordered.
 * @param {string} index_name field name to filter.
 * @param {!ydn.db.KeyRange|!Array|number|string} key_range if not key range, a key is build
 * using ydn.db.KeyRange.only().
 * @param {string=} store_name store name if different from this iterator.
 */
ydn.db.Iterator.prototype.filter = function(index_name, key_range, store_name) {
  if (arguments.length > 3) {
    throw new ydn.debug.error.ArgumentException('too many input arguments.');
  }
  if (!goog.isString(index_name)) {
    throw new ydn.debug.error.ArgumentException('index name');
  }
  this.filter_index_names_.push(index_name);
  var kr;
  if (key_range instanceof ydn.db.KeyRange) {
    kr = ydn.db.KeyRange.parseIDBKeyRange(key_range);
  } else if (goog.isDef(key_range)) {
    kr = ydn.db.IDBKeyRange.only(key_range);
  } else {
    throw new ydn.debug.error.ArgumentException('key range');
  }
  this.filter_key_ranges_.push(kr);
  if (goog.isDef(store_name)) {
    if (goog.isString(store_name)) {
      this.filter_store_names_.push(store_name);
    } else {
      throw new ydn.debug.error.ArgumentException('store name');
    }
  } else {
    this.filter_store_names_.push(undefined);
  }


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

//
///**
// * Notified that iterating is exiting.
// * @protected
// */
//ydn.db.Iterator.prototype.exit = function() {
//  // IndexedDB will GC the array, so we clone it.
//  this.primary_key = goog.isArrayLike(this.primary_key) ?
//    goog.array.clone(this.primary_key) : this.primary_key;
//  this.index_key = goog.isArrayLike(this.index_key) ?
//    goog.array.clone(this.index_key) : this.index_key;
//  this.iterating_ = false;
//  this.has_done = false;
//  this.logger.finest(this + ': exited');
//};


/**
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx tx.
 * @param {string} tx_lbl tx label.
 * @param {ydn.db.index.req.IRequestExecutor} executor executor.
 * @return {ydn.db.Cursor}
 */
ydn.db.Iterator.prototype.iterate = function(tx, tx_lbl, executor) {

  var cursor = executor.getCursor(tx, tx_lbl, this.store_name, this.index,
      this.key_range_, this.direction, this.key_only_);

  if (!this.cursor_) {
    this.cursor_ = new ydn.db.Cursor([cursor]);
    this.logger.finest(tx_lbl + ' ' + this + ' created ' + this.cursor_);
  } else {
    this.cursor_.resume([cursor]);
    this.logger.finest(tx_lbl + ' ' + this + ' reused cursor ' + this.cursor_);
  }

  return this.cursor_;
};

//
//
///**
// * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
// * @param {string} tx_no tx no.
// * @param {ydn.db.index.req.IRequestExecutor} executor
// * @return {ydn.db.index.req.AbstractCursor}
// * @private
// */
//ydn.db.Iterator.prototype.iterateWithFilters_ = function(tx, tx_no, executor) {
//  var me = this;
//  var ini_key, ini_index_key;
//  var resume = this.has_done === false;
//  if (resume) {
//    // continue the iteration
//    goog.asserts.assert(this.primary_key);
//    ini_key = this.primary_key;
//    ini_index_key = this.index_key;
//  } else { // start a new iteration
//    this.counter = 0;
//  }
//  this.iterating_ = true;
//
//  // this algorithm is inspired by zigzag merge algorithm as described in
//// http://www.google.com/events/io/2010/sessions/next-gen-queries-appengine.html
//
//  // We rely on the fact that requests are executed in order.
//  // http://www.w3.org/TR/IndexedDB/#steps-for-asynchronously-executing-a-request
//
//  // secondary cursors for filters
//  var cursors = [];
//
//  // we send primary_cursor first, so that we filtered cursor arrive, we know
//  // our target key value is.
//  var primary_cursor = executor.getCursor(tx, tx_no, this.store_name, this.index,
//      this.key_range_, this.direction, this.key_only_);
//
//
//  primary_cursor.openCursor(ini_key, ini_index_key, resume);
//
//  /**
//   * onSuccess handler is called before onNext callback. The purpose of
//   * onSuccess handler is apply filter. If filter condition are not meet,
//   * onSuccess return next advancement value skipping onNext callback.
//   * @param primary_key
//   * @param key
//   * @param value
//   */
//  primary_cursor.onSuccess = function(primary_key, key, value) {
//
//    if (goog.isDef(primary_key)) {
//      me.has_done = false;
//      // array need to be clone because
//      me.primary_key = primary_key;
//      me.index_key = key;
//      // check all filter condition are met.
//      // me.counter++; // counter increase onNext callback
//      if (isAllRequestDone()) {
//        processNext(0);
//      }
//    } else {
//      me.has_done = true;
//      me.iterating_ = false;
//    }
//  };
//
//  var filterCursorOnSuccess = function(i, primary_key, key, value) {
//
//    var all_done = isAllRequestDone();
//    if (goog.isDef(primary_key)) {
//      me.filter_ini_keys_[i] = primary_key;
//      me.filter_ini_index_keys_[i] = key;
//    }
//    if (isAllRequestDone()) {
//      processNext(i + 1);
//    }
//  };
//  for (var i = 0; i < this.filter_index_names_.length; i++) {
//    var store_name = this.filter_store_names_[i] || this.store_name;
//    var cursor = executor.getCursor(tx, tx_no, store_name, this.filter_index_names_[i],
//        this.filter_key_ranges_[i], this.direction, true);
//    cursor.openCursor(this.filter_ini_keys_[i], this.filter_ini_index_keys_[i]);
//    cursors.push(cursor);
//    cursor.onSuccess = goog.partial(filterCursorOnSuccess, i);
//
//  }
//
//  if (ydn.db.Iterator.DEBUG) {
//    var msg = [];
//    msg.push(primary_cursor.toString());
//    for (var i = 0; i < cursors.length; i++) {
//      msg.push(cursors[i].toString());
//    }
//    window.console.log('iterating ' + msg.join(', '));
//  }
//
//
//  /**
//   * Return true if all requests finished.
//   * @return {boolean}
//   */
//  var isAllRequestDone = function() {
//    var some_req_not_finished = cursors.some(function(req) {
//      return req.isRequestPending();
//    });
//    return !some_req_not_finished;
//  };
//
//  /**
//   * @param {number} idx caller request index.
//   */
//  var processNext = function(idx) {
//    // filter is pass if its primary key of the filter is equal to or greater
//    // than the primary cursor's primary key.
//    // greater, however means the filter condition will never met and hence
//    // primary cursor must advance.
//    var pass = false;
//    var match = true;
//    var cmps = [];
//    var highest_key = me.primary_key;
//    for (var i = 0; i < cursors.length; i++) {
//      var cursor = cursors[i];
//      if (cursor.hasCursor()) {
//        var cmp = ydn.db.cmp(me.primary_key, cursor.getPrimaryKey());
//        cmps[i] = cmp;
//        if (cmp === 1) {
//          match = false;
//        } else if (cmp === -1) {
//          match = false;
//          pass = true;
//          if (ydn.db.cmp(cursor.getPrimaryKey(), highest_key) === 1) {
//            highest_key = cursor.getPrimaryKey();
//          }
//        }
//      } else {
//        match = false;
//      }
//    }
//    if (ydn.db.Iterator.DEBUG) {
//      window.console.log(['processNext', match, pass, highest_key, JSON.stringify(cmps)]);
//    }
//
//    if (match) {
//      primary_cursor.onNext(primary_cursor.getPrimaryKey(),
//          primary_cursor.getIndexKey(), primary_cursor.getValue());
//      // all cursors advance one step.
//      // primary_cursor.forward(true); // onNext will invoke
//      for (var i = 0; i < cursors.length; i++) {
//        cursors[i].forward(true);
//      }
//    } else if (pass) {
//      // we mush skip current position.
//      if (highest_key != me.primary_key) {
//        primary_cursor.continuePrimaryKey(highest_key);
//      }
//      for (var i = 0; i < cursors.length; i++) {
//        if (cmps[i] == 0) {
//          cursors[i].continueEffectiveKey(highest_key);
//        } else if (cmps[i] == -1) {
//          cursors[i].continueEffectiveKey(highest_key);
//        } else {
//          if (!cursors[i].hasCursor()) {
//            cursors[i].continueEffectiveKey(highest_key);
//          } else if (highest_key != cursors[i].getPrimaryKey()) {
//            cursors[i].continueEffectiveKey(highest_key);
//          }
//        }
//      }
//    } else {
//      // all cursors lower than highest_key, seek it.
//      if (me.primary_key != highest_key) {
//        primary_cursor.continueEffectiveKey(highest_key);
//      }
//      for (var i = 0; i < cursors.length; i++) {
//        if (!cursors[i].hasCursor() ||
//            ydn.db.cmp(cursors[i].getPrimaryKey(), highest_key) !== 0) {
//          cursors[i].continueEffectiveKey(highest_key);
//        }
//      }
//    }
//
//  };
//
//  return primary_cursor;
//};


/**
 * Reset the state.
 */
ydn.db.Iterator.prototype.reset = function() {
  if (this.getState() == ydn.db.Iterator.State.WORKING) {
    throw new ydn.error.InvalidOperationError(ydn.db.Iterator.State.WORKING);
  }
  this.counter = 0;
  this.primary_key = undefined;
  this.index_key = undefined;
  this.has_done = undefined;

};

