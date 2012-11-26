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
goog.require('ydn.db.index.IStorage');



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
 * @implements {ydn.db.index.IStorage}
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
 * @inheritDoc
 */
ydn.db.index.TxStorage.prototype.list = function(arg1, arg2, reverse, limit, offset) {

  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();
    if (goog.isDef(reverse) || goog.isDef(limit) || goog.isDef(offset)) {
      throw new ydn.error.ArgumentException('too many arguments.');
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
    return goog.base(this, 'list', arg1, arg2, reverse, limit, offset);
  }

};


/**
 * Cursor scan iteration.
 * @param {!Array.<!ydn.db.Iterator>} iterators the cursor.
 * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): !Array} solver
 * solver.
 * @param {!Array.<!ydn.db.Streamer>=} opt_streamers streamers.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.index.TxStorage.prototype.scan = function(iterators, solver, opt_streamers) {
  var df = ydn.db.base.createDeferred();
  if (!goog.isArray(iterators) || !(iterators[0] instanceof ydn.db.Iterator)) {
    throw new ydn.error.ArgumentException();
  }

  var tr_mode = ydn.db.base.TransactionMode.READ_ONLY;

  var scopes = [];
  for (var i = 0; i < iterators.length; i++) {
    var stores = iterators[i].stores();
    for (var j = 0; j < stores.length; j++) {
      if (!goog.array.contains(scopes, stores[j])) {
        scopes.push(stores[j]);
      }
    }
  }

  var streamers = opt_streamers || [];
  for (var i = 0; i < streamers.length; i++) {
    var store = iterators[i].getStoreName();
    if (!goog.array.contains(scopes, store)) {
      scopes.push(store);
    }
  }

  this.exec(function(executor) {
    executor.scan(df, iterators, streamers, solver);
  }, scopes, tr_mode);

  return df;
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



