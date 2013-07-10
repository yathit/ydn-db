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
 * @fileoverview Custom deferred class for transaction facilitating
 * synchronization logic and aborting transaction.
 *
 * Before this implementation, abort method was dynamically attached to
 * database instance. That approach is limited to aborting during request
 * promise callbacks handler. Also no way to check the request can be aborted
 * or not. With this implementation abort method is attached to request, i.e.,
 * to this deferred object supporting enqueriable abort.
 *
 * Before this implementation, synchronization logic uses two or more deferred
 * objects, now sync logic facilities are built-in.
 *
 * Object instantiator must override {@see setDbValue} method.
 *
 * Rationale for using custom deferred class.
 * ------------------------------------------
 * In general coding pattern, usage of custom class is discouraged if
 * composition of existing classes is application. Here, this custom deferred
 * class can, in face, be composed using goog.async.Deferred and
 * goog.events.EventTarget. However, high frequency usage of this class is
 * an optimization is deseriable.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.Request');
goog.provide('ydn.db.Request.Method');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');



/**
 * A Deferred with progress event.
 *
 * @param {ydn.db.Request.Method} method request method.
 * @param {Function=} opt_onCancelFunction A function that will be called if the
 *     Deferred is canceled. If provided, this function runs before the
 *     Deferred is fired with a {@code CanceledError}.
 * @param {Object=} opt_defaultScope The default object context to call
 *     callbacks and errbacks in.
 * @constructor
 * @extends {goog.async.Deferred}
 * @struct
 */
ydn.db.Request = function(method, opt_onCancelFunction, opt_defaultScope) {
  goog.base(this, opt_onCancelFunction, opt_defaultScope);
  this.method_ = method;
  /**
   * progress listener callbacks.
   * @type {!Array.<!Array>}
   * @private
   */
  this.progbacks_ = [];
  /**
   * transaction ready listener callbacks.
   * @type {!Array.<!Array>}
   * @private
   */
  this.txbacks_ = [];
  this.tx_ = null;
  this.tx_label_ = '';
};
goog.inherits(ydn.db.Request, goog.async.Deferred);


/**
 * @type {ydn.db.Request.Method} method request method.
 * @private
 */
ydn.db.Request.prototype.method_;


/**
 * @type {ydn.db.con.IDatabase.Transaction} transaction object.
 */
ydn.db.Request.prototype.tx_;


/**
 * @type {string} transaction label.
 * @private
 */
ydn.db.Request.prototype.tx_label_ = '';


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.Request.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.Request');


/**
 * Set active transaction. This will invoke tx listener callbacks.
 * @param {ydn.db.con.IDatabase.Transaction} tx active transaction.
 * @param {string} label tx label.
 * @final
 */
ydn.db.Request.prototype.setTx = function(tx, label) {
  goog.asserts.assert(!this.tx_, 'TX already set.');
  this.tx_ = tx;
  this.tx_label_ = label;
  this.logger.finer(this + ' BEGIN');
  if (tx) {
    for (var i = 0; i < this.txbacks_.length; i++) {
      var tx_callback = this.txbacks_[i][0];
      var scope = this.txbacks_[i][1];
      tx_callback.call(scope, tx);
    }
    this.txbacks_.length = 0;
  }
  this.logger.finer(this + ' END');
};


/**
 * Remove tx when tx is inactive.
 */
ydn.db.Request.prototype.removeTx = function() {
  this.tx_ = null;
};


/**
 * @return {ydn.db.con.IDatabase.Transaction}
 * @final
 */
ydn.db.Request.prototype.getTx = function() {
  return this.tx_;
};


/**
 * @return {boolean}
 * @final
 */
ydn.db.Request.prototype.canAbort = function() {
  return !!this.tx_;
};


/**
 * Abort active transaction.
 * @see #canAbort
 * @final
 */
ydn.db.Request.prototype.abort = function() {
  if (this.tx_) {
    if (goog.isFunction(this.tx_.abort)) {
      this.tx_.abort();
    } else if (goog.isFunction(this.tx_.executeSql)) {
      /**
       * @param {SQLTransaction} transaction transaction.
       * @param {SQLResultSet} results results.
       */
      var callback = function(transaction, results) {

      };
      /**
       * @param {SQLTransaction} tr transaction.
       * @param {SQLError} error error.
       * @return {boolean} true to roll back.
       */
      var error_callback = function(tr, error) {
        // console.log(error);
        return true; // roll back
      };
      this.tx_.executeSql('ABORT', [], callback, error_callback);
      // this will cause error on SQLTransaction and WebStorage.
      // the error is wanted because there is no way to abort a transaction in
      // WebSql. It is somehow recommanded workaround to abort a transaction.
    } else {
      throw new ydn.error.NotSupportedException();
    }
  } else {
    throw new ydn.db.InvalidStateError('No active transaction');
  }
};


