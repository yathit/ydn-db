/**
* @fileoverview Provide iteration query.
*
*
*/


goog.provide('ydn.db.sql.DbOperator');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.core.DbOperator');
goog.require('ydn.db.sql.IStorage');
goog.require('ydn.db.sql.req.IRequestExecutor');
goog.require('ydn.db.sql.req.IndexedDb');
goog.require('ydn.db.sql.req.WebSql');
goog.require('ydn.db.sql.req.SimpleStore');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Construct storage to execute CRUD database operations.
 *
 * Execution database operation is atomic, if a new transaction require,
 * otherwise existing transaction is used and the operation become part of
 * the existing transaction. A new transaction is required if the transaction
 * is not active or locked. Active transaction can be locked by using
 * mutex.
 *
 * @param {!ydn.db.crud.Storage} storage base storage object.
 *  @param {!ydn.db.schema.Database} schema
 *  @param {string} scope_name
 * @param {ydn.db.tr.IThread} thread
 * @param {ydn.db.tr.IThread} sync_thread
 * @constructor
 * @implements {ydn.db.sql.IStorage}
 * @extends {ydn.db.core.DbOperator}
*/
ydn.db.sql.DbOperator = function(storage, schema, scope_name, thread, sync_thread) {
  goog.base(this, storage, schema, scope_name, thread, sync_thread);
};
goog.inherits(ydn.db.sql.DbOperator, ydn.db.core.DbOperator);



///**
// * @inheritDoc
// */
//ydn.db.sql.DbOperator.prototype.exec = function(callback, store_names, mode, scope) {
//  goog.base(this, 'exec',
//    /** @type {function(ydn.db.core.req.IRequestExecutor)} */ (callback),
//    store_names, mode, scope);
//};



//
///**
// * Explain query plan.
// * @param {!ydn.db.Iterator} q
// * @return {Object} plan in JSON
// */
//ydn.db.sql.DbOperator.prototype.explain = function (q) {
//  if (!this.executor) {
//    return {'error':'database not ready'};
//  } else if (q instanceof ydn.db.Sql) {
//    return this.getExecutor().explainSql(q);
//  } else {
//    throw new ydn.error.ArgumentException();
//  }
//};



/**
* @param {string} sql SQL statement.
 * @param {!Array=} params SQL parameters.
* @return {!goog.async.Deferred} return result as list.
*/
ydn.db.sql.DbOperator.prototype.executeSql = function (sql, params) {

  var df = ydn.db.base.createDeferred();

  var query = new ydn.db.Sql(sql);

  var stores = query.getStoreNames();
  for (var i = 0; i < stores.length; i++) {
    var store = this.schema.getStore(stores[i]);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store: ' + store +
          ' not exists.');
    }
  }

  var me = this;
  this.logger.finer('executeSql: ' + sql + " params: " + params);
  this.tx_thread.exec(df, function (tx, tx_no, cb) {
    me.getExecutor().executeSql(tx, tx_no, cb, query, params || []);
  }, query.getStoreNames(), query.getMode(), 'executeSql');

  return df;
};




