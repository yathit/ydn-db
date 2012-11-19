/**
* @fileoverview Provide iteration query.
*
*
*/


goog.provide('ydn.db.index.TxStorage');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.core.TxStorage');
goog.require('ydn.db.index.req.IRequestExecutor');
goog.require('ydn.db.index.req.IndexedDb');
goog.require('ydn.db.index.req.WebSql');
goog.require('ydn.db.index.req.SimpleStore');



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
 * @implements {ydn.db.core.IStorage}
 * @constructor
 * @extends {ydn.db.core.TxStorage}
*/
ydn.db.index.TxStorage = function(storage, ptx_no, scope_name, schema) {
  goog.base(this, storage, ptx_no, scope_name, schema);
};
goog.inherits(ydn.db.index.TxStorage, ydn.db.core.TxStorage);


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.index.req.IRequestExecutor} get executor.
 */
ydn.db.index.TxStorage.prototype.getExecutor = function() {
  if (!this.executor) {
    var type = this.type();
    if (type == ydn.db.con.IndexedDb.TYPE) {
      this.executor = new ydn.db.index.req.IndexedDb(this.getName(), this.schema);
    } else if (type == ydn.db.con.WebSql.TYPE) {
      this.executor = new ydn.db.index.req.WebSql(this.db_name, this.schema);
    } else if (type == ydn.db.con.SimpleStorage.TYPE ||
      type == ydn.db.con.LocalStorage.TYPE ||
      type == ydn.db.con.SessionStorage.TYPE) {
      this.executor = new ydn.db.index.req.SimpleStore(this.db_name, this.schema);
    } else {
      throw new ydn.db.InternalError('No executor for ' + type);
    }
  }
  return /** @type {ydn.db.index.req.IRequestExecutor} */ (this.executor);
};


/**
 * @throws {ydn.db.ScopeError}
 * @protected
 * @param {function(ydn.db.index.req.IRequestExecutor)} callback callback when
 * executor
 * is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 */
ydn.db.index.TxStorage.prototype.exec = function(callback, store_names, mode) {
  goog.base(this, 'exec',
    /** @type {function(ydn.db.core.req.IRequestExecutor)} */ (callback),
    store_names, mode);
};


/**
 * @inheritDoc
 */
ydn.db.index.TxStorage.prototype.get = function(arg1, arg2) {

  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();
    /**
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    var q_store_name = q.getStoreName();
    if (!this.schema.hasStore(q_store_name)) {
      throw new ydn.error.ArgumentException('Store: ' +
          q_store_name + ' not found.');
    }
    this.exec(function(executor) {
      executor.getByIterator(df, q);
    }, [q_store_name], ydn.db.base.TransactionMode.READ_ONLY);
    return df;
  } else {
    return goog.base(this, 'get', arg1, arg2);
  }

};


/**
 * Return object or objects of given key or keys.
 * @param {(string|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(!Array.<string>)=} arg2
 * object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.index.TxStorage.prototype.list = function(arg1, arg2) {

  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();
    if (goog.DEBUG && arguments.length != 2) {
      throw new ydn.error.ArgumentException();
    }
    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;

    this.exec(function(executor) {
      executor.listByIterator(df, q);
    }, q.stores(), ydn.db.base.TransactionMode.READ_ONLY);

    return df;
  } else {
    return goog.base(this, 'list', arg1, arg2);
  }

};


/**
 *
 * @param {!ydn.db.Iterator} cursor the cursor.
 * @param {Function} callback icursor handler.
 * @param {ydn.db.base.TransactionMode=} mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.index.TxStorage.prototype.open = function(cursor, callback, mode) {
  if (!(cursor instanceof ydn.db.Iterator)) {
    throw new ydn.error.ArgumentException();
  }
  var store = this.schema.getStore(cursor.store_name);
  if (!store) {
    throw new ydn.error.ArgumentException('Store "' + cursor.store_name +
      '" not found.');
  }
  var tr_mode = mode || ydn.db.base.TransactionMode.READ_ONLY;

  var df = ydn.db.base.createDeferred();
  this.exec(function(executor) {
    executor.open(df, cursor, callback, /** @type {ydn.db.base.CursorMode} */ (tr_mode));
  }, cursor.stores(), tr_mode);

  return df;

};



