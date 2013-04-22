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
 * @param {number=} opt_max_tx_no limit number of transaction created.
 * @constructor
 * @struct
 */
ydn.db.tr.Parallel = function(storage, ptx_no, opt_max_tx_no) {

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

  this.p_request_tx = null;

  this.max_tx_no_ = opt_max_tx_no || 0;

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
 * @type {number} transaction count.
 */
ydn.db.tr.Parallel.prototype.tx_no_ = 0;


/**
 * @type {number} limit number of transactions.
 * @private
 */
ydn.db.tr.Parallel.prototype.max_tx_no_ = 0;


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
 * @type {ydn.db.con.IDatabase.Transaction}
 * @protected
 */
ydn.db.tr.Parallel.prototype.p_request_tx = null;




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
 * @return {string|undefined} mechansim type.
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
  ydn.db.tr.IThread.abort(this.p_request_tx);
};


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.crud.req.IRequestExecutor} get executor.
 */
ydn.db.tr.Parallel.prototype.getExecutor = goog.abstractMethod;


/**
 * @param {!Array.<string>} store_names store names for scope.
 * @param {ydn.db.base.TransactionMode} mode tx mode.
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
ydn.db.tr.Parallel.prototype.processTx = function(callback, store_names,
    opt_mode, on_completed) {

  var label;
  var mode = goog.isDef(opt_mode) ?
      opt_mode : ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;
  var pl_tx_ex;

  var completed_handler = function(type, event) {
    if (type == ydn.db.base.TxEventTypes.COMPLETE) {
      me.logger.fine(label + ' COMMITTED');
    } else {
      me.logger.fine(label + ' COMMITTED' + ' with ' + type);
    }
    pl_tx_ex.onCompleted(type, event);
  };

  var transaction_process = function(tx) {
    me.tx_no_++;
    pl_tx_ex = new ydn.db.tr.ParallelTxExecutor(
        tx, me.tx_no_, store_names, mode);
    label = me.getLabel();
    me.logger.fine(label + ' BEGIN ' +
        ydn.json.stringify(store_names) + ' ' + mode);
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
    if (this.max_tx_no_ && this.tx_no_ > this.max_tx_no_) {
      throw new ydn.debug.error.InvalidOperationException(
          'Exceed maximum number of transactions of ' + this.max_tx_no_);
    }
    this.storage_.transaction(transaction_process, store_names, mode,
        completed_handler);
  }

};


/**
 * @inheritDoc
 */
ydn.db.tr.Parallel.prototype.exec = function(df, callback, store_names, mode,
                                             on_completed) {

  var me = this;
  var rq_label;

  this.processTx(function(tx) {
    me.r_no_++;
    rq_label = me.getLabel() + 'R' + me.r_no_;
    /**
     *
     * @param {*} result
     * @param {boolean=} is_error
     */
    var resultCallback = function(result, is_error) {
      me.p_request_tx = tx; // so that we can abort it.
      rq_label = me.getLabel() + 'R' + me.r_no_;
      if (is_error) {
        me.logger.finer(rq_label + ' ERROR');
        df.errback(result);
      } else {
        me.logger.finer(rq_label + ' SUCCESS');
        df.callback(result);
      }
      me.p_request_tx = null;
    };
    me.logger.finer(rq_label + ' BEGIN');
    callback(tx, me.getLabel(), resultCallback);
    callback = null;
    me.logger.finer(rq_label + ' END');
  }, store_names, mode, on_completed);
};


/**
 *
 * @return {string} label.
 */
ydn.db.tr.Parallel.prototype.getLabel = function() {
  return 'B' + this.q_no_ + 'T' + this.tx_no_;
};


if (goog.DEBUG) {
  /** @override */
  ydn.db.tr.Parallel.prototype.toString = function() {
    var s = this.p_request_tx ? '*' : '';
    return 'Parallel:' + this.getLabel() + s;
  };
}

