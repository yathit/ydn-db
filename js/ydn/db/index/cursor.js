/**
 * @fileoverview Front-end cursor.
 */

goog.provide('ydn.db.Cursor');
goog.require('ydn.db.index.req.ICursor');
goog.require('ydn.debug.error.InternalError');
goog.require('goog.debug.Logger');



/**
 *
 * @param {Array.<ydn.db.index.req.ICursor>} cursors
 * @constructor
 */
ydn.db.Cursor = function(cursors) {

  this.cursors_ = cursors;
  this.cached_effective_keys_ = [];
  this.cached_primary_keys_ = [];
  this.values_ = [];
  this.merges_value_ = null;
  this.count_ = 0;
  this.done_ = false;
  this.exited_ = true;
  this.init_();
};


/**
 * @type {Array.<ydn.db.index.req.ICursor>}
 * @private
 */
ydn.db.Cursor.prototype.cursors_ = [];


/**
 * @type {Array.<IDBKey|undefined>} current cursor keys.
 * @private
 */
ydn.db.Cursor.prototype.cached_effective_keys_ = [];


/**
 * @type {Array.<IDBKey|undefined>} current cursor primary keys.
 * @private
 */
ydn.db.Cursor.prototype.cached_primary_keys_ = [];


/**
 * @type {Array.<*>} current cursor values.
 * @private
 */
ydn.db.Cursor.prototype.values_;


/**
 *
 * @type {Object}
 * @private
 */
ydn.db.Cursor.prototype.merges_value_ = null;


/**
 *
 * @type {number}
 * @private
 */
ydn.db.Cursor.prototype.count_ = 0;


/**
 * Done flag is true if one of the cursor lost its position.
 * @type {boolean} done state.
 * @private
 */
ydn.db.Cursor.prototype.done_ = false;


/**
 * Exited flag is true if the iterator is explicitly exited, usually before
 * done flag to true.
 * @type {boolean} exited flag.
 * @private
 */
ydn.db.Cursor.prototype.exited_ = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.Cursor.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.Cursor');


/**
 *
 * @private
 */
ydn.db.Cursor.prototype.init_ = function() {
  var n = this.cursors_.length;
  var result_count = 0;
  var me = this;
  var listenCursor = function(i) {
    var cursor = me.cursors_[i];
    /**
     * On success handler.
     * @param {IDBKey=} opt_key
     * @param {IDBKey=} opt_p_key
     * @param {*=} opt_value
     */
    cursor.onSuccess = function(opt_key, opt_p_key, opt_value) {
      result_count++;
      me.cached_effective_keys_[i] = opt_key;
      me.cached_primary_keys_[i] = opt_p_key;
      me.values_[i] = opt_value;
      if (!goog.isDefAndNotNull(opt_key)) {
        me.done_ = true;
      }
      if (result_count == n) {
        this.count_++;
        if (me.done_) {
          me.onNext();
          me.dispose_();
        } else {
          me.onNext(me.cached_effective_keys_[0]);
        }
        result_count = 0;
      }
    };
    cursor.onError = function(e) {
      me.onFail(e);
      me.dispose_();
      me.done_ = true;
      result_count = 0;
    };
  };
  for (var i = 0; i < n; i++) {
    listenCursor(i);
  }
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} effective key of cursor.
 */
ydn.db.Cursor.prototype.getKey = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cached_effective_keys_[index];
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} primary key of cursor.
 */
ydn.db.Cursor.prototype.getPrimaryKey = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cached_primary_keys_[index];
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {*} value.
 */
ydn.db.Cursor.prototype.getValue = function(opt_idx) {
  var index = opt_idx || 0;
  return this.values_[index];
};


/**
 * Restart the cursor. If previous cursor position is given,
 * the position is skip.
 * @param {IDBKey=} opt_key previous position.
 * @param {IDBKey=} opt_primary_key
 */
ydn.db.Cursor.prototype.restart = function(opt_key, opt_primary_key) {
  this.cursors_[0].restart(opt_primary_key, opt_key);
};


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey=} opt_key primary key position to continue.
 */
ydn.db.Cursor.prototype.continuePrimaryKey = function(opt_key) {
  this.cursors_[0].continuePrimaryKey(opt_key);
};


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} opt_key effective key position to continue.
 */
ydn.db.Cursor.prototype.continueEffectiveKey = function(opt_key) {
  this.cursors_[0].continueEffectiveKey(opt_key);
};


/**
 * Move cursor position to the effective key.
 * @param {number} n number of steps.
 */
ydn.db.Cursor.prototype.advance = function(n) {
  this.cursors_[0].advance(n);
};


/**
 * @param {!Object} obj record value.
 * @param {number=} opt_idx cursor index.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.Cursor.prototype.update = function(obj, opt_idx) {
  var index = opt_idx || 0;
  return this.cursors_[index].update(obj);
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.Cursor.prototype.clear = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cursors_[index].clear();
};


/**
 * This method is overridden by cursor consumer.
 * @param {IDBKey=} opt_key effective key.
 */
ydn.db.Cursor.prototype.onNext = function(opt_key) {
  throw new ydn.debug.error.InternalError();
};


/**
 * This method is overridden by cursor consumer.
 * @param {!Error} e error.
 */
ydn.db.Cursor.prototype.onFail = function(e) {
  throw new ydn.debug.error.InternalError();
};


/**
 *
 * @return {boolean} true if cursor gone.
 */
ydn.db.Cursor.prototype.hasDone = function() {
  return this.done_;
};


/**
 *
 * @return {boolean} true if iteration is existed.
 */
ydn.db.Cursor.prototype.isExited = function() {
  return this.exited_;
};


/**
 * Exit cursor
 */
ydn.db.Cursor.prototype.exit = function() {
  this.exited_ = false;
  this.dispose_();
  this.logger.finest(this + ': exit');
};


/**
 * Dispose cursors and its value.
 * @private
 */
ydn.db.Cursor.prototype.dispose_ = function() {
  // IndexedDB will GC the array, so we clone it.
  this.cached_primary_keys_ = goog.isArrayLike(this.cached_primary_keys_) ?
      goog.array.clone(this.cached_primary_keys_) : this.cached_primary_keys_;
  this.cached_effective_keys_ = goog.isArrayLike(this.cached_effective_keys_) ?
      goog.array.clone(this.cached_effective_keys_) : this.cached_effective_keys_;

  for (var i = 0; i < this.cursors_.length; i++) {
    this.cursors_[i].dispose();
  }
  goog.array.clear(this.values_);
  goog.array.clear(this.cursors_);
};
