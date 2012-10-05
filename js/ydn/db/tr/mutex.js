/**
 * @fileoverview Hold active Transaction object and provides mutex function.
 */

goog.provide('ydn.db.tr.Mutex');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('ydn.db.InvalidStateError');


/**
 * Provide transaction object to subclass and keep a result.
 * This also serve as mutex on transaction.
 * @param {number} tr_no track number
 * @constructor
 */
ydn.db.tr.Mutex = function(tr_no) {
  this.tr_no = tr_no;
  this.tx_ = null;
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
ydn.db.tr.Mutex.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.tr.Mutex');


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.Mutex.DEBUG = false;


/**
 * Newly created transaction it push to mutex and lock.
 * @final
 * @param {!IDBTransaction|!SQLTransaction|!Object} tx the transaction object.
 * @param {string=} scope scope name.
 */
ydn.db.tr.Mutex.prototype.up = function(tx, scope) {

  // In compiled code, it is permissible to overlap transaction,
  // rather than cause error.
  goog.asserts.assert(!goog.isDefAndNotNull(this.tx_), 'transaction overlap ' +
    this.tx_);

  this.tx_ = tx;

  this.is_set_done_ = false;

  /**
   * @private
   * @type {boolean}
   */
  this.has_error_ = false;

  /**
   *
   * @type {boolean}
   * @private
   */
  this.out_of_scope_ = false;

  this.scope_name = goog.isDef(scope) ? scope : '';

  this.tx_count_++;

  this.oncompleted = null;

  if (ydn.db.tr.Mutex.DEBUG) {
    window.console.log(this + ': open');
  } else {
    this.logger.finest(this + ': open');
  }
};


/**
 * Current transaction.
 * @type {!IDBTransaction|!SQLTransaction|Object}
 * @private
 */
ydn.db.tr.Mutex.prototype.idb_tx_ = null;



/**
 * Transaction is explicitly set not to do transaction.
 * @type {boolean}
 * @private
 */
ydn.db.tr.Mutex.prototype.is_set_done_ = false;


/**
 * @protected
 * @type {string}
 */
ydn.db.tr.Mutex.prototype.scope_name = '';


/**
 *
 * @return {string}
 */
ydn.db.tr.Mutex.prototype.getScope = function() {
  return this.scope_name;
};


/**
 * Transaction is released and mutex is unlock.
 * @final
 * @param {ydn.db.base.TransactionEventTypes} type event type
 * @param {*} event
 */
ydn.db.tr.Mutex.prototype.down = function (type, event) {

  //goog.asserts.assertObject(this.tx_, 'mutex already unlocked');
  if (this.tx_) {

    if (ydn.db.tr.Mutex.DEBUG) {
      window.console.log(this + ': close');
    } else {
      this.logger.finest(this + ': close');
    }
    // down must be call only once by those who up
    this.tx_ = null;

    if (this.oncompleted) {
      this.oncompleted(type, event);
      this.oncompleted = null;
    }
  } else {
    this.logger.severe(this + ' has no TX to be unlocked for ' + type);
  }

};


/**
 * Transaction callback function is out of scope. We no longer accepting adding
 * listeners.
 */
ydn.db.tr.Mutex.prototype.out = function() {
  this.out_of_scope_ = true;
  // interestingly tx_ can still be use even after out of scope from the
  // transaction callback. This is the whole reason we are
  // having this class. Otherwise, transaction scope handling
  // will be very simple.
};


/**
 * True if call while in transaction callback scope. Transaction callback
 * is out of scope when a request is returning a result on success or error
 * callback.
 * @return {boolean} return true if call while in transaction callback scope.
 */
ydn.db.tr.Mutex.prototype.inScope = function() {
  return !this.out_of_scope_;
};


/**
 * Transaction is explicitly set not to do next transaction.
 */
ydn.db.tr.Mutex.prototype.lock = function() {
  if (ydn.db.tr.Mutex.DEBUG) {
    window.console.log(this + ': locked');
  } else {
    this.logger.finest(this + ': locked');
  }
  this.is_set_done_ = true;
};


/**
 * Get number of transaction count.
 * @final
 * @return {number}
 */
ydn.db.tr.Mutex.prototype.getTxCount = function() {
  return this.tx_count_;
};


/**
 *
 * @return {boolean}
 */
ydn.db.tr.Mutex.prototype.isSetDone = function() {
  return this.is_set_done_;
};

/**
 * Transaction object is active.
 * @final
 * @return {boolean}
 */
ydn.db.tr.Mutex.prototype.isActive = function() {
  return !!this.tx_;
};


/**
 * Transaction object is available.
 * @final
 * @return {boolean}
 */
ydn.db.tr.Mutex.prototype.isAvailable = function() {
  return !this.is_set_done_;
};


/**
 * Transaction object is active and not done.
 * @final
 * @return {boolean}
 */
ydn.db.tr.Mutex.prototype.isActiveAndAvailable = function() {
  return this.isActive() && this.isAvailable();
};


/**
 * Add a transaction complete (also error and abort) event. The listener will
 * be invoked after receiving one of these three events and before executing
 * next transaction. However, it is recommended that listener is not used
 * for transaction logistic tracking, which should, in fact, be tracked request
 * level. Use this listener to release resource for robustness. Any error on
 * the listener will be swallowed.
 * @type {?function(string=, *=)} fn first argument is either 'complete',
 * 'error', or 'abort' and second argument is event.
 */
ydn.db.tr.Mutex.prototype.oncompleted = null;


/**
 * Return current active transaction if available. Transaction consumer must
 * check {@link #isActiveAndAvailable} if this transaction object
 * should be used.
 * @return {IDBTransaction|SQLTransaction|Object}
 */
ydn.db.tr.Mutex.prototype.getTx = function() {
  return this.tx_;
};


/** @override */
ydn.db.tr.Mutex.prototype.toString = function() {
  var s = 'Mutex';
  if (goog.DEBUG) {
  var sc = !!this.scope_name ? '[' + this.scope_name + ']' : '';
  s = s + ':' + this.tr_no + ':' + this.tx_count_ + sc;
  }
  return s;
};