/**
 * Invoke when a database received a successful result. By default this will
 * invoke Deferred.callback method to fullfil the promise. This behavior may
 * be override.
 * @param {*} value success result from database request.
 */
ydn.db.Request.prototype.setDbValue = function(value) {
  this.callback(value);
};


/**
 * Register a callback function to be called when tx ready.
 * @param {!function(this:T,?):?} fun The function to be called on progress.
 * @param {T=} opt_scope An optional scope to call the progback in.
 * @return {!goog.async.Deferred} This Deferred.
 * @template T
 */
ydn.db.Request.prototype.addTxback = function(fun, opt_scope) {
  if (this.tx_) {
    fun.call(opt_scope, this.tx_);
  } else {
    this.txbacks_.push([fun, opt_scope]);
  }
  return this;
};


/**
 * Register a callback function to be called for progress events.
 * @param {!function(this:T,?):?} fun The function to be called on progress.
 * @param {T=} opt_scope An optional scope to call the progback in.
 * @return {!goog.async.Deferred} This Deferred.
 * @template T
 */
ydn.db.Request.prototype.addProgback = function(fun, opt_scope) {
  this.progbacks_.push([fun, opt_scope]);
  return this;
};


/**
 * Notify to progress callback listers about the progress of the result.
 * @param {*=} opt_value The value.
 */
ydn.db.Request.prototype.notify = function(opt_value) {
  for (var i = 0; i < this.progbacks_.length; i++) {
    var progback = this.progbacks_[i][0];
    var scope = this.progbacks_[i][1];
    progback.call(scope, opt_value);
  }
};


/**
 * @inheritDoc
 */
ydn.db.Request.prototype.callback = function(opt_result) {
  goog.base(this, 'callback', opt_result);
  this.logger.finer(this + ' SUCCESS');
  this.dispose_();
};


/**
 * @inheritDoc
 */
ydn.db.Request.prototype.errback = function(opt_result) {
  goog.base(this, 'errback', opt_result);
  this.logger.finer(this + ' ERROR');
  this.dispose_();
};


/**
 * Release references.
 * @private
 */
ydn.db.Request.prototype.dispose_ = function() {
  this.progbacks_.length = 0;
  this.tx_ = null;
  this.tx_label_ = '~' + this.tx_label_;
};


/**
 * Request label.
 * @return {string}
 */
ydn.db.Request.prototype.getLabel = function() {
  return this.method_ + (this.tx_label_ ? '[' + this.tx_label_ + ']' : '');
};


/**
 * Create a new request using existing tx.
 * @return {!ydn.db.Request}
 */
ydn.db.Request.prototype.branch = function() {
  var req = new ydn.db.Request(this.method_);
  req.tx_ = this.tx_;
  this.tx_label_ = this.tx_label_;
  return req;
};


/**
 * @param {ydn.db.Request.Method} method
 * @param {*} value
 * @return {!ydn.db.Request}
 */
ydn.db.Request.succeed = function(method, value) {
  var req = new ydn.db.Request(method);
  req.setDbValue(value);
  return req;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.Request.prototype.toString = function() {
    return 'Request:' + this.getLabel();
  };
}


/**
 * Request method.
 * @enum {string}
 */
ydn.db.Request.Method = {
  ADD: 'add',
  ADDS: 'ads',
  CLEAR: 'clr',
  COUNT: 'cnt',
  GET: 'get',
  GET_ITER: 'gti',
  KEYS: 'kys',
  KEYS_ITER: 'kit',
  KEYS_INDEX: 'kyi',
  PUT: 'put',
  PUTS: 'pts',
  PUT_KEYS: 'pks',
  REMOVE_ID: 'rm',
  REMOVE: 'rms',
  REMOVE_KEYS: 'rmk',
  REMOVE_INDEX: 'rmi',
  VALUES: 'vs',
  VALUES_ITER: 'vsi',
  VALUES_INDEX: 'vi',
  VALUES_IDS: 'vis',
  VALUES_KEYS: 'vks',
  NONE: ''
};
