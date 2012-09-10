/**
 * @fileoverview Hold active Transaction object and provides mutex function.
 */

goog.provide('ydn.db.TransactionMutex');
goog.provide('ydn.db.SqlTxMutex');
goog.provide('ydn.db.IdbTxMutex');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('ydn.db.InvalidStateException');


/**
 * Provide transaction object to subclass and keep a result.
 * This also serve as mutex on transaction.
 * @constructor
 */
ydn.db.TransactionMutex = function() {
  this.idb_tx_ = null;
  /**
   * Transaction counter.
   * @type {number}
   * @private
   */
  this.tx_count_ = 0;
};




/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.TransactionMutex.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.TransactionMutex');


/**
 * @const
 * @type {boolean}
 */
ydn.db.TransactionMutex.DEBUG = false;


/**
 * Newly created transaction it push to mutex and lock.
 * @final
 * @param {!IDBTransaction|!SQLTransaction|!Object} tx the transaction object.
 */
ydn.db.TransactionMutex.prototype.up = function(tx) {

  // In compiled code, it is permissible to overlap transaction,
  // rather than cause error.
  goog.asserts.assert(goog.isNull(this.idb_tx_), 'transaction overlap ' +
    this.idb_tx_);

  this.idb_tx_ = tx;

  this.is_set_done_ = false;

  /**
   * @private
   * @type {boolean}
   */
  this.has_error_ = false;

  goog.array.clear(this.complete_listeners_);

  /**
   *
   * @type {boolean}
   * @private
   */
  this.out_of_scope_ = false;

  this.tx_count_++;

  this.logger.finest('tx up, count: ' + this.tx_count_);
};


/**
 * Current transaction.
 * @type {!IDBTransaction|!SQLTransaction|Object}
 * @private
 */
ydn.db.TransactionMutex.prototype.idb_tx_ = null;


/**
 *
 * @type {Array.<!Function>}
 * @private
 */
ydn.db.TransactionMutex.prototype.complete_listeners_ = [];


/**
 * Transaction is explicitly set not to do transaction.
 * @type {boolean}
 * @private
 */
ydn.db.TransactionMutex.prototype.is_set_done_ = false;


/**
 * Transaction is released and mutex is unlock.
 * @final
 * @param {ydn.db.TransactionEventTypes} type event type
 * @param {*} event
 */
ydn.db.TransactionMutex.prototype.down = function (type, event) {
  this.logger.finest('tx down, count: ' + this.tx_count_);
  // down must be call only once by those who up
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
 * Transaction callback function is out of scope. We no longer accepting adding
 * listeners.
 */
ydn.db.TransactionMutex.prototype.out = function() {
  this.out_of_scope_ = true;
  // interestingly tx_ can still be use even after out of scope from the
  // transaction callback. This is the whole reason we are
  // having this class. Otherwise, transaction scope handling
  // will be very simple.
};


/**
 * Transaction is explicitly set not to do next transaction.
 * @deprecated
 */
ydn.db.TransactionMutex.prototype.setDone = function() {
  this.is_set_done_ = true;
};


/**
 * Get number of transaction count.
 * @final
 * @return {number}
 */
ydn.db.TransactionMutex.prototype.getTxCount = function() {
  return this.tx_count_;
};


/**
 *
 * @return {boolean}
 */
ydn.db.TransactionMutex.prototype.isSetDone = function() {
  return this.is_set_done_;
};

/**
 * Transaction object is active.
 * @final
 * @return {boolean}
 */
ydn.db.TransactionMutex.prototype.isActive = function() {
  return !!this.idb_tx_;
};


/**
 * Transaction object is active and not done.
 * @final
 * @return {boolean}
 */
ydn.db.TransactionMutex.prototype.isActiveAndAvailable = function() {
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
ydn.db.TransactionMutex.prototype.addCompletedListener = function(fn) {
  // thinks about using standard addEventListener.
  // most use case, here is to listen any events, but here three event type
  // most consumer do not care what event type it is.
  // IMO mimicking addEventListener is over kill.
  if (!this.idb_tx_) {
    throw new ydn.db.InvalidStateException('Tx gone.');
  }
  if (this.out_of_scope_) {
    throw new ydn.db.InvalidStateException('Out of scope.');
  }
  this.complete_listeners_.push(fn);
};


/**
 * Return current active transaction if available. Transaction consumer must
 * check {@link #isActiveAndAvailable} if this transaction object
 * should be used.
 * @return {!IDBTransaction|!SQLTransaction|Object}
 */
ydn.db.TransactionMutex.prototype.getTx = function() {
  return this.idb_tx_;
};



/**
 * Hold active IDBTransaction object provide mutex function.
 */


/**
 * Provide transaction object to subclass and keep a result.
 * This also serve as mutex on transaction.
 * @extends {ydn.db.TransactionMutex}
 * @constructor
 */
ydn.db.IdbTxMutex = function() {
  goog.base(this);
};
goog.inherits(ydn.db.IdbTxMutex, ydn.db.TransactionMutex);


/**
 * @return {IDBTransaction}
 */
ydn.db.IdbTxMutex.prototype.getTx = function() {
  return /** @type {IDBTransaction} */ (goog.base(this, 'getTx'));
};



/**
 * Hold active SQLTransaction object provide mutex function.
 */

/**
 * Provide transaction object to subclass and keep a result.
 * This also serve as mutex on transaction.
 * @extends {ydn.db.TransactionMutex}
 * @constructor
 */
ydn.db.SqlTxMutex = function() {
  goog.base(this);
};
goog.inherits(ydn.db.SqlTxMutex, ydn.db.TransactionMutex);


/**
 * @return {SQLTransaction}
 */
ydn.db.SqlTxMutex.prototype.getTx = function() {
  return /** @type {SQLTransaction} */ (goog.base(this, 'getTx'));
};

