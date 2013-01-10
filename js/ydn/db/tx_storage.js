/**
* @fileoverview Provide database query operations.
*
*
*/


goog.provide('ydn.db.TxStorage');
goog.require('ydn.db.sql.TxQueue');
goog.require('ydn.db.algo');
goog.require('ydn.error.NotSupportedException');


/**
 * @param {!ydn.db.Storage} storage storage.
 * @param {number} ptx_no transaction queue number.
 * @param {string} scope_name scope name.
 * @param {!ydn.db.schema.Database} schema  schema.
 * @constructor
 * @extends {ydn.db.sql.TxQueue}
*/
ydn.db.TxStorage = function(storage, ptx_no, scope_name, schema) {
  goog.base(this, storage, ptx_no, scope_name, schema);
};
goog.inherits(ydn.db.TxStorage, ydn.db.sql.TxQueue);


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




