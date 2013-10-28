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
 * Rationale for using custom deferred class.
 * ------------------------------------------
 * In general coding pattern, usage of custom class is discouraged if
 * composition of existing classes is application. Here, this custom deferred
 * class can, in face, be composed using goog.async.Deferred and/or
 * goog.events.EventTarget. However, high frequency usage of this class is
 * an optimization is desirable. If goog.async.Deferred were used,
 * #await will require at least two goog.async.Deferred objects for each
 * transformer. Also note that #awaitDeferred is different from #wait.
 * Furthermore, handling tx and logging with custom label will be messy with
 * Deferred.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.Request');
goog.provide('ydn.db.Request.Method');
goog.require('ydn.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('ydn.db.base.Transaction');



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
 * @extends {ydn.async.Deferred}
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
  /**
   * request branches.
   * @type {!Array.<!Array>}
   * @private
   */
  this.transformers_ = [];
  this.tx_ = null;
  this.tx_label_ = '';
  this.copy_count_ = 0;
};
goog.inherits(ydn.db.Request, ydn.async.Deferred);


/**
 * @define {boolean} debug flag.
 */
ydn.db.Request.DEBUG = false;


/**
 * @type {ydn.db.Request.Method} method request method.
 * @private
 */
ydn.db.Request.prototype.method_;


/**
 * @type {ydn.db.base.Transaction} transaction object.
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
 * @param {ydn.db.base.Transaction} tx active transaction.
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
 * @return {!ydn.db.Request} active tx copy of this request.
 */
ydn.db.Request.prototype.copy = function() {
  // goog.asserts.assert(this.tx_, 'only active request can be copied');
  var rq = new ydn.db.Request(this.method_);
  this.copy_count_++;
  rq.setTx(this.tx_, this.tx_label_ + 'C' + this.copy_count_);
  return rq;
};


/**
 * Remove tx when tx is inactive.
 */
ydn.db.Request.prototype.removeTx = function() {
  this.tx_ = null;
};


/**
 * @return {ydn.db.base.Transaction}
 * @final
 */
ydn.db.Request.prototype.getTx = function() {
  return this.tx_;
};


/**
 * @return {ydn.db.Request.Method}
 */
ydn.db.Request.prototype.getMethod = function() {
  return this.method_;
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
    this.logger.finer(this + ' aborting');
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
      throw new ydn.debug.error.NotSupportedException();
    }
  } else {
    var msg = goog.DEBUG ? 'No active transaction' : '';
    throw new ydn.db.InvalidStateError(msg);
  }
};


/**
 * Resolve a database request. This will trigger invoking
 * awaiting transformer callback function sequencially and asynchorniously
 * and finally invoke Deferred.callback method to fulfill the promise.
 * @param {*} value result from database request.
 * @param {boolean=} opt_failed true if request fail.
 * @final
 */
ydn.db.Request.prototype.setDbValue = function(value, opt_failed) {
  var tr = this.transformers_.shift();
  var failed = !!opt_failed;
  if (tr) {
    var me = this;
    var fn = tr[0];
    var scope = tr[1];
    fn.call(scope, value, failed, function(tx_value, f2) {
      me.setDbValue(tx_value, f2);
    });
  } else {
    if (ydn.db.Request.DEBUG) {
      window.console.log(this + ' receiving ' + (failed ? 'fail' : 'value'),
          value);
    }
    if (failed) {
      this.errback(value);
    } else {
      this.callback(value);
    }
  }
};


/**
 * Add db value transformer. Transformers are invoked successively.
 * @param {function(this: T, *, boolean, function(*, boolean=))} tr a
 * transformer.
 * @param {T=} opt_scope An optional scope to call the await in.
 * @template T
 * @see {goog.async.Deferred#awaitDeferred}
 */
