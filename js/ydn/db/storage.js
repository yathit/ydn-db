/**
 * @license Copyright 2012 YDN Authors. All Rights Reserved.
 */
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
 * @fileoverview Wrappers for the all implemented Storage mechanisms.
 *
 * On application use, this is preferable over concrete storage implementation.
 * This wrapper has two purpose:
 * 1) select suitable supported storage mechanism and 2) deferred execute when
 * the database is not initialized. Database is initialized when dbname, version
 * and schema are set.
 *
 * Often, dbname involve login user identification and it is not available at
 * the time of application start up. Additionally schema may be prepared by
 * multiple module. This top level wrapper provide these use cases.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Storage');
goog.require('goog.userAgent.product');
goog.require('ydn.async');
goog.require('ydn.db.Html5Db');
goog.require('ydn.db.IndexedDb');
goog.require('ydn.db.MemoryStore');
goog.require('ydn.db.WebSql');
goog.require('ydn.object');
goog.require('ydn.db.tr.Key');
goog.require('ydn.db.ActiveQuery');
goog.require('ydn.db.RichStorage_');
goog.require('ydn.db.StorageCore');


/**
 * Create a suitable storage mechanism from indexdb, to websql to
 * localStorage.
 *
 * If database name and schema are provided, this will immediately initialize
 * the database and ready to use. However if any of these two are missing,
 * the database is not initialize until they are set by calling
 * {@link #setsetDbName} and {@link #setSchema}.
 * @see goog.db Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * schema used in chronical order.
 * @implements {ydn.db.QueryServiceProvider}
 * @extends {ydn.db.StorageCore}
 * @constructor
 */
ydn.db.Storage = function(opt_dbname, opt_schema) {
  goog.base(this, opt_dbname, opt_schema);
};
goog.inherits(ydn.db.Storage, ydn.db.StorageCore);


/**
 * Factory.
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.DatabaseSchema=} opt_schema database schema
 * @return {ydn.db.Storage}
 */
ydn.db.Storage.createInstance = function(opt_dbname, opt_schema) {
  return new ydn.db.Storage(opt_dbname, opt_schema);
};


/**
 * @define {string} default key-value store name.
 */
ydn.db.Storage.DEFAULT_TEXT_STORE = 'default_text_store';


/**
 *
 * @param {string} secret
 * @param {number=} expiration default expiration time in miliseconds.
 */
ydn.db.Storage.prototype.setSecret = function(secret, expiration) {
  /**
   * @protected
   * @final
   * @type {ydn.db.RichStorage}
   */
  this.wrapper = new ydn.db.RichStorage(this, secret, expiration);
};



/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * 1. IndexedDb
 * 2. Sqlite
 * 3. Html5Db
 * 4. MemoryStore
 * @protected
 * @override
 */
ydn.db.Storage.prototype.initDatabase = function() {
  // handle version change
  if (goog.isDef(this.db_name) && goog.isDef(this.schema)) {

    if (!goog.string.isEmpty(ydn.db.Storage.DEFAULT_TEXT_STORE) &&
      !this.schema.hasStore(ydn.db.Storage.DEFAULT_TEXT_STORE)) {
      this.schema.addStore(new ydn.db.StoreSchema(
        ydn.db.Storage.DEFAULT_TEXT_STORE, 'id'));
    }

    goog.base(this, 'initDatabase')
  }
};


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
ydn.db.Storage.prototype.setItem = function(key, value, opt_expiration) {

  if (this.wrapper) {
    value = this.wrapper.wrapValue(key, value, opt_expiration);
  }
  return this.put(ydn.db.Storage.DEFAULT_TEXT_STORE,
    {'id': key, 'value': value});

};


/**
 * Remove an item to default key-value store.
 * @export
 * @param {string} id item id to be remove.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Storage.prototype.removeItem = function(id) {

  return this.clear(ydn.db.Storage.DEFAULT_TEXT_STORE, id);

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
ydn.db.Storage.prototype.getItem = function(key) {
  var out = this.get(ydn.db.Storage.DEFAULT_TEXT_STORE, key);
  var df = new goog.async.Deferred();
  var me = this;
  out.addCallback(function(data) {
    if (goog.isDef(data)) {
      var value = data['value'];
      if (me.wrapper && goog.isDef(value)) {
        value = me.wrapper.unwrapValue(key, value);
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
 * @export
 * @param {string} store_name store name.
 * @param {string} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!ydn.db.Query.KeyRangeJson|!ydn.db.Query.IDBKeyRange|undefined)=}
  * keyRange configuration in
 * @param {string=} direction cursor direction.
 * @return {!ydn.db.ActiveQuery}
 */
