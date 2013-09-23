// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Provide encryption and expiring storage for string record.
 *
 * @author Kyaw Tun <kyawtun@yathit.com>
 */

goog.provide('ydn.db.rich.Storage');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.db.rich.RichStorage');




//
///**
// * Initialize suitable database if {@code dbname} and {@code schema} are set,
// * starting in the following order of preference.
// * @override
// */
//ydn.db.crud.Storage.prototype.initDatabase = function () {
//  // handle version change
//  if (goog.isDef(this.schema) &&
//    (ydn.db.base.ENABLE_DEFAULT_TEXT_STORE &&
//      !this.schema.hasStore(ydn.db.schema.Store.DEFAULT_TEXT_STORE))) {
//    this.schema.addStore(new ydn.db.schema.Store(
//      ydn.db.schema.Store.DEFAULT_TEXT_STORE, 'id'));
//  }
//  goog.base(this, 'initDatabase');
//};



/**
 *
 * @param {string} secret passphase.
 * @param {number=} opt_expiration default expiration time in miliseconds.
 */
ydn.db.crud.Storage.prototype.encrypt = function(secret, opt_expiration) {
  if (ydn.db.base.ENABLE_ENCRYPTION) {
    /**
     * @protected
     * @final
     * @type {ydn.db.rich.RichStorage}
     */
    this.wrapper = new ydn.db.rich.RichStorage(this, secret, opt_expiration);
  }
};


/**
 *
 * @return {ydn.db.rich.RichStorage} wrapper.
 */
ydn.db.crud.Storage.prototype.getWrapper = function() {
  return this.wrapper || null;
};




/**
 * @const
 * @type {StoreSchema}
 */
ydn.db.rich.Storage.KEY_VALUE_STORE_SCHEMA = /** @type {StoreSchema} */ ({
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
ydn.db.crud.Storage.prototype.setItem = function(key, value, opt_expiration) {

  var wrapper = this.getStorage().getWrapper();
  if (wrapper) {
    value = wrapper.wrapValue(key, value, opt_expiration);
  }
  var store = ydn.db.schema.Store.DEFAULT_TEXT_STORE;
  if (!this.schema.hasStore(ydn.db.schema.Store.DEFAULT_TEXT_STORE)) {
    if (this.schema.isAutoSchema()) {
      store = ydn.db.rich.Storage.KEY_VALUE_STORE_SCHEMA;
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
ydn.db.crud.Storage.prototype.removeItem = function(id) {

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
ydn.db.crud.Storage.prototype.getItem = function(key) {
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







