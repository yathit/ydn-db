/**
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 */


goog.provide('ydn.db.tr.ParallelThread');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.error.NotSupportedException');


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
ydn.db.tr.ParallelThread = function(storage, ptx_no, thread_name) {

  /**
   * @final
   * @type {!ydn.db.tr.Storage}
   * @private
   */
  this.storage_ = storage;

  /*
   * Transaction queue no.
   * @final
   * @type {number}
   */
  this.q_no_ = ptx_no;

  this.tx_no_ = 0;

  /**
   * @final
   */
  this.thread_name_ = thread_name || '';

};


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.ParallelThread.DEBUG = false;


/**
 * @private
 * @type {string}
 */
ydn.db.tr.ParallelThread.prototype.thread_name_;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.ParallelThread.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.tr.ParallelThread');




/**
* Add or update a store issuing a version change event.
* @protected
* @param {!StoreSchema|!ydn.db.schema.Store} store schema.
* @return {!goog.async.Deferred} promise.
*/
ydn.db.tr.ParallelThread.prototype.addStoreSchema = function(store) {
  return this.storage_.addStoreSchema(store);
};
//
//
///**
// * @inheritDoc
// */
//ydn.db.tr.ParallelThread.prototype.transaction = function(trFn, store_names,
//       opt_mode, completed_event_handler) {
//  this.storage_.transaction(trFn, store_names,
//      opt_mode, completed_event_handler);
//};


/**
 *
 * @return {string}  scope name.
 */
ydn.db.tr.ParallelThread.prototype.getScope = function() {
  return this.thread_name_;
};



/**
 *
 * @return {number} transaction count.
 */
ydn.db.tr.ParallelThread.prototype.getTxNo = function() {
  return this.tx_no_;
};


/**
 *
 * @return {number} transaction queue number.
 */
ydn.db.tr.ParallelThread.prototype.getQueueNo = function() {
  return this.q_no_;
};


/**
 *
 * @return {string}
 */
ydn.db.tr.ParallelThread.prototype.type = function() {
  return this.storage_.type();
};


/**
 *
 * @return {!ydn.db.tr.Storage} storage.
 */
ydn.db.tr.ParallelThread.prototype.getStorage = function() {
  return this.storage_;
};


/**
 * @export
 * @return {SQLTransaction|IDBTransaction|Object} active transaction object.
 */
ydn.db.tr.ParallelThread.prototype.getTx = function() {
  return this.tx_;
};



/**
 * Abort an active transaction.
 */
ydn.db.tr.ParallelThread.prototype.abort = function() {
  if (this.tx_) {
    this.tx_['abort'](); // this will cause error on SQLTransaction and WebStorage.
    // the error is wanted because there is no way to abort a transaction in
    // WebSql. It is somehow recommanded workaround to abort a transaction.
  } else {
    throw new ydn.error.InvalidOperationException('No active transaction');
  }
};


/**
* @inheritDoc
*/
ydn.db.tr.ParallelThread.prototype.run = function(trFn, store_names, opt_mode,
                                              oncompleted, opt_args) {
  throw new ydn.error.NotImplementedException();
};


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.core.req.IRequestExecutor} get executor.
 */
ydn.db.tr.ParallelThread.prototype.getExecutor = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.tr.ParallelThread.prototype.exec = function (callback, store_names, mode, scope_name) {

  var me = this;
  var completed_handler = function(type, event) {
    me.tx_ = null;
  };

  var transaction_process = function(tx) {
    me.tx_ = tx;
    callback(tx);
  };

  if (ydn.db.tr.ParallelThread.DEBUG) {
    window.console.log(this + ' transaction ' + mode + ' open for ' +
        JSON.stringify(store_names) + ' in ' + scope_name);
  }
  this.storage_.transaction(transaction_process, store_names, mode,
      completed_handler);
  
};


/** @override */
ydn.db.tr.ParallelThread.prototype.toString = function() {
  var s = 'ydn.db.tr.ParallelThread:' + this.storage_.getName();
  if (goog.DEBUG) {
    var scope = this.getScope();
    scope = scope ? ' [' + scope + ']' : '';
    return s + ':' + this.q_no_ + ':' + this.getTxNo() + scope;
  }
  return s;
};

