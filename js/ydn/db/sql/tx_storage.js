/**
* @fileoverview Provide iteration query.
*
*
*/


goog.provide('ydn.db.sql.TxStorage');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.index.TxStorage');
goog.require('ydn.db.sql.IStorage');
goog.require('ydn.db.sql.req.IRequestExecutor');
goog.require('ydn.db.sql.req.IndexedDb');
goog.require('ydn.db.sql.req.WebSql');
goog.require('ydn.db.sql.req.SimpleStore');



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
 * @param {number} ptx_no transaction queue number.
 * @param {string} scope_name scope name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.sql.IStorage}
 * @extends {ydn.db.index.TxStorage}
*/
ydn.db.sql.TxStorage = function(storage, ptx_no, scope_name, schema) {
  goog.base(this, storage, ptx_no, scope_name, schema);
};
goog.inherits(ydn.db.sql.TxStorage, ydn.db.index.TxStorage);


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.sql.req.IRequestExecutor} get executor.
 */
ydn.db.sql.TxStorage.prototype.getExecutor = function() {
  if (!this.executor) {
    var type = this.type();
    if (type == ydn.db.con.IndexedDb.TYPE) {
      this.executor = new ydn.db.sql.req.IndexedDb(this.getName(), this.schema);
    } else if (type == ydn.db.con.WebSql.TYPE) {
      this.executor = new ydn.db.sql.req.WebSql(this.db_name, this.schema);
    } else if (type == ydn.db.con.SimpleStorage.TYPE ||
      type == ydn.db.con.LocalStorage.TYPE ||
      type == ydn.db.con.SessionStorage.TYPE) {
      this.executor = new ydn.db.sql.req.SimpleStore(this.db_name, this.schema);
    } else {
      throw new ydn.db.InternalError('No executor for ' + type);
    }
  }
  return /** @type {ydn.db.sql.req.IRequestExecutor} */ (this.executor);
};


/**
 * @throws {ydn.db.ScopeError}
 * @protected
 * @param {function(ydn.db.sql.req.IRequestExecutor)} callback callback when
 * executor
 * is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 * @param {string} scope scope name.
 */
ydn.db.sql.TxStorage.prototype.exec = function(callback, store_names, mode, scope) {
  goog.base(this, 'exec',
    /** @type {function(ydn.db.index.req.IRequestExecutor)} */ (callback),
    store_names, mode, scope);
};




/**
 * Explain query plan.
 * @param {!ydn.db.Iterator} q
 * @return {Object} plan in JSON
 */
ydn.db.sql.TxStorage.prototype.explain = function (q) {
  if (!this.executor) {
    return {'error':'database not ready'};
  } else if (q instanceof ydn.db.Sql) {
    return this.getExecutor().explainSql(q);
  } else {
    throw new ydn.error.ArgumentException();
  }
};



/**
* @param {string} sql SQL statement.
 * @param {!Array=} params SQL parameters.
* @return {!goog.async.Deferred} return result as list.
*/
ydn.db.TxStorage.prototype.execute = function (sql, params) {

  var df = ydn.db.base.createDeferred();

  var query = new ydn.db.Sql(sql);

  var store_name = query.getStoreName();
  var store = this.schema.getStore(store_name);
  if (!store) {
    throw new ydn.error.ArgumentException('store: ' + store_name +
        ' not exists.');
  }

  this.exec(function (executor) {
    executor.executeSql(df, query, params);
  }, query.stores(), query.getMode());

  return df;
};




