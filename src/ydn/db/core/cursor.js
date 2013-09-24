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
 * @fileoverview Front-end cursor managing cursors of an iterator.
 *
 * Iterator give raise to a front-end cursor which comprise joining of multiple
 * physical cursors (ydn.db.core.req.ICursor).
 *
 * Unlike physical cursors, front-end cursor has persistent position, which is
 * achieve by providing initial condition from the iterator.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Cursor');
goog.require('goog.debug.Logger');
goog.require('ydn.db');
goog.require('ydn.db.core.req.ICursor');
goog.require('ydn.debug.error.InternalError');



/**
 * Create a new front-end cursor object.
 * @param {Array.<ydn.db.core.req.ICursor>} cursors cursors.
 * @param {ydn.db.Cursor=} opt_prev_cursor previous cursor, to resume cursor
 * location.
 * @param {IDBKey=} opt_key start position.
 * @param {IDBKey=} opt_primary_key start position.
 * @constructor
 * @struct
 */
ydn.db.Cursor = function(cursors, opt_prev_cursor, opt_key, opt_primary_key) {

  this.cursors_ = cursors;
  this.keys_ = [];
  this.primary_keys_ = [];
  this.values_ = [];
  this.count_ = 0;
  this.done_ = false;
  this.exited_ = false;

  if (opt_prev_cursor) {
    this.keys_ = goog.array.clone(opt_prev_cursor.keys_);
    this.primary_keys_ = goog.array.clone(opt_prev_cursor.primary_keys_);
  }
  if (goog.isDefAndNotNull(opt_key)) {
    this.keys_[0] = opt_key;
  }
  if (goog.isDefAndNotNull(opt_primary_key)) {
    this.primary_keys_[0] = opt_primary_key;
  }

  /**
   * This method is overridden by cursor consumer.
   * @param {IDBKey?=} opt_key effective key.
   */
  this.onNext = function(opt_key) {
    throw new ydn.debug.error.InternalError();
  };

  /**
   * This method is overridden by cursor consumer.
   * @param {!Error} e error.
   */
  this.onFail = function(e) {
    throw new ydn.debug.error.InternalError();
  };

  if (this.cursors_.length > 0) {
    this.init_();
  }
};


/**
 *
 * @define {boolean} debug flag.
 */
ydn.db.Cursor.DEBUG = false;


/**
 * @type {Array.<ydn.db.core.req.ICursor>}
 * @private
 */
ydn.db.Cursor.prototype.cursors_;


/**
 * @type {Array.<IDBKey|undefined>} current cursor keys.
 * @private
 */
ydn.db.Cursor.prototype.keys_;


/**
 * @type {Array.<IDBKey|undefined>} current cursor primary keys.
 * @private
 */
ydn.db.Cursor.prototype.primary_keys_;


/**
 * @type {Array.<*>} current cursor values.
 * @private
 */
ydn.db.Cursor.prototype.values_;


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
ydn.db.Cursor.prototype.logger = goog.debug.Logger.getLogger('ydn.db.Cursor');


/**
 * Open single cursor.
 * @param {ydn.db.core.req.ICursor} cursor
 * @private
 */
ydn.db.Cursor.prototype.openSingle_ = function(cursor) {
  var me = this;
  var i = 0;
  /**
   * On success handler.
   * @param {IDBKey=} opt_key effective key.
   * @param {IDBKey=} opt_p_key primary key.
   * @param {*=} opt_value reference value.
   * @this {ydn.db.core.req.ICursor}
   */
  cursor.onSuccess = function(opt_key, opt_p_key, opt_value) {
    //console.log([result_count, opt_key, opt_p_key]);
    if (!goog.isDefAndNotNull(opt_key)) {
      me.logger.finest('cursor ' + cursor + ' finished.');
      me.done_ = true;
    }
    me.keys_[i] = opt_key;
    me.primary_keys_[i] = opt_p_key;
    me.values_[i] = opt_value;

    me.count_++;
    if (me.done_) {
      me.logger.finest(me + ' DONE.');
      me.onNext();
      me.finalize_();
    } else {
      var key_str = goog.isDefAndNotNull(me.primary_keys_[0]) ?
          me.keys_[0] + ', ' + me.primary_keys_[0] : me.keys_[0];
      me.logger.finest(me + ' new cursor position {' + key_str + '}');
      me.onNext(me.keys_[0]);
    }

  };
  /**
   * On error handler.
   * @param {!Error} e error.
   * @this {ydn.db.core.req.ICursor}
   */
  cursor.onError = function(e) {
    me.onFail(e);
    me.finalize_();
    me.done_ = true;
  };

  // if there is previous position, the cursor must advance over previous
  // position.
  var pk_str = goog.isDefAndNotNull(me.primary_keys_[i]) ?
      ', ' + me.primary_keys_[i] : '';
  pk_str = goog.isDefAndNotNull(me.keys_[i]) ? ' resume from {' +
      me.keys_[i] + pk_str + '}' : '';
  me.logger.finest(cursor + pk_str + ' opening');
  cursor.openCursor(me.keys_[i], me.primary_keys_[i]);
};


