/**
 * @fileoverview Light wrapper {@link ydn.db.Storage} using active transaction
 * instance given at constructor.
 *
 *
 */


goog.provide('ydn.db.tr.TxStorage');
goog.require('ydn.error.NotSupportedException');


/**
 * @implements {ydn.db.tr.IStorage}
 * @implements {ydn.db.tr.ITxStorage}
 * @param {!ydn.db.tr.Storage} storage
 * @param {string} scope
 * @constructor
 */
ydn.db.tr.TxStorage = function(storage, scope) {
  /**
   * @final
   * @type {!ydn.db.tr.Storage}
   * @private
   */
  this.storage_ = storage;

  this.itx_count_ = storage.getMuTx().getTxCount();

  this.scope = scope;

};


/**
 *
 * @return {boolean}
 */
ydn.db.tr.TxStorage.prototype.isActive = function() {
  return this.storage_.getMuTx().isActiveAndAvailable();
};


/**
 *
 * @return {!ydn.db.tr.Storage}
 */
ydn.db.tr.TxStorage.prototype.getStorage = function() {
  return this.storage_;
};


/**
 *
 * @return {SQLTransaction|IDBTransaction|Object}
 */
ydn.db.tr.TxStorage.prototype.getTx = function() {
  return this.isActive() ? this.storage_.getMuTx().getTx() : null;
};


/**
 *
 * @return {number}
 */
ydn.db.tr.TxStorage.prototype.getTxNo = function() {
  return this.itx_count_;
};


/**
 * Transaction is explicitly set not to do next transaction.
 */
ydn.db.tr.TxStorage.prototype.lock = function() {
  this.storage_.getMuTx().lock();
};


/**
 * Add a transaction complete (also error and abort) event. The listener will
 * be invoked after receiving one of these three events and before executing
 * next transaction. However, it is recommended that listener is not used
 * for transaction logistic tracking, which should, in fact, be tracked request
 * level. Use this listener to release resource for robustness. Any error on
 * the listener will be swallowed.
 * @final
 * @param {?function(string=, *=)} fn first argument is either 'complete',
 * 'error', or 'abort' and second argument is event.
 */
ydn.db.tr.TxStorage.prototype.setCompletedListener = function(fn) {
  this.storage_.getMuTx().oncompleted = fn || null;
};



/**
 *
 * @inheritDoc
 */
ydn.db.tr.TxStorage.prototype.type = function() {
  return this.storage_.type();
};


/**
 * @inheritDoc
 */
ydn.db.tr.TxStorage.prototype.close = function() {
  return this.storage_.close();
};


/**
 * @inheritDoc
 */
ydn.db.tr.TxStorage.prototype.transaction = function (trFn, store_names, mode, oncompleted, opt_args) {

  if (this.isActive()) {
    // continue transaction
    trFn(this);
  } else {
    // this is nested transaction, and will start new wrap
   this.storage_.transaction(trFn, store_names, mode, oncompleted, opt_args);
  }
};

