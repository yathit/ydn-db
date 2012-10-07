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



/**
 * @implements {ydn.db.io.QueryService}
 * @param {!ydn.db.Storage} storage
 * @param {number} ptx_no
 * @param {string} scope_name
 * @param {ydn.db.DatabaseSchema} schema
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
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {string=} direction cursor direction.
 * @param {(!KeyRangeJson|!ydn.db.KeyRange|!ydn.db.IDBKeyRange|string|number)=}
    * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given
 * @param {(string|number)=} upper
 * @param {boolean=} lowerOpen
 * @param {boolean=} upperOpen
 */
ydn.db.TxStorage.prototype.query = function(store, index, direction, keyRange, upper, lowerOpen, upperOpen) {
  return new ydn.db.io.Query(this, store, index, direction, keyRange, upper, lowerOpen, upperOpen);
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
 * @param {!ydn.db.Query} q query.
 * @param {number=} max
 * @param {number=} skip
 * @return {!goog.async.Deferred}
 */
ydn.db.TxStorage.prototype.fetch = function(q, max, skip) {
  var df = ydn.db.base.createDeferred();
  if (!(q instanceof ydn.db.Query)) {
    throw new ydn.error.ArgumentException();
  }

  var store = this.schema.getStore(q.store_name);
  if (!store) {
    throw new ydn.error.ArgumentException(q.store_name +
        ' not exists.');
  }
  if (goog.isDefAndNotNull(q.index) && !store.hasIndex(q.index)) {
    throw new ydn.error.ArgumentException('Index: ' + q.index +
        ' not exists in store: ' + q.store_name);
  }

  this.execute(function (executor) {
    executor.fetch(df, q, max, skip);
  }, [q.store_name], ydn.db.base.TransactionMode.READ_ONLY);

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




