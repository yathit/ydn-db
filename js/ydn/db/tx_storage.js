/**
* @fileoverview Provide database query operations.
*
*
*/


goog.provide('ydn.db.TxStorage');
goog.require('ydn.db.index.TxStorage');
goog.require('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.core.req.SimpleStore');
goog.require('ydn.db.core.req.WebSql');
goog.require('ydn.db.algo');
goog.require('ydn.error.NotSupportedException');


/**
 * @param {!ydn.db.Storage} storage storage.
 * @param {number} ptx_no transaction queue number.
 * @param {string} scope_name scope name.
 * @param {!ydn.db.schema.Database} schema  schema.
 * @constructor
 * @extends {ydn.db.index.TxStorage}
*/
ydn.db.TxStorage = function(storage, ptx_no, scope_name, schema) {
  goog.base(this, storage, ptx_no, scope_name, schema);
};
goog.inherits(ydn.db.TxStorage, ydn.db.index.TxStorage);


/**
 * @const
 * @type {StoreSchema}
 */
ydn.db.TxStorage.KEY_VALUE_STORE_SCHEMA = /** @type {StoreSchema} */ ({
  'name': ydn.db.schema.Store.DEFAULT_TEXT_STORE,
  'keyPath': 'id',
  'type': ydn.db.schema.DataType.TEXT});


/**
 * Store a value to default key-value store.
 * @export
 * @param {string} key The key to set.
 * @param {string} value The value to save.
 * @param {number=} opt_expiration The number of miliseconds since epoch
 *     (as in goog.now()) when the value is to expire. If the expiration
 *     time is not provided, the value will persist as long as possible.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.TxStorage.prototype.setItem = function(key, value, opt_expiration) {

  var wrapper = this.getStorage().getWrapper();
  if (wrapper) {
    value = wrapper.wrapValue(key, value, opt_expiration);
  }
  var store = ydn.db.schema.Store.DEFAULT_TEXT_STORE;
  if (!this.schema.hasStore(ydn.db.schema.Store.DEFAULT_TEXT_STORE)) {
    if (this.schema.isAutoSchema()) {
      store = ydn.db.TxStorage.KEY_VALUE_STORE_SCHEMA;
    } else {
      throw new ydn.error.ArgumentException('key-value store not in used.');
    }
  }
  return this.put(store,
    {'id': key, 'value': value});

};


/**
 * Remove an item to default key-value store.
 * @export
 * @param {string} id item id to be remove.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.TxStorage.prototype.removeItem = function(id) {

  return this.clear(ydn.db.schema.Store.DEFAULT_TEXT_STORE, id);

};


/**
 * Retrieve a value from default key-value store.
 *
 * Note: This will not raise error to get non-existing object.
 * @export
 * @param {string} key The key to get.
 * @return {!goog.async.Deferred} return resulting object in deferred function.
 * If not found, {@code undefined} is return.
 */
ydn.db.TxStorage.prototype.getItem = function(key) {
  // if the table not exist, <code>get</code> will throw error.
  var out = this.get(ydn.db.schema.Store.DEFAULT_TEXT_STORE, key);
  var df = new goog.async.Deferred();
  var me = this;
  out.addCallback(function(data) {
    if (goog.isDef(data)) {
      var value = data['value'];
      var wrapper = me.getStorage().getWrapper();
      if (wrapper && goog.isDef(value)) {
        value = wrapper.unwrapValue(key, value);
      }
      df.callback(value);
    } else {
      df.callback(undefined);
    }
  });
  out.addErrback(function(data) {
    df.errback(data);
  });
  return df;
};


