/**
 * @fileoverview Provide atomic CRUD database operations on a transaction queue.
 *
 *
 */


goog.provide('ydn.db.tr.DbOperator');
goog.require('ydn.db.tr.AtomicSerial');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.db.core.IStorage');
goog.require('ydn.error.NotSupportedException');



/**
 * Construct storage to execute CRUD database operations.
 *
 * Execution database operation is atomic, if a new transaction require,
 * otherwise existing transaction is used and the operation become part of
 * the existing transaction. A new transaction is required if the transaction
 * is not active or locked. Active transaction can be locked by using
 * mutex.
 *
 * @param {!ydn.db.core.Storage} storage base storage object.
 * @param {!ydn.db.schema.Database} schema
 * @param {ydn.db.tr.IThread} tx_thread
 * @constructor
 */
ydn.db.tr.DbOperator = function(storage, schema, tx_thread) {

  /**
   * @final
   * @type {!ydn.db.tr.Storage}
   * @private
   */
  this.storage_ = storage;

  /**
   * @protected
   * @final
   * @type {!ydn.db.schema.Database}
   */
  this.schema = schema;

  /**
   * @final
   */
  this.tx_thread = tx_thread;
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.DbOperator.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.tr.DbOperator');


/**
 * @type {ydn.db.tr.IThread}
 * @protected
 */
ydn.db.tr.DbOperator.prototype.tx_thread;


/**
 * @final
 * @return {number}
 */
ydn.db.tr.DbOperator.prototype.getTxNo = function() {
  return this.tx_thread.getTxNo();
};


/**
 * @final
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @return {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.tr.DbOperator.prototype.getExecutor = function(tx) {
  if (!this.executor) {
    this.executor = this.storage_.getExecutor();
  }

  this.executor.setTx(tx);
  return this.executor;
};


/**
 * @final
 * @return {!ydn.db.tr.Storage} storage.
 */
ydn.db.tr.DbOperator.prototype.getStorage = function() {
  return this.storage_;
};


/**
 * Add or update a store issuing a version change event.
 * @protected
 * @param {!StoreSchema|!ydn.db.schema.Store} store schema.
 * @return {!goog.async.Deferred} promise.
 */
ydn.db.tr.DbOperator.prototype.addStoreSchema = function(store) {
  return this.getStorage().addStoreSchema(store);
};




/** @override */
ydn.db.tr.DbOperator.prototype.toString = function() {
  var s = 'TxStorage:' + this.getStorage().getName();
//  if (goog.DEBUG) {
//    var scope = this.getScope();
//    scope = scope ? '[' + scope + ']' : '';
//    var mu = this.getMuTx().getScope();
//    var mu_scope = mu ? '[' + mu + ']' : '';
//    return s + ':' + this.q_no_ + scope + ':' + this.getTxNo() + mu_scope;
//  }
  return s;
};




