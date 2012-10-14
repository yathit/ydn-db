/**
* @fileoverview Light wrapper {@link ydn.db.Storage} using active transaction
* instance given at constructor.
*
*
*/


goog.provide('ydn.db.TxStorage');
goog.require('ydn.error.NotSupportedException');
goog.require('ydn.db.core.TxStorage');
goog.require('ydn.db.io.QueryService');
goog.require('ydn.db.req.IndexedDb');
goog.require('ydn.db.req.SimpleStore');
goog.require('ydn.db.req.WebSql');
goog.require('ydn.db.io.Cursor');



/**
 * @implements {ydn.db.io.QueryService}
 * @param {!ydn.db.Storage} storage
 * @param {number} ptx_no
 * @param {string} scope_name
 * @param {!ydn.db.DatabaseSchema} schema
 * @constructor
 * @extends {ydn.db.core.TxStorage}
*/
ydn.db.TxStorage = function(storage, ptx_no, scope_name, schema) {
  goog.base(this, storage, ptx_no, scope_name, schema);
};
goog.inherits(ydn.db.TxStorage, ydn.db.core.TxStorage);


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
  return this.put(ydn.db.StoreSchema.DEFAULT_TEXT_STORE,
    {'id': key, 'value': value});

};


/**
 * @param {string} store store name. If not defined, all object stores are used.
 * @param {ydn.db.Cursor.Direction=} direction cursor direction.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!KeyRangeJson|!ydn.db.KeyRange|!ydn.db.IDBKeyRange|string|number)=}
 *   keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given
 * @param {(string|number)=} upper
 * @param {boolean=} lowerOpen
 * @param {boolean=} upperOpen
 * @return {!ydn.db.io.Cursor}
 */
ydn.db.TxStorage.prototype.cursor = function(store, direction, index, keyRange, upper, lowerOpen, upperOpen) {
  return new ydn.db.io.Cursor(this, store, direction, index, keyRange, upper, lowerOpen, upperOpen);
};



/**
 * @param {string} sql_statement store name.
 * @return {!ydn.db.io.Query}
 */
ydn.db.TxStorage.prototype.query = function(sql_statement) {
  return new ydn.db.io.Query(this, sql_statement);
};


/**
 * Remove an item to default key-value store.
 * @export
 * @param {string} id item id to be remove.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.TxStorage.prototype.removeItem = function(id) {

  return this.clear(ydn.db.StoreSchema.DEFAULT_TEXT_STORE, id);

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
  var out = this.get(ydn.db.StoreSchema.DEFAULT_TEXT_STORE, key);
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



/**
 * @param {!ydn.db.Cursor} q the cursor.
 * @param {Array.<string>} scope list of store names.
 * @param {ydn.db.base.CursorMode=} mode open as readwrite operation. default is readonly.
 * @param {boolean=} resumed resume previous cursor position.
 * @return {!goog.async.Deferred}
 */
ydn.db.TxStorage.prototype.iterate = function(q, scope, mode, resumed) {
  var df = ydn.db.base.createDeferred();
  if (!(q instanceof ydn.db.Cursor)) {
    throw new ydn.error.ArgumentException();
  }

  var me = this;
  if (!scope) {
    scope = this.schema.getStoreNames();
  } else if (goog.isArray(scope)) {
    var idx = goog.array.findIndex(scope, function(x) {
      return !me.schema.hasStore(x);
    });
    if (idx >= 0) {
      throw new ydn.error.ArgumentException('Invalid store name: ' + scope[idx]);
    }

  } else {
    throw new ydn.error.ArgumentException('Invalid scope');
  }

  var tr_mode = ydn.db.base.TransactionMode.READ_ONLY;
  if (mode == ydn.db.base.CursorMode.READ_WRITE) {
    tr_mode = ydn.db.base.TransactionMode.READ_WRITE;
  }

  this.execute(function (executor) {
    executor.iterate(df, q, scope, mode, !!resumed);
  }, scope, tr_mode);

  return df;
};


/**
 * @param {!ydn.db.Cursor|!ydn.db.Query} q query.
 * @return {!goog.async.Deferred} return result as list.
 */
ydn.db.TxStorage.prototype.fetch = function(q) {

  var df = ydn.db.base.createDeferred();

  var query, cursor;
  if (q instanceof ydn.db.Query) {
    query = q;
    var store_name = query.getStoreName();
    var store = this.schema.getStore(store_name);
    if (!store) {
      throw new ydn.error.ArgumentException('store: ' + store_name +
        ' not exists.');
    }
    if (goog.isDefAndNotNull(query.index) && !store.hasIndex(query.index)) {
      throw new ydn.error.ArgumentException('Index: ' + query.index +
        ' not exists in store: ' + store_name);
    }

    this.execute(function (executor) {
      executor.fetchQuery(df, query);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY);

  } else if (q instanceof ydn.db.Cursor) {
    cursor = q;
    this.execute(function (executor) {
      executor.fetchCursor(df, cursor);
    }, [cursor.store_name], ydn.db.base.TransactionMode.READ_ONLY);

  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
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




