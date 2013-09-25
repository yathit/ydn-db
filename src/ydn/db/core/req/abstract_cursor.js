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
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.core.req.AbstractCursor');
goog.require('goog.Disposable');
goog.require('ydn.debug.error.InternalError');



/**
 * Open an index. This will resume depending on the cursor state.
 * @param {ydn.db.con.IDatabase.Transaction} tx tx.
 * @param {string} tx_no tx no.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index name.
 * @param {IDBKeyRange} keyRange key range.
 * @param {ydn.db.base.Direction} direction cursor direction.
 * @param {boolean} is_key_cursor mode.
 * @param {ydn.db.schema.Store.QueryMethod} mth true for keys query method.
 * @constructor
 * @extends {goog.Disposable}
 * @struct
 * @suppress {checkStructDictInheritance} suppress closure-library code.
 */
ydn.db.core.req.AbstractCursor = function(tx, tx_no,
    store_name, index_name, keyRange, direction, is_key_cursor, mth) {
  goog.base(this);
  /**
   * @final
   */
  this.store_name = store_name;
  /**
   * @final
   */
  this.index_name = index_name;
  /**
   * @final
   */
  this.is_index = goog.isString(this.index_name);

  /**
   * @final
   */
  this.key_range = keyRange || null;

  this.tx = tx;

  this.tx_no = tx_no;

  this.count_ = 0;
  /**
   * @type {boolean}
   * @private
   */
  this.done_ = false;
  /**
   * @type {boolean}
   * @private
   */
  this.exited_ = false;

  /**
   * @final
   */
  this.reverse = direction == ydn.db.base.Direction.PREV ||
      direction == ydn.db.base.Direction.PREV_UNIQUE;

  /**
   * @final
   */
  this.unique = direction == ydn.db.base.Direction.NEXT_UNIQUE ||
      direction == ydn.db.base.Direction.PREV_UNIQUE;

  /**
   * @type {ydn.db.base.Direction}
   * @final
   */
  this.dir = direction;

  /**
   * @final
   * @private
   */
  this.is_key_cursor_ = is_key_cursor;

  /**
   * @final
   */
  this.query_method = mth;
  /**
   * @type {IDBKey|undefined}
   * @private
   */
  this.key_ = undefined;
  /**
   * @type {IDBKey|undefined}
   * @private
   */
  this.primary_key_ = undefined;
  /**
   * @type {*}
   * @private
   */
  this.value_ = undefined;

  /**
   * This method is overridden by cursor consumer.
   * @param {IDBKey?=} opt_key effective key.
   */
  this.onNext = function(opt_key) {
    throw new ydn.debug.error.InternalError();
  };

  /**
   * This method is overridden by cursor consumer.
   * @param {Error|SQLError} e error.
   */
  this.onFail = function(e) {
    throw new ydn.debug.error.InternalError();
  };

};
goog.inherits(ydn.db.core.req.AbstractCursor, goog.Disposable);


/**
 * @protected
 * @type {string|undefined}
 */
ydn.db.core.req.AbstractCursor.prototype.index_name;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.is_index;


/**
 * @protected
 * @type {string}
 */
ydn.db.core.req.AbstractCursor.prototype.store_name = '';


/**
 * @protected
 * @type {string}
 */
ydn.db.core.req.AbstractCursor.prototype.dir = '';


/**
 * @protected
 * @type {IDBKeyRange}
 */
ydn.db.core.req.AbstractCursor.prototype.key_range = null;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.unique = false;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.reverse = false;


/**
 * @private
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.is_key_cursor_ = true;


/**
 * @protected
 * @type {ydn.db.schema.Store.QueryMethod}
 */
ydn.db.core.req.AbstractCursor.prototype.query_method;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.AbstractCursor.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.req.AbstractCursor');


/**
 * @param {boolean=} opt_reverse clone in reverse direction.
 * @return {!ydn.db.core.req.AbstractCursor}
 */
ydn.db.core.req.AbstractCursor.prototype.clone = function(opt_reverse) {
  var rev = this.reverse;
  if (opt_reverse) {
    rev = !rev;
  }
  var dir = ydn.db.base.getDirection(rev, this.unique);
  var clone = new ydn.db.core.req.AbstractCursor(this.tx, this.tx_no,
      this.store_name, this.index_name, this.key_range, dir,
      this.is_key_cursor_, this.query_method);
  clone.key_ = this.key_;
  clone.primary_key_ = this.primary_key_;
  return clone;
};


/**
 *
 * @return {boolean} true if transaction is active.
 */
ydn.db.core.req.AbstractCursor.prototype.isActive = function() {
  return !!this.tx;
};


/**
 *
 * @return {boolean} return true if this is an index cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.isIndexCursor = function() {
  return this.is_index;
};


/**
 *
 * @return {boolean} return true if this is an index cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.isPrimaryCursor = function() {
  return !this.is_index;
};


/**
 *
 * @return {boolean} return true if this is an value cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.isValueCursor = function() {
  return !this.is_key_cursor_;
};


/**
 * Callback on request error.
 * @param {Error|SQLError} e error object.
 */
ydn.db.core.req.AbstractCursor.prototype.onError = function(e) {
  this.onFail(e);
  this.finalize_();
  this.done_ = true;
};


