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
 * @fileoverview Wrapper for Web SQL storage.
 *
 * @see http://www.w3.org/TR/webdatabase/
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.tr.WebSql');
goog.require('ydn.db.WebSqlWrapper');


/**
 * Construct WebSql database.
 * Note: Version is ignored, since it does work well.
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @implements {ydn.db.TransactionService}
 * @extends {ydn.db.WebSql}
 * @constructor
 */
ydn.db.tr.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.tr.WebSql, ydn.db.WebSql);


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.tr.WebSql.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.WebSql.prototype.logger = goog.debug.Logger.getLogger('ydn.db.tr.WebSql');


/**
 * Existence of transaction object indicate that this database is in
 * transaction. This must be set to null on finished.
 * @private
 * @final
 * @type {!ydn.db.SqlTxMutex}
 */
ydn.db.tr.WebSql.prototype.sql_mu_tx_ = new ydn.db.SqlTxMutex();


/**
 * @final
 * @protected
 * @return {ydn.db.SqlTxMutex} transaction object if in
 * transaction.
 */
ydn.db.tr.WebSql.prototype.getActiveSqlTx = function() {
  return this.sql_mu_tx_.isActiveAndAvailable() ? this.sql_mu_tx_ : null;
};



/**
 * Run a transaction. If already in transaction, this will join the transaction.
 * @param {function(ydn.db.TransactionMutex)} trFn
 * @param {Array.<string>} scopes
 * @param {ydn.db.TransactionMode} mode
 * @protected
 * @final
 */
ydn.db.tr.WebSql.prototype.doTxTransaction = function(trFn, scopes, mode) {

  var me = this;
  if (!this.sql_mu_tx_.isActiveAndAvailable()) {
    /**
     * SQLTransactionCallback
     * @param {!SQLTransaction} tx
     */
    var transaction_callback = function(tx) {
      me.sql_mu_tx_.up(tx);
      trFn(me.sql_mu_tx_);
    };

    /**
     * SQLVoidCallback
     */
    var success_callback = function() {
      me.sql_mu_tx_.down(ydn.db.TransactionEventTypes.COMPLETE, true);
      me.runTxQueue_();
    };

    /**
     * SQLTransactionErrorCallback
     * @param {SQLError} e
     */
    var error_callback = function(e) {
      me.sql_mu_tx_.down(ydn.db.TransactionEventTypes.ERROR, e);
      me.runTxQueue_();
    };

    if (mode == ydn.db.TransactionMode.READ_ONLY) {
      this.sql_db_.readTransaction(transaction_callback,
          error_callback, success_callback);
    } else {
      this.sql_db_.transaction(transaction_callback,
          error_callback, success_callback);
    }

  } else {
    this.sql_tx_queue.push({fnc: trFn, scopes: scopes, mode: mode});
  }

};


