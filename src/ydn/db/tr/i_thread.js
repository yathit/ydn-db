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
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 20/1/13
 */

goog.provide('ydn.db.tr.IThread');
goog.provide('ydn.db.tr.IThread.Policy');
goog.require('ydn.db.Request');



/**
 * @interface
 */
ydn.db.tr.IThread = function() {};


/**
 * Create an request.
 * @param {ydn.db.Request.Method} method request method.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_oncompleted handler.
 * @return {!ydn.db.Request}
 */
ydn.db.tr.IThread.prototype.request =
    function(method, store_names, opt_mode, opt_oncompleted) {};


/**
 * @param {!goog.async.Deferred} df deferred object to intersect the request.
 * @param {?function((ydn.db.con.IDatabase.Transaction),
 * string, ?function(*, boolean=))} callback
 *   callback when executor is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_oncompleted handler.
 */
ydn.db.tr.IThread.prototype.exec = goog.abstractMethod;


/**
 * Abort an active transaction.
 */
ydn.db.tr.IThread.prototype.abort = goog.abstractMethod;


/**
 * @return {number}
 */
ydn.db.tr.IThread.prototype.getTxNo = goog.abstractMethod;


/**
 * @return {string}
 */
ydn.db.tr.IThread.prototype.getLabel = goog.abstractMethod;


/**
 * Create a new isolated transaction. After creating a transaction, use
 * {@link #getTx} to received an active transaction. If transaction is not
 * active, it return null. In this case a new transaction must re-create.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_oncompleted handler.
 */
ydn.db.tr.IThread.prototype.processTx = goog.abstractMethod;


/**
 * Request type.
 * @enum {string}
 */
ydn.db.tr.IThread.Policy = {
  MULTI: 'multi',
  REPEAT: 'repeat',
  ALL: 'all',
  ATOMIC: 'atomic',
  SINGLE: 'single'
};


/**
 * Abort an active transaction.
 * @param {ydn.db.con.IDatabase.Transaction} tx transaction to be aborted.
 */
ydn.db.tr.IThread.abort = function(tx) {
  if (tx) {
    if (goog.isFunction(tx.abort)) {
      tx.abort();
    } else if (goog.isFunction(tx.executeSql)) {

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
      tx.executeSql('ABORT', [], callback, error_callback);
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
