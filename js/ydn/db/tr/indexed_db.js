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
 * @fileoverview Wrapper for IndexedDb.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.tr.IndexedDb');
goog.require('ydn.db.adapter.IndexedDb');
goog.require('ydn.db.tr.Service');
goog.require('ydn.db.tr.IdbMutex');


/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @implements {ydn.db.tr.Service}
 * @extends {ydn.db.adapter.IndexedDb}
 * @constructor
 */
ydn.db.tr.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema)
};
goog.inherits(ydn.db.tr.IndexedDb, ydn.db.adapter.IndexedDb);


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.tr.IndexedDb.DEBUG = goog.DEBUG && false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.tr.IndexedDb');


/**
 * When DB is ready, fnc will be call with a fresh transaction object. Fnc must
 * put the result to 'result' field of the transaction object on success. If
 * 'result' field is not set, it is assumed
 * as failed.
 * @protected
 * @param {Function} fnc transaction function.
 * @param {!Array.<string>} scopes list of stores involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode.
 */
ydn.db.tr.IndexedDb.prototype.doTxTransaction = function(fnc, scopes, mode)
{
  //console.log('doTransaction_ ' + JSON.stringify(scopes) + ' ' + mode);
  var me = this;

  /**
   * This is a start of critical section on transaction.
   * If db_ is not defined, database is not ready.
   * 
   * 
   *
   * After transaction is over after receiving three possible (COMPLETE, ABORT
   * or ERROR) events, we set tx_ to null and start next transaction in the
   * queue.
   */
  if (this.idx_db && !this.mu_tx_.isActiveAndAvailable()) {

    /**
     * Existence of transaction object indicate that this database is in
     * transaction. This must be set to null on finished and before
     * put the result to deferred object.
     * @private
     * @type {!IDBTransaction}
     */
    var tx = this.idx_db.transaction(scopes, /** @type {number} */ (mode));

    me.mu_tx_.up(tx);

    // we choose to avoid using add listener pattern to reduce memory leak,
    // if it might.

    tx.oncomplete = function(event) {
      // window.console.log(['oncomplete', event, tx, me.mu_tx_]);
      me.mu_tx_.down(tx, ydn.db.TransactionEventTypes.COMPLETE, event);
      me.runTxQueue_();
    };

    tx.onerror = function(event) {
      if (ydn.db.tr.IndexedDb.DEBUG) {
        window.console.log(['onerror', event, tx, me.mu_tx_]);
      }
      me.mu_tx_.down(ydn.db.TransactionEventTypes.ERROR, event);
      me.runTxQueue_();
    };

    tx.onabort = function(event) {
      if (ydn.db.tr.IndexedDb.DEBUG) {
        window.console.log(['onabort', event, tx, me.mu_tx_]);
      }
      me.mu_tx_.down(ydn.db.TransactionEventTypes.ABORT, event);
      me.runTxQueue_();
    };

    fnc(me.mu_tx_);

  } else {
    this.txQueue.push({fnc: fnc, scopes: scopes, mode: mode});
  }
};



/**
 * One database can have only one transaction.
 * @private
 * @final
 * @type {!ydn.db.tr.IdbMutex}
 */
ydn.db.tr.IndexedDb.prototype.mu_tx_ = new ydn.db.tr.IdbMutex();


/**
 * Obtain active consumable transaction object.
 * @final
 * @protected
 * @return {ydn.db.tr.IdbMutex} transaction object if active and available.
 */
ydn.db.tr.IndexedDb.prototype.getActiveIdbTx = function() {
  return this.mu_tx_.isActiveAndAvailable() ? this.mu_tx_ : null;
};


/**
 *
 * @return {IDBTransaction}
 */
ydn.db.tr.IndexedDb.prototype.getTx = function() {
  return null;
};



