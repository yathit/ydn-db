/**
 * @fileoverview Hold active IDBTransaction object provide mutex function.
 */

goog.provide('ydn.db.IdbTxMutex');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('ydn.db.WrapperDBInvalidStateException');


/**
 * Provide transaction object to subclass and keep a result.
 * This also serve as mutex on transaction.
 * @constructor
 */
ydn.db.IdbTxMutex = function() {
  this.idb_tx_ = null;
  /**
   * Write-only instance variable for debug info.
   * @type {number}
   * @private
   */
  this.tx_count_ = 0;
};




/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.IdbTxMutex.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.IdbTxMutex');


/**
 * @const
 * @type {boolean}
 */
ydn.db.IdbTxMutex.DEBUG = false;


/**
 * Newly created transaction it push to mutex and lock.
 * @final
 * @param {!IDBTransaction} tx the transaction object.
 */
ydn.db.IdbTxMutex.prototype.up = function(tx) {

  this.logger.finest('tx up, count: ' + this.tx_count_);

  // In compiled code, it is permissible to overlap transaction,
  // rather than cause error.
  goog.asserts.assert(goog.isNull(this.idb_tx_), 'transaction overlap ' + this.idb_tx_);

  this.idb_tx_ = tx;

  this.is_set_done_ = false;

  /**
   * @private
   * @type {boolean}
   */
  this.has_error_ = false;

  goog.array.clear(this.complete_listeners_);

  this.tx_count_++;
};


/**
 * Current transaction.
 * @type {IDBTransaction}
 * @private
 */
ydn.db.IdbTxMutex.prototype.idb_tx_ = null;


/**
 *
 * @type {Array.<!Function>}
 * @private
 */
ydn.db.IdbTxMutex.prototype.complete_listeners_ = [];


/**
 * Transaction is explicitly set not to do transaction.
 * @type {boolean}
 * @private
 */
ydn.db.IdbTxMutex.prototype.is_set_done_ = false;


/**
 * Transaction is released and mutex is unlock.
 * @final
 * @param {IDBTransaction} tx the same transaction object in up. This is only
 * used for validation and inadvertently invoked by non-owner.
 * @param {ydn.db.TransactionEventTypes} type event type
 * @param {*} event
 */
ydn.db.IdbTxMutex.prototype.down = function (tx, type, event) {
  this.logger.finest('tx down, count: ' + this.tx_count_);
  // down must be call only once by those who up
  goog.asserts.assert(this.idb_tx_ === tx);
  this.idb_tx_ = null;

  for (var i = 0; this.complete_listeners_.length; i++) {
    /**
     * @preserve_try
     */
    try {
      this.complete_listeners_[i](type, event);
    } catch (e) {
      // OK to swallow error. we told this in doc.
      if (goog.DEBUG) {
        throw e;
      }
    }
  }
  goog.array.clear(this.complete_listeners_);
};


/**
 * Transaction is explicitly set not to do next transaction.
 * @deprecated
 */
ydn.db.IdbTxMutex.prototype.setDone = function() {
  this.is_set_done_ = true;
};


/**
 *
 * @return {boolean}
 */
ydn.db.IdbTxMutex.prototype.isSetDone = function() {
  return this.is_set_done_;
};

/**
 * Transaction object is active.
 * @final
 * @return {boolean}
 */
ydn.db.IdbTxMutex.prototype.isActive = function() {
  return !!this.idb_tx_;
};


/**
 * Transaction object is active and not done.
 * @final
 * @return {boolean}
 */
ydn.db.IdbTxMutex.prototype.isActiveAndAvailable = function() {
  return !!this.idb_tx_ && !this.is_set_done_;
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
ydn.db.IdbTxMutex.prototype.addCompletedListener = function(fn) {
  if (!this.idb_tx_) {
    throw new ydn.db.WrapperDBInvalidStateException('No active tx to listen.');
  }
  this.complete_listeners_.push(fn);
};


/**
 * Return current active transaction if available. Transaction consumer must
 * check {@link #isActiveAndAvailable} if this transaction object
 * should be used.
 * @final
 * @return {IDBTransaction}
 */
ydn.db.IdbTxMutex.prototype.getTx = function() {
  return this.idb_tx_;
};


/**
 * Set error status and abort transaction.
 * @deprecated
 * @final
 */
ydn.db.IdbTxMutex.prototype.abort = function() {
  this.has_error_ = true;
  return this.idb_tx_.abort();
};

