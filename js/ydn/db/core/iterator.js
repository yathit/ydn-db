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
 * Cursor range iterator.
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
goog.require('ydn.db.core.req.ICursor');
goog.require('ydn.debug.error.ArgumentException');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Create an iterator object.
 * @param {!string} store store name.
 * @param {string=} opt_index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(KeyRangeJson|ydn.db.KeyRange|IDBKeyRange)=} opt_key_range key range.
 * @param {boolean=} opt_reverse reverse.
 * @param {boolean=} opt_unique unique.
 * @param {boolean=} opt_key_only true for key only iterator. Default value is
 * true if index is specified, false if not defined.
 * @constructor
 * @struct
 */
ydn.db.Iterator = function(store, opt_index, opt_key_range, opt_reverse,
                           opt_unique, opt_key_only) {
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
  this.index_name_ = opt_index;
  /**
   * @final
   * @private
   */
  this.is_index_iterator_ = !!this.index_name_;
  /**
   * @final
   * @private
   */
  this.key_only_ = goog.isDef(opt_key_only) ?
      opt_key_only : !!(goog.isString(this.index_name_));
  if (goog.DEBUG && !goog.isBoolean(this.key_only_)) {
    throw new ydn.debug.error.ArgumentException('key_only');
  }

  if (goog.DEBUG && goog.isDef(opt_reverse) && !goog.isBoolean(opt_reverse)) {
    throw new ydn.debug.error.ArgumentException('reverse');
  }
  if (goog.DEBUG && goog.isDef(opt_unique) && !goog.isBoolean(opt_unique)) {
    throw new ydn.debug.error.ArgumentException('unique');
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
   * @type {ydn.db.base.Direction}
   */
  this.direction = direction;

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

  this.peer_store_names_ = [];

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
ydn.db.Iterator.prototype.index_name_;


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
 * @protected
 */
ydn.db.Iterator.prototype.direction;



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
 * @param {*} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {*=} opt_value2 second rvalue to compare.
 * @return {ydn.db.KeyCursors} newly created iterator.
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
 * @param {*} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {*=} opt_value2 second rvalue to compare.
 * @return {ydn.db.Cursors}
 */
ydn.db.Cursors.where = function(store_name, index, op, value, opt_op2,
                                opt_value2) {
  return new ydn.db.Cursors(store_name, index,
      ydn.db.KeyRange.where(op, value, opt_op2, opt_value2));
};



/**
 * Create an iterator object.
 * @param {!string} store store name.
 * @param {(!KeyRangeJson|ydn.db.KeyRange)=} opt_key_range key range.
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
 * @param {*} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {*=} opt_value2 second rvalue to compare.
 * @return {ydn.db.ValueCursors} newly craeted cursor.
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
 * @param {*} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {*=} opt_value2 second rvalue to compare.
 * @return {ydn.db.IndexValueCursors}
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
  INITIAL: 'initial',
  WORKING: 'working',
  RESTING: 'resting',
  COMPLETED: 'completed'
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
  return this.index_name_;
};


/**
 *
 * @return {ydn.db.base.Direction} return store name.
 */
ydn.db.Iterator.prototype.getDirection = function() {
  return this.direction;
};


/**
 * @return {ydn.db.IDBKeyRange} return key range.
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
 * @return {boolean} true if key iterator.
 */
ydn.db.Iterator.prototype.isKeyOnly = function() {
  return this.key_only_;
};


/**
 *
 * @return {boolean} true if index iterator.
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
    'index': this.index_name_,
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
    var idx = goog.isDef(this.index_name_) ? ':' + this.index_name_ : '';
    if (this.cursor_) {
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
      idx = start + this.cursor_ + close;
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
 * Resume from a saved position.
 * @param {IDBKey=} opt_key effective key as start position.
 * @param {IDBKey=} opt_primary_key primary key as start position for index
 * iterator.
 */
ydn.db.Iterator.prototype.resume = function(opt_key, opt_primary_key) {
  throw 'not impl';
};


/**
 *
 * @return {number} number of record iterated.
 */
ydn.db.Iterator.prototype.count = function() {
  return this.cursor_ ? this.cursor_.getCount() : NaN;
};


/**
 *
 * @return {!Array.<string>} list of peer stores.
 */
ydn.db.Iterator.prototype.stores = function() {
  return [this.store_name].concat(this.peer_store_names_);
};


/**
 *
 * @type {Array.<string>}
 * @private
 */
ydn.db.Iterator.prototype.peer_store_names_;


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
 * Degree of iterator is the total number of stores.
 * @return {number} number of peer store.
 */
ydn.db.Iterator.prototype.degree = function() {
  return this.peer_store_names_.length + 1;
};


/**
 *
 * @return {boolean} true if iteration direction is reverse.
 */
ydn.db.Iterator.prototype.isReversed = function() {
  return this.direction === ydn.db.base.Direction.PREV ||
      this.direction === ydn.db.base.Direction.PREV_UNIQUE;
};


/**
 *
 * @return {boolean} true if cursor is iterator unique key.
 */
ydn.db.Iterator.prototype.isUnique = function() {
  return this.direction === ydn.db.base.Direction.NEXT_UNIQUE ||
      this.direction === ydn.db.base.Direction.PREV_UNIQUE;
};


/**
 * Restrict iterator key range by fixed value of a field.
 * @param {string} field_name field name to restrict.
 * @param {IDBKey} value field value.
 * @return {!ydn.db.Iterator} newly created iterator applying given restriction.
 */
ydn.db.Iterator.prototype.restrict = function(field_name, value) {
  goog.asserts.assertString(field_name, 'field name in string require but, "' +
      field_name + '" of type ' + typeof field_name + ' found.');
  goog.asserts.assert(ydn.db.Key.isValidKey(value), 'key value "' +
      ydn.json.toShortString(value) + '" is invalid');
  var key_range;
  var base = [value];
  if (this.key_range_) {
    var lower = goog.isDefAndNotNull(this.key_range_.lower) ?
        base.concat(this.key_range_.lower) : base;
    var upper = goog.isDefAndNotNull(this.key_range_.upper) ?
        base.concat(this.key_range_.upper) : base;
    key_range = new ydn.db.KeyRange(lower, upper,
        !!this.key_range_.lowerOpen, !!this.key_range_.upperOpen);
  } else {
    key_range = ydn.db.KeyRange.only(value);
  }
  var index = field_name;
  if (this.is_index_iterator_) {
    index = [field_name].concat(this.index_name_).join(', ');
  }

  return new ydn.db.Iterator(this.store_name, index, key_range,
      this.isReversed(), this.isUnique(), this.key_only_);
};


/**
 * @param {ydn.db.con.IDatabase.Transaction} tx tx.
 * @param {string} tx_lbl tx label.
 * @param {ydn.db.core.req.IRequestExecutor} executor executor.
 * @param {boolean=} opt_key_query true for keys query method.
 * @return {ydn.db.Cursor} newly created cursor.
 */
ydn.db.Iterator.prototype.iterate = function(tx, tx_lbl, executor,
                                             opt_key_query) {

  var cursor = executor.getCursor(tx, tx_lbl, this.store_name, this.index_name_,
      this.key_range_, this.direction, this.key_only_, !!opt_key_query);

  if (this.cursor_) {
    this.cursor_.resume([cursor]);
    this.logger.finest(tx_lbl + ' ' + this + ' reused cursor ' + this.cursor_);
  } else {
    this.cursor_ = new ydn.db.Cursor([cursor]);
    this.logger.finest(tx_lbl + ' ' + this + ' created ' + this.cursor_);
  }

  return this.cursor_;
};

//
//
///**
// * @param {ydn.db.con.IDatabase.Transaction} tx
// * @param {string} tx_no tx no.
// * @param {ydn.db.core.req.IRequestExecutor} executor
// * @return {ydn.db.core.req.AbstractCursor}
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
//    ini_index_key = this.index_name__key;
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
//  var primary_cursor = executor.getCursor(tx, tx_no, this.store_name, this.index_name_,
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
//      me.index_name__key = key;
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
  this.cursor_ = null;
};

