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


goog.provide('ydn.db.Deferred');
goog.require('goog.async.Deferred');



/**
 * A Deferred with progress event.
 *
 * @param {Function=} opt_onCancelFunction A function that will be called if the
 *     Deferred is canceled. If provided, this function runs before the
 *     Deferred is fired with a {@code CanceledError}.
 * @param {Object=} opt_defaultScope The default object context to call
 *     callbacks and errbacks in.
 * @constructor
 * @extends {goog.async.Deferred}
 */
ydn.db.Deferred = function(opt_onCancelFunction, opt_defaultScope) {
  goog.base(this, opt_onCancelFunction, opt_defaultScope);
  this.progbacks_ = [];
  this.tx_ = null;
};
goog.inherits(ydn.db.Deferred, goog.async.Deferred);


/**
 * @type {!Array.<Array>} progress listener callbacks.
 */
ydn.db.Deferred.prototype.progbacks_;


/**
 * @type {ydn.db.con.IDatabase.Transaction} transaction object.
 */
ydn.db.Deferred.prototype.tx_;


/**
 * @return {ydn.db.con.IDatabase.Transaction}
 */
ydn.db.Deferred.prototype.getTx = function() {
  return this.tx_;
};


/**
 * @return {boolean}
 */
ydn.db.Deferred.prototype.canAbort = function() {
  return !!this.tx_;
};


/**
 * @return {boolean}
 */
ydn.db.Deferred.prototype.abort = function() {
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
 * Register a callback function to be called for progress events.
 * @param {!function(this:T,?):?} fun The function to be called on progress.
 * @param {T=} opt_scope An optional scope to call the progback in.
 * @return {!goog.async.Deferred} This Deferred.
 * @template T
 */
ydn.db.Deferred.prototype.addProgback = function(fun, opt_scope) {
  this.progbacks_.push([fun, opt_scope]);
  return this;
};


/**
 * Notify to progress callback listers about the progress of the result.
 * @param {*=} opt_value The value.
 */
ydn.db.Deferred.prototype.notify = function(opt_value) {
  for (var i = 0; i < this.progbacks_.length; i++) {
    var progback = this.progbacks_[i][0];
    var scope = this.progbacks_[i][1];
    progback.call(scope, opt_value);
  }
};


/**
 * @inheritDoc
 */
ydn.db.Deferred.prototype.callback = function(opt_result) {
  this.progbacks_.length = 0;
  goog.base(this, 'callback', opt_result);
};


/**
 * @inheritDoc
 */
ydn.db.Deferred.prototype.errback = function(opt_result) {
  this.progbacks_.length = 0;
  goog.base(this, 'errback', opt_result);
};
