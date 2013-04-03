/**
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 */


goog.provide('ydn.db.tr.Parallel');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.error.NotSupportedException');
goog.require('ydn.db.tr.ParallelTxExecutor');


/**
 * Create transaction queue providing methods to run in non-overlapping
 * transactions.
 *
 * @implements {ydn.db.tr.IThread}
 * @param {!ydn.db.tr.Storage} storage base storage.
 * @param {number} ptx_no transaction queue number.
 * @param {string=} thread_name scope name.
 * @constructor
 */
ydn.db.tr.Parallel = function(storage, ptx_no, thread_name) {

  /**
   * @final
   * @type {!ydn.db.tr.Storage}
   * @private
   */
  this.storage_ = storage;

  /*
   * @final
   */
  this.q_no_ = ptx_no;

  this.tx_no_ = 0;

  this.r_no_ = 0;

  this.pl_tx_ex_ = null;

  this.request_tx_ = null;

};


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.Parallel.DEBUG = false;

/**
 * @private
 * @type {number} request number.
 */
ydn.db.tr.Parallel.prototype.r_no_;

/**
 * @private
 * @type {number} transaction number.
 */
ydn.db.tr.Parallel.prototype.q_no_;

/**
 * @private
 * @type {number} thread number.
 */
ydn.db.tr.Parallel.prototype.tx_no_;


/**
 *
 * @type {ydn.db.tr.ParallelTxExecutor}
 * @private
 */
ydn.db.tr.Parallel.prototype.pl_tx_ex_ = null;



/**
 * Transaction object is sed when receiving a request before result df
 * callback and set null after that callback so that it can be aborted
 * in the callback.
 * In general, this tx may be different from running tx.
 * @type {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage}
 * @protected
 */
ydn.db.tr.Parallel.prototype.request_tx_ = null;




/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.Parallel.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.tr.Parallel');




/**
* Add or update a store issuing a version change event.
* @protected
* @param {!StoreSchema|!ydn.db.schema.Store} store schema.
* @return {!goog.async.Deferred} promise.
*/
ydn.db.tr.Parallel.prototype.addStoreSchema = function(store) {
  return this.storage_.addStoreSchema(store);
};
//
//
///**
// * @inheritDoc
// */
//ydn.db.tr.Parallel.prototype.transaction = function(trFn, store_names,
//       opt_mode, completed_event_handler) {
//  this.storage_.transaction(trFn, store_names,
//      opt_mode, completed_event_handler);
//};


/**
 *
 * @return {string}  scope name.
 */
ydn.db.tr.Parallel.prototype.getThreadName = function() {
  return this.getLabel();
};



/**
 *
 * @return {number} transaction count.
 */
ydn.db.tr.Parallel.prototype.getTxNo = function() {
  return this.tx_no_;
};


/**
 *
 * @return {number} transaction queue number.
 */
ydn.db.tr.Parallel.prototype.getQueueNo = function() {
  return this.q_no_;
};


/**
 *
 * @return {string|undefined}
 */
ydn.db.tr.Parallel.prototype.type = function() {
  return this.storage_.getType();
};


/**
 *
 * @return {!ydn.db.tr.Storage} storage.
 */
ydn.db.tr.Parallel.prototype.getStorage = function() {
  return this.storage_;
};


/**
 *
 * @return {ydn.db.tr.ParallelTxExecutor}
 */
ydn.db.tr.Parallel.prototype.getPlTx = function() {
  return this.pl_tx_ex_;
};


/**
 *
 * @return {boolean} return true if thread has active transaction.
 */
ydn.db.tr.Parallel.prototype.isActive = function() {
  return !!this.pl_tx_ex_ && this.pl_tx_ex_.isActive();
};


/**
 *
 * @param {!Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean}
 * @protected
 */
ydn.db.tr.Parallel.prototype.sameScope = function(store_names, mode) {
  return this.pl_tx_ex_.sameScope(store_names, mode);
};


/**
 *
 * @param {!Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean}
 * @protected
 */
ydn.db.tr.Parallel.prototype.subScope = function(store_names, mode) {
  return this.pl_tx_ex_.subScope(store_names, mode);
};



/**
 * Abort an active transaction.
 * @throws InvalidStateError if transaction is not active.
 */
ydn.db.tr.Parallel.prototype.abort = function() {
  this.logger.finer(this + ': aborting');
  ydn.db.tr.IThread.abort(this.request_tx_);
};


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.crud.req.IRequestExecutor} get executor.
 */
ydn.db.tr.Parallel.prototype.getExecutor = goog.abstractMethod;


/**
 * @param {!Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean} return true if given scope and mode is compatible with
 * active transaction and should be reuse.
 * @protected
 */
ydn.db.tr.Parallel.prototype.reusedTx = function(store_names, mode) {
  return false;
};



/**
 * @inheritDoc
 */
ydn.db.tr.Parallel.prototype.processTx = function (callback, store_names,
    opt_mode, on_completed) {

  var mode = goog.isDef(opt_mode) ?
      opt_mode : ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;
  var pl_tx_ex;

  var completed_handler = function(type, event) {
    me.logger.finest(me + ':tx' + pl_tx_ex.getTxNo() + ' committed');
    pl_tx_ex.onCompleted(type, event);
  };

  var transaction_process = function(tx) {
    me.tx_no_++;
    pl_tx_ex = new ydn.db.tr.ParallelTxExecutor(
      tx, me.tx_no_, store_names, mode);

    me.logger.finest(me + ':tx' +  pl_tx_ex.getTxNo() +
      ydn.json.stringify(store_names) + mode + ' begin');
    me.pl_tx_ex_ = pl_tx_ex;
    me.pl_tx_ex_.executeTx(callback, on_completed);
  };

  var reused = this.isActive() && this.reusedTx(store_names, mode);
  if (ydn.db.tr.Parallel.DEBUG) {
    var act = this.isActive() ? 'active' : 'inactive';
    window.console.log(this +
        ' ' + this.pl_tx_ex_ +
        (reused ? ' reusing transaction' : ' opening transaction ') +
         ' for mode:' + mode + ' scopes:' +
        ydn.json.stringify(store_names));
  }

  if (reused) {
    this.pl_tx_ex_.executeTx(callback, on_completed);
  } else {
    this.storage_.transaction(transaction_process, store_names, mode,
      completed_handler);
  }

};


/**
 * @inheritDoc
 */
ydn.db.tr.Parallel.prototype.exec = function (df, callback, store_names, mode,
                                                   scope_name, on_completed) {

  var me = this;
  this.processTx(function(tx) {

    /**
     *
     * @param {*} result
     * @param {boolean=} is_error
     */
    var resultCallback = function(result, is_error) {
      me.request_tx_ = tx; // so that we can abort it.
      if (is_error) {
        df.errback(result);
      } else {
        df.callback(result);
      }
      me.request_tx_ = null;
      resultCallback = /** @type {function (*, boolean=)} */ (null);
    };

    callback(tx, me.getLabel(), resultCallback);
  }, store_names, mode, on_completed);
};


/**
 *
 * @return {string}
 */
ydn.db.tr.Parallel.prototype.getLabel = function() {
  return 'B' + this.q_no_ + 'T' + this.tx_no_ + 'R' + this.r_no_;
};


if (goog.DEBUG) {
/** @override */
ydn.db.tr.Parallel.prototype.toString = function() {
  var s = this.request_tx_ ? '*' : '';
  return 'Parallel:' + this.getLabel() + s;
};
}

