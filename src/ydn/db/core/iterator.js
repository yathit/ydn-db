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
 * @fileoverview Cursor range iterator iterates cursor of an index or an
 * object store.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
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
goog.require('ydn.db.core.EquiJoin');
goog.require('ydn.db.core.req.ICursor');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Create an iterator object.
 * @param {!string} store store name.
 * @param {string=} opt_index store field, where key query is preformed.
 * @param {(KeyRangeJson|ydn.db.KeyRange|IDBKeyRange)=} opt_key_range key range.
 * @param {boolean=} opt_reverse reverse.
 * @param {boolean=} opt_unique unique.
 * @param {boolean=} opt_key_only true for key only iterator. Default value is
 * true if index is specified, false if not defined.
 * @param {(!Array.<string>|string)=} opt_index_key_path index key path. If
 * key path is specified, key path is used to lookup the index instead of
 * index name.
 * @constructor
 * @struct
 */
ydn.db.Iterator = function(store, opt_index, opt_key_range, opt_reverse,
                           opt_unique, opt_key_only, opt_index_key_path) {
  // Note for V8 optimization, declare all properties in constructor.
  if (goog.DEBUG && !goog.isString(store)) {
    throw new TypeError('store name');
  }

  /**
   * Store name.
   * @final
   * @private
   */
  this.store_name_ = store;

  /**
   * Indexed field.
   * @final
   * @private
   */
  this.index_name_ = opt_index;
  /**
   * @final
   * @private
   */
  this.index_key_path_ = opt_index_key_path;
  /**
   * @final
   * @private
   */
  this.is_index_iterator_ = !!this.index_name_;
  /**
   * @final
   * @private
   */
  this.is_key_iterator_ = goog.isDef(opt_key_only) ?
      opt_key_only : !!(goog.isString(this.index_name_));
  if (goog.DEBUG && !goog.isBoolean(this.is_key_iterator_)) {
    throw new TypeError('key_only');
  }

  if (goog.DEBUG && goog.isDef(opt_reverse) && !goog.isBoolean(opt_reverse)) {
    throw new TypeError('reverse');
  }
  if (goog.DEBUG && goog.isDef(opt_unique) && !goog.isBoolean(opt_unique)) {
    throw new TypeError('unique');
  }
  var direction = ydn.db.base.Direction.NEXT;
  if (opt_reverse && opt_unique) {
    direction = ydn.db.base.Direction.PREV_UNIQUE;
  } else if (opt_reverse) {
    direction = ydn.db.base.Direction.PREV;
  } else if (opt_unique) {
    direction = ydn.db.base.Direction.NEXT_UNIQUE;
  }

  /**
   * @final
   * @private
   */
  this.direction_ = direction;

  if (goog.DEBUG) {
    var msg = ydn.db.KeyRange.validate(opt_key_range);
    if (msg) {
      throw new ydn.debug.error.ArgumentException('Invalid key range: ' + msg);
    }
  }
  /**
   * @final
   * @private
   */
  this.key_range_ = ydn.db.KeyRange.parseIDBKeyRange(opt_key_range);

  /**
   * transient properties during cursor iteration
   * @type {ydn.db.Cursor}
   * @private
   */
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
ydn.db.Iterator.prototype.store_name_;


/**
 * @type {string|undefined}
 * @private
 */
ydn.db.Iterator.prototype.index_name_;


/**
 * Composite index iterator build by using restrict do not have index name,
 * instead index has to be lookup by this index key path. If this is defined,
 * #index_name_ will be undefined and vise versa.
 * @type {!Array.<string>|string|undefined}
 * @private
 */
ydn.db.Iterator.prototype.index_key_path_;


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
ydn.db.Iterator.prototype.is_key_iterator_ = true;


/**
 * Cursor direction.
 * @type {(ydn.db.base.Direction)}
 * @private
 */
ydn.db.Iterator.prototype.direction_;



/**
 * Create an iterator object.
 * @param {string} store store name.
 * @param {(!KeyRangeJson|ydn.db.KeyRange)=} opt_key_range key range.
 * @param {boolean=} opt_reverse reverse.
 * @constructor
 * @extends {ydn.db.Iterator}
 */
ydn.db.KeyCursors = function(store, opt_key_range, opt_reverse) {
  if (arguments.length > 3) {
    throw new ydn.debug.error.ArgumentException('too many argument');
  }
  goog.base(this, store, undefined, opt_key_range, opt_reverse,
      undefined, true);
};
goog.inherits(ydn.db.KeyCursors, ydn.db.Iterator);


/**
 * Create a new key cursor iterator.
 * @param {string} store_name store name.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.KeyCursors} newly created iterator.
 */
ydn.db.KeyCursors.where = function(store_name, op, value, opt_op2, opt_value2) {
  return new ydn.db.KeyCursors(store_name,
      ydn.db.KeyRange.where(op, value, opt_op2, opt_value2));
};



/**
 * Create an iterator object.
 * @param {string} store store name.
 * @param {string} index index name.
 * @param {(KeyRangeJson|ydn.db.KeyRange|IDBKeyRange)=} opt_key_range key range.
 * @param {boolean=} opt_reverse reverse.
 * @param {boolean=} opt_unique unique.
 * @constructor
 * @extends {ydn.db.Iterator}
 */
ydn.db.Cursors = function(store, index, opt_key_range, opt_reverse,
                          opt_unique) {
  if (!goog.isString(index)) {
    throw new ydn.debug.error.ArgumentException('index name must be string');
  }
  goog.base(this, store, index, opt_key_range, opt_reverse, opt_unique, true);
};
goog.inherits(ydn.db.Cursors, ydn.db.Iterator);


/**
 * Create an iterator object.
 * @param {string} store_name store name.
 * @param {string} index index name.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.Cursors}
 */
ydn.db.Cursors.where = function(store_name, index, op, value, opt_op2,
                                opt_value2) {
  return new ydn.db.Cursors(store_name, index,
      ydn.db.KeyRange.where(op, value, opt_op2, opt_value2));
};



/**
 * Create an iterator object.
 * @param {!string} store store name.
 * @param {(KeyRangeJson|ydn.db.KeyRange|IDBKeyRange)=} opt_key_range key range.
 * @param {boolean=} opt_reverse reverse.
 * @constructor
 * @extends {ydn.db.Iterator}
 */
ydn.db.ValueCursors = function(store, opt_key_range, opt_reverse) {
  if (arguments.length > 3) {
    throw new ydn.debug.error.ArgumentException('too many argument');
  }
  goog.base(this, store, undefined, opt_key_range, opt_reverse, undefined,
      false);
};
goog.inherits(ydn.db.ValueCursors, ydn.db.Iterator);


/**
 * Create a new value cursor range iterator using where clause condition.
 * @param {string} store_name store name.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.ValueCursors} newly craeted cursor.
 */
ydn.db.ValueCursors.where = function(store_name, op, value, opt_op2,
                                     opt_value2) {
  return new ydn.db.ValueCursors(store_name,
      ydn.db.KeyRange.where(op, value, opt_op2, opt_value2));
};



/**
 * Create an iterator object.
 * @param {!string} store store name.
 * @param {string} index index name.
 * @param {(KeyRangeJson|ydn.db.KeyRange|IDBKeyRange)=} opt_key_range key range.
 * @param {boolean=} opt_reverse reverse.
 * @param {boolean=} opt_unique unique.
 * @constructor
 * @extends {ydn.db.Iterator}
 */
ydn.db.IndexValueCursors = function(store, index, opt_key_range, opt_reverse,
                                    opt_unique) {
  if (!goog.isString(index)) {
    throw new ydn.debug.error.ArgumentException('index name must be string');
  }
  goog.base(this, store, index, opt_key_range, opt_reverse, opt_unique, false);
};
goog.inherits(ydn.db.IndexValueCursors, ydn.db.Iterator);


/**
 *
 * @param {string} store_name store name.
 * @param {string} index index name.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.IndexValueCursors}
 */
ydn.db.IndexValueCursors.where = function(store_name, index, op, value, opt_op2,
                                          opt_value2) {
  return new ydn.db.IndexValueCursors(store_name, index,
      ydn.db.KeyRange.where(op, value, opt_op2, opt_value2));
};


/**
 * Iterator state.
 * @enum {string}
 */
ydn.db.Iterator.State = {
  INITIAL: 'init',
  WORKING: 'busy',
  RESTING: 'rest',
  COMPLETED: 'done'
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
  return this.store_name_;
};


/**
 *
 * @return {string|undefined} return store name.
 */
ydn.db.Iterator.prototype.getIndexName = function() {
  return this.index_name_;
};


/**
 *
 * @return {ydn.db.base.Direction} return store name.
 */
ydn.db.Iterator.prototype.getDirection = function() {
  return this.direction_;
};


/**
 * This is for friendly module use only, that does not mutate the key range.
 * otherwise use @see #getKeyRange
 * @return {ydn.db.IDBKeyRange} return key range instance.
 */
ydn.db.Iterator.prototype.keyRange = function() {
  return this.key_range_;
};


/**
 *
 * @return {boolean} true if this iterator has key range restriction.
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
      return this.key_range_; // none mutable key range.
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
 * @return {boolean} <code>true</code> if key iterator, <code>false</code>
 * if value iterator.
 */
ydn.db.Iterator.prototype.isKeyIterator = function() {
  return this.is_key_iterator_;
};


/**
 * @return {boolean} <code>true</code> if value iterator, <code>false</code>
 * if key iterator.
 */
ydn.db.Iterator.prototype.isValueIterator = function() {
  return !this.is_key_iterator_;
};


/**
 *
 * @return {boolean} true if index iterator.
 */
ydn.db.Iterator.prototype.isIndexIterator = function() {
  return this.is_index_iterator_;
};


/**
 * @return {boolean} true for primary iterator, which use primary key as
 * effective key.
 */
ydn.db.Iterator.prototype.isPrimaryIterator = function() {
  return !this.is_index_iterator_;
};


/**
 * @return {!ydn.db.Iterator}
 */
ydn.db.Iterator.prototype.clone = function() {
  return new ydn.db.Iterator(this.store_name_, this.index_name_,
      this.key_range_, this.isReversed(), this.isUnique(), this.isKeyIterator(),
      this.index_key_path_);
};


if (goog.DEBUG) {

  /**
   * @inheritDoc
   */
  ydn.db.Iterator.prototype.toJSON = function() {
    return {
      'store': this.store_name_,
      'index': this.index_name_,
      'keyRange': this.key_range_ ?
          ydn.db.KeyRange.toJSON(this.key_range_) : null,
      'direction': this.direction_
    };
  };

  /**
   * @override
   */
  ydn.db.Iterator.prototype.toString = function() {
    var str = goog.isDef(this.index_key_path_) ?
        ':' + this.index_key_path_.join(',') :
            goog.isDef(this.index_name_) ? ':' + this.index_name_ : '';
    str += ydn.db.KeyRange.toString(this.key_range_);
    var s = this.isIndexIterator() ? 'Index' : '';
    s += this.isKeyIterator() ? 'Key' : 'Value';
    return s + 'Iterator:' + this.store_name_ + str;
  };
}


/**
 * Resume from a saved position.
 * @param {IDBKey} key effective key as start position.
 * @param {IDBKey=} opt_primary_key primary key as start position for index
 * iterator.
 * @return {ydn.db.Iterator}
 */
ydn.db.Iterator.prototype.resume = function(key, opt_primary_key) {
  var iter = new ydn.db.Iterator(this.store_name_, this.index_name_,
      this.key_range_, this.isReversed(), this.isUnique(),
      this.is_key_iterator_, this.index_key_path_);
  iter.cursor_ = new ydn.db.Cursor([], null, key, opt_primary_key);
  return iter;
};


/**
 * Resume from a saved position.
 * @param {IDBKey=} opt_key effective key as start position.
 * @param {IDBKey=} opt_primary_key primary key as start position for index
 * iterator.
 * @return {ydn.db.Iterator}
 */
ydn.db.Iterator.prototype.reverse = function(opt_key, opt_primary_key) {
  var iter = new ydn.db.Iterator(this.store_name_, this.index_name_,
      this.key_range_, !this.isReversed(), this.isUnique(),
      this.is_key_iterator_, this.index_key_path_);
  if (goog.isDefAndNotNull(opt_key)) {
    iter.cursor_ = new ydn.db.Cursor([], null, opt_key, opt_primary_key);
  }
  return iter;
};


/**
 *
 * @return {boolean} true if iteration direction is reverse.
 */
ydn.db.Iterator.prototype.isReversed = function() {
  return this.direction_ === ydn.db.base.Direction.PREV ||
      this.direction_ === ydn.db.base.Direction.PREV_UNIQUE;
};


/**
 *
 * @return {boolean} true if cursor is iterator unique key.
 */
ydn.db.Iterator.prototype.isUnique = function() {
  return this.direction_ === ydn.db.base.Direction.NEXT_UNIQUE ||
      this.direction_ === ydn.db.base.Direction.PREV_UNIQUE;
};


/**
 * Return next key range.
 * @return {IDBKeyRange}
 */
ydn.db.Iterator.prototype.getNextKeyRange = function() {
  return this.key_range_;
};


/**
 *
 * @return {ydn.db.Iterator.State} iterator state.
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
 * @param {ydn.db.con.IDatabase.Transaction} tx tx.
 * @param {string} tx_lbl tx label.
 * @param {ydn.db.core.req.IRequestExecutor} executor executor.
 * @param {ydn.db.schema.Store.QueryMethod=} opt_query query method.
 * @return {ydn.db.Cursor} newly created cursor.
 */
ydn.db.Iterator.prototype.iterate = function(tx, tx_lbl, executor,
                                             opt_query) {

  var query_mth = opt_query || ydn.db.schema.Store.QueryMethod.VALUES;
  var cursor = executor.getCursor(tx, tx_lbl, this.store_name_,
      this.index_key_path_ || this.index_name_,
      this.key_range_, this.direction_, this.is_key_iterator_, query_mth);
  var cursors = [cursor];
  var cursor_ = new ydn.db.Cursor(cursors);

  this.logger.finest(tx_lbl + ' ' + this + ' created ');
  return cursor_;
};


/**
 *
 * @return {*|undefined} Current cursor key.
 */
ydn.db.Iterator.prototype.getKey = function() {
  return this.cursor_ ? this.cursor_.getKey() : undefined;
};


/**
 *
 * @return {*|undefined} Current cursor index key.
 */
ydn.db.Iterator.prototype.getPrimaryKey = function() {
  return this.cursor_ ? this.cursor_.getPrimaryKey() : undefined;
};


/**
 * Reset the state.
 */
ydn.db.Iterator.prototype.reset = function() {
  if (this.getState() == ydn.db.Iterator.State.WORKING) {
    throw new ydn.error.InvalidOperationError(ydn.db.Iterator.State.WORKING);
  }
  this.cursor_ = null;
};


/**
 *
 * @return {!Array.<string>} list of stores.
 */
ydn.db.Iterator.prototype.stores = function() {
  var stores = [this.store_name_];
  /*
  if (this.joins_) {
    for (var i = 0; i < this.joins_.length; i++) {
      if (!goog.array.contains(stores, this.joins_[i].store_name)) {
        stores.push(this.joins_[i].store_name);
      }
    }
  }
  */
  return stores;
};