/**
 * Move cursor to a given position by primary key.
 *
 * This will iterate the cursor records until the primary key is found without
 * changing index key. If index has change during iteration, this will invoke
 * onNext callback with resulting value. If given primary key is in wrong
 * direction, this will rewind and seek.
 *
 * Return value of:
 *   undefined : will invoke onNext
 *   null      : don't do anything
 *   *         : seek to given primary key value, not invoke onNext.
 *   true      : continue next cursor position, not invoke onNext
 *   false     : restart the cursor, not invoke onNext.
 *
 * @param {IDBKey=} opt_key
 * @param {IDBKey=} opt_primary_key
 * @param {*=} opt_value
 * @final
 */
ydn.db.core.req.AbstractCursor.prototype.onSuccess = function(
    opt_key, opt_primary_key, opt_value) {
  // console.log(this.count_, opt_key, opt_primary_key, opt_value);
  if (!goog.isDefAndNotNull(opt_key)) {
    this.logger.finer(this + ' finished.');
    this.done_ = true;
  }
  this.key_ = opt_key;
  this.primary_key_ = opt_primary_key;
  this.value_ = opt_value;

  this.count_++;
  if (this.done_) {
    this.logger.finest(this + ' DONE.');
    this.onNext();
    this.finalize_();
  } else {
    var key_str = goog.isDefAndNotNull(this.primary_key_) ?
        this.key_ + ', ' + this.primary_key_ : this.key_;
    this.logger.finest(this + ' new cursor position {' + key_str + '}');
    this.onNext(this.key_);
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.AbstractCursor.prototype.disposeInternal = function() {
  this.tx = null;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.core.req.AbstractCursor.prototype.toString = function() {
    var index = goog.isDef(this.index_name) ? ':' + this.index_name : '';
    var active = this.tx ? '' : '~';
    return 'Cursor:' + this.store_name +
        index + '[' + active + this.tx_no + ']';
  };
}


/**
 * Copy keys from cursors before browser GC them, as cursor lift-time expires.
 * http://www.w3.org/TR/IndexedDB/#dfn-transaction-lifetime
 * Keys are used to resume cursors position.
 * @private
 */
ydn.db.core.req.AbstractCursor.prototype.finalize_ = function() {
  // IndexedDB will GC array keys, so we clone it.
  if (goog.isDefAndNotNull(this.primary_key_)) {
    this.primary_key_ = ydn.db.Key.clone(this.primary_key_);
  } else {
    this.primary_key_ = undefined;
  }
  if (goog.isDefAndNotNull(this.key_)) {
    this.key_ = ydn.db.Key.clone(this.key_);
  } else {
    this.key_ = undefined;
  }
};


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {IDBKey=} opt_ini_key effective key to resume position.
 * @param {IDBKey=} opt_ini_primary_key primary key to resume position.
 */
ydn.db.core.req.AbstractCursor.prototype.openCursor = goog.abstractMethod;


/**
 * Resume cursor.
 * @param {ydn.db.con.IDatabase.Transaction} tx tx.
 * @param {string} tx_no tx no.
 * @final
 */
ydn.db.core.req.AbstractCursor.prototype.resume = function(tx, tx_no) {
  this.tx = tx;
  this.tx_no = tx_no;
  this.exited_ = false;
  if (this.done_) {
    this.key_ = undefined;
    this.primary_key_ = undefined;
  }
  this.done_ = false;
  this.openCursor(this.key_, this.primary_key_);
};


/**
 * Exit cursor
 */
ydn.db.core.req.AbstractCursor.prototype.exit = function() {
  this.exited_ = true;
  this.logger.finest(this + ': exit');
  this.finalize_();
};


/**
 * @return {number} Number of steps iterated.
 */
ydn.db.core.req.AbstractCursor.prototype.getCount = function() {
  return this.count_;
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} effective key of cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.getKey = function(opt_idx) {
  return this.key_;
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} primary key of cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.getPrimaryKey = function(opt_idx) {
  return this.isIndexCursor() ?
      this.primary_key_ : this.key_;
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {*} value.
 */
ydn.db.core.req.AbstractCursor.prototype.getValue = function(opt_idx) {
  return this.isValueCursor() ?
      this.value_ : this.getPrimaryKey();
};


/**
 *
 * @return {boolean} true if cursor gone.
 */
ydn.db.core.req.AbstractCursor.prototype.hasDone = function() {
  return this.done_;
};


/**
 *
 * @return {boolean} true if iteration is existed.
 */
ydn.db.core.req.AbstractCursor.prototype.isExited = function() {
  return this.exited_;
};


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey} primary_key primary key position to continue.
 */
ydn.db.core.req.AbstractCursor.prototype.continuePrimaryKey =
    function(primary_key) {};


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} opt_effective_key effective key position to continue.
 */
ydn.db.core.req.AbstractCursor.prototype.continueEffectiveKey =
    function(opt_effective_key) {};


/**
 * Move cursor position to the effective key.
 * @param {number} number_of_step
 */
ydn.db.core.req.AbstractCursor.prototype.advance = function(number_of_step) {};


/**
 * Restart the cursor. If previous cursor position is given,
 * the position is skip.
 * @param {IDBKey=} effective_key previous position.
 * @param {IDBKey=} primary_key
 * @final
 */
ydn.db.core.req.AbstractCursor.prototype.restart = function(
    effective_key, primary_key) {
  this.logger.finest(this + ' restarting');
  this.done_ = false;
  this.exited_ = false;
  this.openCursor(primary_key, effective_key);
};