/**
 * Open cursors for joining primary keys.
 * Base cursor is primary cursor, meaning that its effective key is primary.
 * Other cursors may not may not be primary cursor. In any case, we will join
 * primary key instead.
 * The algorithm is sorted merge join, except different primary key retrieval.
 * @private
 */
ydn.db.Cursor.prototype.openPrimaryKeyMerge_ = function() {
  var total = this.cursors_.length;
  var result_count = 0;
  var primary_keys = [];
  var me = this;
  var listenCursor = function(i_cursor) {
    /**
     * @type {ydn.db.core.req.ICursor}
     */
    var cursor = me.cursors_[i_cursor];
    /**
     * On success handler.
     * @param {IDBKey=} opt_key effective key.
     * @param {IDBKey=} opt_p_key primary key.
     * @param {*=} opt_value reference value.
     * @this {ydn.db.core.req.ICursor}
     */
    cursor.onSuccess = function(opt_key, opt_p_key, opt_value) {
      result_count++;
      if (ydn.db.Cursor.DEBUG) {
        window.console.log(me + ' receiving result "' + opt_key + '" from ' +
            i_cursor + ' of ' + result_count + '/' + total + ' ' + cursor);
      }
      //console.log([result_count, opt_key, opt_p_key]);
      if (!goog.isDefAndNotNull(opt_key)) {
        me.logger.finest('cursor ' + cursor + ' finished.');
        me.done_ = true;
      }
      me.keys_[i_cursor] = opt_key;
      me.primary_keys_[i_cursor] = opt_p_key;
      me.values_[i_cursor] = opt_value;
      if (!cursor.isIndexCursor()) {
        primary_keys[i_cursor] = opt_key;
      } else {
        primary_keys[i_cursor] = opt_p_key;
      }
      if (result_count == total) {
        // all cursor results are ready
        result_count = 0;
        if (me.done_) {
          me.count_++;
          me.logger.finest(me + ' DONE.');
          me.onNext();
          me.finalize_();
        } else {
          // to get successful step, all primary key must be same.
          var max_key = primary_keys.reduce(function(p, c) {
            if (goog.isNull(p)) {
              return c;
            } else {
              return ydn.db.cmp(c, p) == 1 ? c : p;
            }
          }, null);
          if (ydn.db.cmp(max_key, primary_keys[0]) == 0) {
            // all keys are equal, hence we get matching key result.
            var key_str = goog.isDefAndNotNull(me.primary_keys_[0]) ?
                me.keys_[0] + ', ' + me.primary_keys_[0] : me.keys_[0];
            me.logger.finest(me + ' new cursor position {' + key_str + '}');
            me.onNext(me.keys_[0]);
          } else {
            // request behind cursor to max key position.
            for (var i = 0; i < total; i++) {
              if (ydn.db.cmp(primary_keys[i], max_key) == -1) {
                var cur = me.cursors_[i];
                if (!cur.isIndexCursor()) {
                  cur.continueEffectiveKey(max_key);
                } else {
                  cur.continuePrimaryKey(max_key);
                }
              } else {
                result_count++;
              }
            }
          }
        }
        goog.array.clear(primary_keys);
      }
    };
    /**
     * On error handler.
     * @param {!Error} e error.
     * @this {ydn.db.core.req.ICursor}
     */
    cursor.onError = function(e) {
      me.onFail(e);
      me.finalize_();
      me.done_ = true;
      result_count = 0;
    };

    // if there is previous position, the cursor must advance over previous
    // position.
    var pk_str = goog.isDefAndNotNull(me.primary_keys_[i_cursor]) ?
        ', ' + me.primary_keys_[i_cursor] : '';
    pk_str = goog.isDefAndNotNull(me.keys_[i_cursor]) ? ' resume from {' +
        me.keys_[i_cursor] + pk_str + '}' : '';
    me.logger.finest(cursor + pk_str + ' opening');
    cursor.openCursor(me.keys_[i_cursor], me.primary_keys_[i_cursor]);
  };
  for (var i = 0; i < total; i++) {
    listenCursor(i);
  }
};