ydn.db.Storage.prototype.query = function(store_name, index, keyRange,
                                          direction) {
  var store = this.schema.getStore(store_name);
  if (!store) {
    throw Error('Store: ' + store_name + ' not exist.');
  }
  if (!goog.isDef(index)) {
    if (store.indexes.length == 0) {
      throw Error('Store: ' + store_name + ' has no index.');
    }
    var key_index = store.getIndex(/** @type {string} */ (store.keyPath));
    index = /** @type {string} */
        (key_index ? store.keyPath : store.indexes[0]);
  }
  return new ydn.db.ActiveQuery(this, store_name, index, keyRange, direction);
};


/**
 * @export
 * @param {string} store
 * @param {(string|number)}id
 * @param {ydn.db.Key=} opt_parent
 * @return {!ydn.db.tr.Key}
 */
ydn.db.Storage.prototype.tkey = function(store, id, opt_parent) {
  return new ydn.db.tr.Key(this, store, id, opt_parent);
};


/**
 * @export
 * @param {string} store
 * @param {(string|number)}id
 * @param {ydn.db.Key=} opt_parent
 * @return {!ydn.db.ActiveKey}
 */
ydn.db.Storage.prototype.key = function(store, id, opt_parent) {
  return new ydn.db.ActiveKey(this, store, id, opt_parent);
};



goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);
goog.exportProperty(goog.async.Deferred.prototype, 'success',
  goog.async.Deferred.prototype.addCallback);
goog.exportProperty(goog.async.Deferred.prototype, 'error',
  goog.async.Deferred.prototype.addErrback);

// somehow these methods are not exported via @export annotation
goog.exportProperty(ydn.db.StorageCore.prototype, 'isReady',
  ydn.db.StorageCore.prototype.isReady);
goog.exportProperty(ydn.db.StorageCore.prototype, 'setSchema',
  ydn.db.StorageCore.prototype.setSchema);
goog.exportProperty(ydn.db.StorageCore.prototype, 'setDbName',
  ydn.db.StorageCore.prototype.setDbName);
goog.exportProperty(ydn.db.Storage.prototype, 'tkey',
  ydn.db.Storage.prototype.tkey);
goog.exportProperty(ydn.db.Storage.prototype, 'query',
  ydn.db.Storage.prototype.query);
goog.exportProperty(ydn.db.StorageCore.prototype, 'fetch',
  ydn.db.StorageCore.prototype.fetch);
goog.exportProperty(ydn.db.StorageCore.prototype, 'runInTransaction',
  ydn.db.StorageCore.prototype.runInTransaction);

goog.exportProperty(ydn.db.ActiveQuery.prototype, 'fetch',
  ydn.db.ActiveQuery.prototype.fetch);
goog.exportProperty(ydn.db.ActiveQuery.prototype, 'get',
  ydn.db.ActiveQuery.prototype.get);
goog.exportProperty(ydn.db.ActiveQuery.prototype, 'put',
  ydn.db.ActiveQuery.prototype.put);

goog.exportProperty(ydn.db.Query.prototype, 'where',
  ydn.db.Query.prototype.where);

//goog.exportProperty(ydn.db.ActiveKey.prototype, 'clear',
//  ydn.db.ActiveKey.prototype.clear);

goog.exportProperty(ydn.db.Query.KeyRangeImpl, 'bound',
  ydn.db.Query.KeyRangeImpl.bound);
goog.exportProperty(ydn.db.Query.KeyRangeImpl, 'upperBound',
  ydn.db.Query.KeyRangeImpl.upperBound);
goog.exportProperty(ydn.db.Query.KeyRangeImpl, 'lowerBound',
  ydn.db.Query.KeyRangeImpl.lowerBound);
goog.exportProperty(ydn.db.Query.KeyRangeImpl, 'only',
  ydn.db.Query.KeyRangeImpl.only);

goog.exportProperty(ydn.async.dfl, 'dfl', ydn.async.dfl);