//
///**
// * @param {!ydn.db.Iterator} q query.
// * @param {function(*): boolean} clear clear iteration function.
// * @param {function(*): *} update update iteration function.
// * @param {function(*): *} map map iteration function.
// * @param {function(*, *, number=): *} reduce reduce iteration function.
// * @param {*} initial initial value for reduce iteration function.
// * @param {?function(*): *} finalize finalize function.
// * @return {!goog.async.Deferred} promise.
// */
//ydn.db.TxStorage.prototype.iterate = function(q, clear, update, map, reduce,
//                                              initial, finalize) {
//  var df = ydn.db.base.createDeferred();
//  if (!(q instanceof ydn.db.Iterator)) {
//    throw new ydn.error.ArgumentException();
//  }
//
//  var tr_mode = ydn.db.base.TransactionMode.READ_ONLY;
//  if (goog.isDef(clear) || goog.isDef(update)) {
//    tr_mode = ydn.db.base.TransactionMode.READ_WRITE;
//  }
//
//  var scope = goog.isDef(q.index) ?
//    [q.index] : this.schema.getStoreNames();
//
//
//  this.exec(function(executor) {
//    executor.iterate(df, q, clear, update, map, reduce, initial, finalize);
//  }, scope, tr_mode);
//
//  return df;
//};


/**
 * Cursor scan iteration.
 * @param {!Array.<!ydn.db.Iterator>} iterators the cursor.
 * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): !Array} solver
 * solver.
 * @param {!Array.<!ydn.db.Streamer>=} opt_streamers streamers.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.TxStorage.prototype.scan = function(iterators, solver, opt_streamers) {
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


//
//
///**
// * @param {!ydn.db.Iterator|!ydn.db.Sql} q query.
// * @return {!goog.async.Deferred} return result as list.
// */
//ydn.db.TxStorage.prototype.fetch = function(q) {
//
//  var df = ydn.db.base.createDeferred();
//
//  var query, cursor;
//  if (q instanceof ydn.db.Sql) {
//    query = q;
//    var store_name = query.getStoreName();
//    var store = this.schema.getStore(store_name);
//    if (!store) {
//      throw new ydn.error.ArgumentException('store: ' + store_name +
//        ' not exists.');
//    }
//    if (goog.isDefAndNotNull(query.index) && !store.hasIndex(query.index)) {
//      throw new ydn.error.ArgumentException('Index: ' + query.index +
//        ' not exists in store: ' + store_name);
//    }
//
//    this.exec(function(executor) {
//      executor.fetchQuery(df, query);
//    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY);
//
//  } else if (q instanceof ydn.db.Iterator) {
//    cursor = q;
//    this.exec(function(executor) {
//      executor.fetchCursor(df, cursor);
//    }, [cursor.store_name], ydn.db.base.TransactionMode.READ_ONLY);
//
//  } else {
//    throw new ydn.error.ArgumentException();
//  }
//
//  return df;
//};



/**
 * Explain query plan.
 * @param {!ydn.db.Iterator} q
 * @return {Object} plan in JSON
 */
ydn.db.TxStorage.prototype.explain = function (q) {
  if (!this.executor) {
    return {'error':'database not ready'};
  } else if (q instanceof ydn.db.Sql) {
    return this.getExecutor().explainSql(q);
  } else {
    throw new ydn.error.ArgumentException();
  }
};


/**
*
* @param {!ydn.db.Iterator} iterator
* @param {function(*)} callback
*/
ydn.db.TxStorage.prototype.map = function(iterator, callback) {

};


/**
*
* @param {!ydn.db.Iterator} iterator
* @param {function(*)} callback
* @param {*=} initial
*/
ydn.db.TxStorage.prototype.reduce = function(iterator, callback, initial) {

};



/** @override */
ydn.db.TxStorage.prototype.toString = function() {
  var s = 'TxStorage:' + this.getStorage().getName();
  if (goog.DEBUG) {
    var scope = this.getScope();
    scope = scope ? '[' + scope + ']' : '';
    var mu = this.getMuTx().getScope();
    var mu_scope = mu ? '[' + mu + ']' : '';
    return s + ':' + this.q_no_ + scope + ':' + this.getTxNo() + mu_scope;
  }
  return s;
};