/**
 * Open cursors for joining secondary keys.
 * Base cursor is index cursor, meaning that its effective key is secondary key.
 * Other cursors may not may not be index cursor. In any case, we will join
 * primary key instead.
 * The algorithm is zigzag merge join, except different index key retrieval.
 * @private
 */
ydn.db.Cursor.prototype.openSecondaryKeyMerge_ = function() {
  var total = this.cursors_.length;
  var result_count = 0;
  var keys = [];
  var primary_keys = [];
  var me = this;
  var listenCursor = function(i_cursor) {
    /**
     * @type {ydn.db.core.req.ICursor}
     */
    var cursor = me.cursors_[i_cursor];
    /**
     * On success handler.
     * @param {IDBKey=} opt_key effective key.
     * @param {IDBKey=} opt_p_key primary key.
     * @param {*=} opt_value reference value.
     * @this {ydn.db.core.req.ICursor}
     */
    cursor.onSuccess = function(opt_key, opt_p_key, opt_value) {
      result_count++;
      if (ydn.db.Cursor.DEBUG) {
        window.console.log(me + ' receiving result "' + opt_key + '" from ' +
            i_cursor + '/' + total + ' ' + cursor);
      }
      //console.log([result_count, opt_key, opt_p_key]);
      if (!goog.isDefAndNotNull(opt_key)) {
        me.logger.finest('cursor ' + cursor + ' finished.');
        me.done_ = true;
      }
      me.keys_[i_cursor] = opt_key;
      me.primary_keys_[i_cursor] = opt_p_key;
      me.values_[i_cursor] = opt_value;
      if (!cursor.isIndexCursor()) {
        primary_keys[i_cursor] = opt_key;
      } else {
        primary_keys[i_cursor] = opt_p_key;
      }
      if (result_count == total) {
        // all cursor results are ready
        if (me.done_) {
          me.count_++;
          me.logger.finest(me + ' DONE.');
          me.onNext();
          me.finalize_();
        } else {
          // to get successful step, all primary key must be same.
          var max_key = primary_keys.reduce(function(p, c) {
            if (goog.isNull(p)) {
              return c;
            } else {
              return ydn.db.cmp(c, p) == 1 ? c : p;
            }
          }, null);
          if (ydn.db.cmp(max_key, primary_keys[0]) == 0) {
            // all keys are equal, hence we get matching key result.
            var key_str = goog.isDefAndNotNull(me.primary_keys_[0]) ?
                me.keys_[0] + ', ' + me.primary_keys_[0] : me.keys_[0];
            me.logger.finest(me + ' new cursor position {' + key_str + '}');
            me.onNext(me.keys_[0]);
          } else {
            // request behind cursor to max key position.
            for (var i = 0; i < total; i++) {
              if (ydn.db.cmp(primary_keys[i], max_key) == -1) {
                var cur = me.cursors_[i];
                if (!cur.isIndexCursor()) {
                  cur.continueEffectiveKey(max_key);
                } else {
                  cur.continuePrimaryKey(max_key);
                }
              }
            }
          }
        }
        result_count = 0;
        goog.array.clear(primary_keys);
      }
    };
    /**
     * On error handler.
     * @param {!Error} e error.
     * @this {ydn.db.core.req.ICursor}
     */
    cursor.onError = function(e) {
      me.onFail(e);
      me.finalize_();
      me.done_ = true;
      result_count = 0;
    };

    // if there is previous position, the cursor must advance over previous
    // position.
    var pk_str = goog.isDefAndNotNull(me.primary_keys_[i_cursor]) ?
        ', ' + me.primary_keys_[i_cursor] : '';
    pk_str = goog.isDefAndNotNull(me.keys_[i_cursor]) ? ' resume from {' +
        me.keys_[i_cursor] + pk_str + '}' : '';
    me.logger.finest(cursor + pk_str + ' opening');
    cursor.openCursor(me.keys_[i_cursor], me.primary_keys_[i_cursor]);
  };
  for (var i = 0; i < total; i++) {
    listenCursor(i);
  }
};


