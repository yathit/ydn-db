/**
 * @fileoverview Parallel transaction executor.
 */

goog.provide('ydn.db.tr.ParallelTxExecutor');
goog.require('ydn.debug.error.InternalError');

/**
 *
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {number} tx_no
 * @param {Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode?} mode
 * @constructor
 */
ydn.db.tr.ParallelTxExecutor = function(tx, tx_no, store_names, mode) {
  this.tx_ = tx;
  this.tx_no_ = tx_no;
  this.scopes_ = goog.array.clone(store_names);
  this.mode_ = mode;
  this.oncompleted_handlers = [];
};



/**
 * @type {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage}
 * @private
 */
ydn.db.tr.ParallelTxExecutor.prototype.tx_ = null;


/**
 * @type {number}
 * @private
 */
ydn.db.tr.ParallelTxExecutor.prototype.tx_no_;


/**
 * @private
 * @type {Array.<Function>}
 */
ydn.db.tr.ParallelTxExecutor.prototype.oncompleted_handlers;


/**
 * @type {Array.<string>} list of sorted store names as transaction scope
 * @private
 */
ydn.db.tr.ParallelTxExecutor.prototype.scopes_;


/**
 * @type {ydn.db.base.TransactionMode?}
 * @private
 */
ydn.db.tr.ParallelTxExecutor.prototype.mode_;


/**
 *
 * @return {boolean} return true if thread has active transaction.
 */
ydn.db.tr.ParallelTxExecutor.prototype.isActive = function() {
  return !!this.tx_;
};


/**
 *
 * @return {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} active transaction object.
 * @protected
 */
ydn.db.tr.ParallelTxExecutor.prototype.getTx = function() {
  return this.tx_;
};

ydn.db.tr.ParallelTxExecutor.prototype.abort = function() {
  if (this.tx_) {
    this.tx_['abort']();
  } else {
    throw new ydn.db.InvalidStateError('transaction completed');
  }
};

/**
 *
 * @return {number}
 */
ydn.db.tr.ParallelTxExecutor.prototype.getTxNo = function() {
  return this.tx_no_;
};


ydn.db.tr.ParallelTxExecutor.prototype.onCompleted = function(t, e) {
  goog.asserts.assert(this.isActive(), this.tx_no_ + ' already completed?');
  var fn;
  while (fn = this.oncompleted_handlers.shift()) {
    fn(t, e);
  }
  this.tx_ = null;
  this.scopes_ = null;
  this.oncompleted_handlers = null;
};


/**
 *
 * @param {Function} on_tx
 * @param {function(ydn.db.base.TxEventTypes, *)=} on_completed
 */
ydn.db.tr.ParallelTxExecutor.prototype.executeTx = function(on_tx, on_completed) {
  if (this.tx_) {
    on_tx(this.tx_);
    if (on_completed) {
      this.oncompleted_handlers.push(on_completed);
    }
  } else {
    throw new ydn.debug.error.InternalError(
        'tx committed on ParallelTxExecutor');
  }
};


/*//
//*//**
// *
// * @return {ydn.db.base.TransactionMode?}
//. *//*
//ydn.db.tr.ParallelTxExecutor.prototype.getMode = function() {
//  return this.mode_;
//};
//
//*//**
// *
// * @return {Array.<string>}
//. *//*
//ydn.db.tr.ParallelTxExecutor.prototype.getTxScope = function() {
//  return this.scopes_;
//};
//*/


/**
 *
 * @param {!Array.<string>} scopes
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean}
 */
ydn.db.tr.ParallelTxExecutor.prototype.sameScope = function(scopes, mode) {
  if (!this.store_names || !this.mode_) {
    return false;
  }
  if (mode != this.mode_) {
    return false;
  }
  if (this.scopes_.length != scopes.length) {
    return false;
  }
  for (var i = 0; i < scopes.length; i++) {
    if (this.scopes_.indexOf(scopes[i]) == -1) {
      return false;
    }
  }
  return true;
};



/**
 *
 * @param {!Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode} mode
 */
ydn.db.tr.ParallelTxExecutor.prototype.subScope = function(store_names, mode) {
  if (!this.scopes_ || !this.mode_) {
    return false;
  }
  if (mode != this.mode_) {
    if (this.mode_ != ydn.db.base.TransactionMode.READ_WRITE ||
      mode != ydn.db.base.TransactionMode.READ_ONLY) {
      return false;
    }
  }
  if (store_names.length > this.scopes_.length) {
    return false;
  }
  for (var i = 0; i < store_names.length; i++) {
    if (this.scopes_.indexOf(store_names[i]) == -1) {
      return false;
    }
  }
  return true;
};


if (goog.DEBUG) {
/**
 * @inheritDoc
 */
ydn.db.tr.ParallelTxExecutor.prototype.toString = function() {
  return 'ParallelTxExecutor: txNo:' + this.tx_no_ + ' mode:' +
    this.mode_ + ' scopes:' + ydn.json.stringify(this.scopes_);
};
}
