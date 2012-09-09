/**
 * @fileoverview Hold active SQLTransaction object provide mutex function.
 */

goog.provide('ydn.db.SqlTxMutex');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('ydn.db.YdnDbInvalidStateException');


/**
 * Provide transaction object to subclass and keep a result.
 * This also serve as mutex on transaction.
 * @constructor
 */
ydn.db.SqlTxMutex = function() {
  this.sql_tx_ = null;
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
ydn.db.SqlTxMutex.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.SqlTxMutex');


/**
 * @const
 * @type {boolean}
 */
ydn.db.SqlTxMutex.DEBUG = true;


/**
 * Newly created transaction it push to mutex and lock.
 * @final
 * @param {!SQLTransaction} tx the transaction object.
 */
ydn.db.SqlTxMutex.prototype.up = function(tx) {

  // In compiled code, it is permissible to overlap transaction,
  // rather than cause error.
  goog.asserts.assert(goog.isNull(this.sql_tx_), 'transaction overlap ' + this.sql_tx_);

  this.sql_tx_ = tx;

  this.is_set_done_ = false;

  /**
   * @private
   * @type {boolean}
   */
  this.has_error_ = false;

  goog.array.clear(this.complete_listeners_);

  this.tx_count_++;

  this.logger.finest('tx up, count: ' + this.tx_count_);
};


/**
 * Current transaction.
 * @type {SQLTransaction}
 * @private
 */
ydn.db.SqlTxMutex.prototype.sql_tx_ = null;


/**
 *
 * @type {Array.<!Function>}
 * @private
 */
ydn.db.SqlTxMutex.prototype.complete_listeners_ = [];


/**
 * Transaction is explicitly set not to do transaction.
 * @type {boolean}
 * @private
 */
ydn.db.SqlTxMutex.prototype.is_set_done_ = false;


/**
 * Transaction is released and mutex is unlock.
 * @final
 * @param {ydn.db.TransactionEventTypes} type event type
 * @param {*} event
 */
ydn.db.SqlTxMutex.prototype.down = function (type, event) {
  this.logger.finest('tx down, count: ' + this.tx_count_);

  this.sql_tx_ = null;

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
ydn.db.SqlTxMutex.prototype.setDone = function() {
  this.is_set_done_ = true;
};


/**
 *
 * @return {boolean}
 */
ydn.db.SqlTxMutex.prototype.isSetDone = function() {
  return this.is_set_done_;
};

/**
 * Transaction object is active.
 * @final
 * @return {boolean}
 */
ydn.db.SqlTxMutex.prototype.isActive = function() {
  return !!this.sql_tx_;
};


/**
 * Transaction object is active and not done.
 * @final
 * @return {boolean}
 */
ydn.db.SqlTxMutex.prototype.isActiveAndAvailable = function() {
  return !!this.sql_tx_ && !this.is_set_done_;
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
ydn.db.SqlTxMutex.prototype.addCompletedListener = function(fn) {
  if (!this.sql_tx_) {
    throw new ydn.db.YdnDbInvalidStateException('No active tx to listen.');
  }
  this.complete_listeners_.push(fn);
};


/**
 * Return current active transaction if available. Transaction consumer must
 * check {@link #isActiveAndAvailable} if this transaction object
 * should be used.
 * @final
 * @return {SQLTransaction}
 */
ydn.db.SqlTxMutex.prototype.getTx = function() {
  return this.sql_tx_;
};

//
///**
// * Set error status and abort transaction.
// * @deprecated
// * @final
// */
//ydn.db.SqlTxMutex.prototype.abort = function() {
//  this.has_error_ = true;
//  return this.sql_tx_.abort();
//};