/**
 *
 * @private
 */
ydn.db.Cursor.prototype.init_ = function() {
  var n = this.cursors_.length;
  if (ydn.db.Cursor.DEBUG) {
    this.logger.finest('Initializing ' + n + ' cursors');
  }
  if (n == 1) {
    this.openSingle_(this.cursors_[0]);
  } else if (n > 1) {
    this.openPrimaryKeyMerge_();
  } else {
    throw new ydn.debug.error.InternalError('no cursors');
  }
};


/**
 * @return {number} Number of steps iterated.
 */
ydn.db.Cursor.prototype.getCount = function() {
  return this.count_;
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} effective key of cursor.
 */
ydn.db.Cursor.prototype.getKey = function(opt_idx) {
  var index = opt_idx || 0;
  return this.keys_[index];
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} primary key of cursor.
 */
ydn.db.Cursor.prototype.getPrimaryKey = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cursors_[index].isIndexCursor() ?
      this.primary_keys_[index] : this.keys_[index];
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {*} value.
 */
ydn.db.Cursor.prototype.getValue = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cursors_[index].isValueCursor() ?
      this.values_[index] : this.getPrimaryKey(index);
};


/**
 * Restart the cursor. If previous cursor position is given,
 * the position is skip.
 * @param {IDBKey=} opt_key previous position.
 * @param {IDBKey=} opt_primary_key primary key.
 */
ydn.db.Cursor.prototype.restart = function(opt_key, opt_primary_key) {
  this.done_ = false;
  this.cursors_[0].restart(opt_primary_key, opt_key);
};


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey} key primary key position to continue.
 */
ydn.db.Cursor.prototype.continuePrimaryKey = function(key) {
  // console.log(this + ' continuePrimaryKey ' + key)
  this.cursors_[0].continuePrimaryKey(key);
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
  for (var i = 0; i < this.cursors_.length; i++) {
    this.cursors_[i].advance(n);
  }
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
  this.exited_ = true;
  this.logger.finest(this + ': exit');
  this.finalize_();
  this.dispose_();
};


/**
 *  Copy keys from cursors before dispose them and dispose cursors and
 *  its reference value. Keys are used to resume cursors position.
 * @private
 */
ydn.db.Cursor.prototype.finalize_ = function() {

  // IndexedDB will GC array keys, so we clone it.
  this.primary_keys_ = goog.array.map(this.primary_keys_, function(x) {
    if (goog.isDefAndNotNull(x)) {
      return ydn.db.Key.clone(x);
    } else {
      return undefined;
    }
  });
  this.keys_ = goog.array.map(this.keys_, function(x) {
    if (goog.isDefAndNotNull(x)) {
      return ydn.db.Key.clone(x);
    } else {
      return undefined;
    }
  });
};


/**
 *  Copy keys from cursors before dispose them and dispose cursors and
 *  its reference value. Keys are used to resume cursors position.
 * @private
 */
ydn.db.Cursor.prototype.dispose_ = function() {

  for (var i = 0; i < this.cursors_.length; i++) {
    this.cursors_[i].dispose();
  }
  this.logger.finest(this + ' disposed');
  goog.array.clear(this.values_);
  goog.array.clear(this.cursors_);
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.Cursor.prototype.toString = function() {
    var s = '[';
    for (var i = 0; i < this.keys_.length; i++) {
      if (i > 0) {
        s += ' ';
      }
      if (this.cursors_[i]) {
        s += this.cursors_[i].toString();
      } else {
        s += 'cursor~{' + this.keys_[i];
        if (goog.isDefAndNotNull(this.primary_keys_[i])) {
          s += ';' + this.primary_keys_[i] + '}';
        } else {
          s += '}';
        }
      }
    }
    s += ']';
    return 'Cursor ' + s;
  };
}
