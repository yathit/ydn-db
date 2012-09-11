/**
 * @fileoverview Light wrapper {@link ydn.db.Storage} using active transaction
 * instance given at constructor.
 *
 *
 */


goog.provide('ydn.db.tr.TxStorage');
goog.require('ydn.db.Core');


/**
 * @implements {ydn.db.tr.Service}
 * @param {!ydn.db.Storage} storage
 * @param {!ydn.db.tr.Mutex} mu_tx
 * @constructor
 */
ydn.db.tr.TxStorage = function(storage, mu_tx) {
  /**
   * @final
   * @type {!ydn.db.Storage}
   * @private
   */
  this.storage_ = storage;
  /**
   * @final
   * @type {SQLTransaction|IDBTransaction|Object}
   * @private
   */
  this.tx_ = mu_tx.getTx(); // tx in mu_tx is mutable

  this.itx_count_ = mu_tx.getTxCount();

  /**
   * @final
   * @type {!ydn.db.tr.Mutex}
   * @private
   */
  this.mu_tx_ = mu_tx;
};


/**
 * Add a transaction complete (also error and abort) event. The listener will
 * be invoked after receiving one of these three events and before executing
 * next transaction. However, it is recommended that listener is not used
 * for transaction logistic tracking, which should, in fact, be tracked request
 * level. Use this listener to release resource for robustness. Any error on
 * the listener will be swallowed.
 * @final
 * @param {function(string=, *=)} fn first argument is either 'complete',
 * 'error', or 'abort' and second argument is event.
 */
ydn.db.tr.TxStorage.prototype.addCompletedListener = function(fn) {
  this.mu_tx_.addCompletedListener(this.itx_count_, fn);
};


/**
 * Return object
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} store_name table name.
 * @param {(string|number|!Array.<string>)=} opt_key object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.tr.TxStorage.prototype.get = function (store_name, opt_key) {
  return this.storage_.getInTx(this.tx_, store_name, opt_key);
};