ydn.db.Request.prototype.await = function(tr, opt_scope) {
  goog.asserts.assert(!this.hasFired(), 'transformer cannot be added after' +
      ' resolved.');
  this.transformers_.push([tr, opt_scope]);
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
 * @inheritDoc
 */
ydn.db.Request.prototype.callback = function(opt_result) {
  this.logger.finer(this + ' SUCCESS');
  goog.base(this, 'callback', opt_result);
  this.dispose_();
};


/**
 * @inheritDoc
 */
ydn.db.Request.prototype.errback = function(opt_result) {
  this.logger.finer(this + ' ERROR');
  goog.base(this, 'errback', opt_result);
  this.dispose_();
};


/**
 * Determine the current state of a Deferred object.
 * Note: This is to satisfy JQuery build export. Closure project should use
 * @see #hasFired instead.
 * @return {string}
 * @suppress {accessControls}
 */
ydn.db.Request.prototype.state = function() {
  if (this.hasFired()) {
    if (this.hadError_) {
      return 'rejected';
    } else {
      return 'resolved';
    }
  } else {
    return 'pending';
  }
};


/**
 * Release references.
 * @private
 */
ydn.db.Request.prototype.dispose_ = function() {
  this.tx_ = null;
  this.tx_label_ = this.tx_label_;
};


/**
 * Request label.
 * @return {string} request label.
 */
ydn.db.Request.prototype.getLabel = function() {
  var label = '';
  if (this.tx_label_) {
    label = this.tx_ ? '*' : '';
    label = '[' + this.tx_label_ + label + ']';
  }
  return this.method_ + label;
};


/**
 * @param {ydn.db.Request.Method} method method.
 * @param {*} value success value.
 * @return {!ydn.db.Request} request.
 */
ydn.db.Request.succeed = function(method, value) {
  var req = new ydn.db.Request(method);
  req.setDbValue(value);
  return req;
};


/**
 * Return a Deferred's Promise object, as required by jQuery.
 * @return {!goog.async.Deferred}
 */
ydn.db.Request.prototype.promise = function() {
  // Ref: https://github.com/jquery/jquery/blob/
  // cb37994d76afb45efc3b606546349ed4e695c053/src/deferred.js#L34
  // Note: promise function return an object having `done`, `fail` and
  // `progress` functions. Since a request object satisfy the requirement, this
  // simply return itself.
  return this;
};


/**
 * @inheritDoc
 */
ydn.db.Request.prototype.toString = function() {
  return 'Request:' + this.getLabel();
};


/**
 * @inheritDoc
 */
ydn.db.Request.prototype.toJSON = function() {
  var label = this.tx_label_ || '';
  var m = label.match(/B(\d+)T(\d+)(?:Q(\d+?))?(?:R(\d+))?/) || [];
  return {
    'method': this.method_ ? this.method_.split(':') : [],
    'branchNo': parseFloat(m[1]),
    'transactionNo': parseFloat(m[2]),
    'queueNo': parseFloat(m[3]),
    'requestNo': parseFloat(m[4])
  };
};


/**
 * Request method.
 * @enum {string}
 */
ydn.db.Request.Method = {
  ADD: goog.DEBUG ? 'add' : 'a',
  ADDS: goog.DEBUG ? 'add:array' : 'b',
  CLEAR: goog.DEBUG ? 'clear' : 'c',
  COUNT: goog.DEBUG ? 'count' : 'd',
  GET: goog.DEBUG ? 'get' : 'e',
  GET_ITER: goog.DEBUG ? 'get:iter' : 'f',
  KEYS: goog.DEBUG ? 'keys' : 'g',
  KEYS_ITER: goog.DEBUG ? 'keys:iter' : 'h',
  KEYS_INDEX: goog.DEBUG ? 'keys:iter:index' : 'i',
  LIST: goog.DEBUG ? 'list' : 'i2',
  OPEN: goog.DEBUG ? 'open' : 'i3',
  PUT: goog.DEBUG ? 'put' : 'j',
  PUTS: goog.DEBUG ? 'put:array' : 'k',
  PUT_KEYS: goog.DEBUG ? 'put:keys' : 'l',
  REMOVE_ID: goog.DEBUG ? 'rm' : 'm',
  REMOVE: goog.DEBUG ? 'rm:iter' : 'n',
  REMOVE_KEYS: goog.DEBUG ? 'rm:keys' : 'o',
  REMOVE_INDEX: goog.DEBUG ? 'rm:iter:index' : 'p',
  RUN: goog.DEBUG ? 'run' : 'q',
  SEARCH: goog.DEBUG ? 'search' : 'qa',
  SQL: goog.DEBUG ? 'sql' : 'r',
  VALUES: goog.DEBUG ? 'values' : 's',
  VALUES_ITER: goog.DEBUG ? 'values:iter' : 't',
  VALUES_INDEX: goog.DEBUG ? 'values:iter:index' : 'u',
  VALUES_IDS: goog.DEBUG ? 'values:array' : 'v',
  VALUES_KEYS: goog.DEBUG ? 'values:keys' : 'w',
  VERSION_CHANGE: goog.DEBUG ? 'IDBVersionChangeEvent ' : 'vc',
  NONE: ''
};
