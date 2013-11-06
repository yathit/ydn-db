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

goog.provide('ydn.db.query.RestrictionCursor');
goog.require('goog.debug.Logger');
goog.require('ydn.db');
goog.require('ydn.debug.error.InternalError');



/**
 * Create a new front-end cursor object.
 * @param {Array.<ydn.db.core.req.ICursor>} cursors cursors.
 * @param {ydn.db.query.RestrictionCursor=} opt_prev_cursor previous cursor, to resume cursor
 * location.
 * @param {IDBKey=} opt_key start position.
 * @param {IDBKey=} opt_primary_key start position.
 * @constructor
 * @struct
 */
ydn.db.query.RestrictionCursor = function(cursors, opt_prev_cursor, opt_key, opt_primary_key) {

  /**
   * @type {Array.<ydn.db.core.req.ICursor>}
   * @protected
   */
  this.cursors = cursors;
  /**
   * @type {Array.<IDBKey|undefined>} current cursor keys.
   * @protected
   */
  this.keys = [];
  /**
   * @type {Array.<IDBKey|undefined>} current cursor keys.
   * @protected
   */
  this.primary_keys = [];
  /**
   * @type {Array.<*>} current cursor values.
   * @protected
   */
  this.values = [];
  this.count_ = 0;
  this.done_ = false;
  this.exited_ = false;

  if (opt_prev_cursor) {
    this.keys = goog.array.clone(opt_prev_cursor.keys);
    this.primary_keys = goog.array.clone(opt_prev_cursor.primary_keys);
  }
  if (goog.isDefAndNotNull(opt_key)) {
    this.keys[0] = opt_key;
  }
  if (goog.isDefAndNotNull(opt_primary_key)) {
    this.primary_keys[0] = opt_primary_key;
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

  if (this.cursors.length > 0) {
    this.init_();
  }
};


/**
 *
 * @define {boolean} debug flag.
 */
ydn.db.query.RestrictionCursor.DEBUG = false;


/**
 *
 * @type {number}
 * @private
 */
ydn.db.query.RestrictionCursor.prototype.count_ = 0;


/**
 * Done flag is true if one of the cursor lost its position.
 * @type {boolean} done state.
 * @private
 */
ydn.db.query.RestrictionCursor.prototype.done_ = false;


/**
 * Exited flag is true if the iterator is explicitly exited, usually before
 * done flag to true.
 * @type {boolean} exited flag.
 * @private
 */
ydn.db.query.RestrictionCursor.prototype.exited_ = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.query.RestrictionCursor.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.query.RestrictionCursor');


/**
 *
 * @private
 */
ydn.db.query.RestrictionCursor.prototype.init_ = function() {
  var n = this.cursors.length;
  if (ydn.db.query.RestrictionCursor.DEBUG) {
    this.logger.finest('Initializing ' + n + ' cursors');
  }
  if (n == 1) {
    // this.openSingle_(this.cursors[0]);
  } else if (n > 1) {
    // this.openPrimaryKeyMerge_();
  } else {
    throw new ydn.debug.error.InternalError('no cursors');
  }
};


/**
 * @return {number} Number of steps iterated.
 */
ydn.db.query.RestrictionCursor.prototype.getCount = function() {
  return this.count_;
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} effective key of cursor.
 */
ydn.db.query.RestrictionCursor.prototype.getKey = function(opt_idx) {
  var index = opt_idx || 0;
  return this.keys[index];
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} primary key of cursor.
 */
ydn.db.query.RestrictionCursor.prototype.getPrimaryKey = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cursors[index].isIndexCursor() ?
      this.primary_keys[index] : this.keys[index];
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {*} value.
 */
ydn.db.query.RestrictionCursor.prototype.getValue = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cursors[index].isValueCursor() ?
      this.values[index] : this.getPrimaryKey(index);
};


/**
 * Restart the cursor. If previous cursor position is given,
 * the position is skip.
 * @param {IDBKey=} opt_key previous position.
 * @param {IDBKey=} opt_primary_key primary key.
 */
ydn.db.query.RestrictionCursor.prototype.restart = function(opt_key, opt_primary_key) {
  this.done_ = false;
  this.cursors[0].restart(opt_primary_key, opt_key);
};


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey} key primary key position to continue.
 */
ydn.db.query.RestrictionCursor.prototype.continuePrimaryKey = function(key) {
  // console.log(this + ' continuePrimaryKey ' + key)
  this.cursors[0].continuePrimaryKey(key);
};


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} opt_key effective key position to continue.
 */
ydn.db.query.RestrictionCursor.prototype.continueEffectiveKey = function(opt_key) {
  this.cursors[0].continueEffectiveKey(opt_key);
};


/**
 * Move cursor position to the effective key.
 * @param {number} n number of steps.
 */
ydn.db.query.RestrictionCursor.prototype.advance = function(n) {
  for (var i = 0; i < this.cursors.length; i++) {
    this.cursors[i].advance(n);
  }
};


/**
 * @param {!Object} obj record value.
 * @param {number=} opt_idx cursor index.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.query.RestrictionCursor.prototype.update = function(obj, opt_idx) {
  var index = opt_idx || 0;
  return this.cursors[index].update(obj);
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.query.RestrictionCursor.prototype.clear = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cursors[index].clear();
};


/**
 *
 * @return {boolean} true if cursor gone.
 */
ydn.db.query.RestrictionCursor.prototype.hasDone = function() {
  return this.done_;
};


/**
 *
 * @return {boolean} true if iteration is existed.
 */
ydn.db.query.RestrictionCursor.prototype.isExited = function() {
  return this.exited_;
};


/**
 * Exit cursor
 */
ydn.db.query.RestrictionCursor.prototype.exit = function() {
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
ydn.db.query.RestrictionCursor.prototype.finalize_ = function() {

  // IndexedDB will GC array keys, so we clone it.
  this.primary_keys = goog.array.map(this.primary_keys, function(x) {
    if (goog.isDefAndNotNull(x)) {
      return ydn.db.Key.clone(x);
    } else {
      return undefined;
    }
  });
  this.keys = goog.array.map(this.keys, function(x) {
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
ydn.db.query.RestrictionCursor.prototype.dispose_ = function() {

  for (var i = 0; i < this.cursors.length; i++) {
    this.cursors[i].dispose();
  }
  this.logger.finest(this + ' disposed');
  goog.array.clear(this.values);
  goog.array.clear(this.cursors);
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.query.RestrictionCursor.prototype.toString = function() {
    var s = '[';
    for (var i = 0; i < this.keys.length; i++) {
      if (i > 0) {
        s += ' ';
      }
      if (this.cursors[i]) {
        s += this.cursors[i].toString();
      } else {
        s += 'cursor~{' + this.keys[i];
        if (goog.isDefAndNotNull(this.primary_keys[i])) {
          s += ';' + this.primary_keys[i] + '}';
        } else {
          s += '}';
        }
      }
    }
    s += ']';
    return 'Cursor ' + s;
  };
}
