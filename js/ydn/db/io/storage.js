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
goog.require('ydn.db.LocalStorage');
goog.require('ydn.db.IndexedDb');
goog.require('ydn.db.MemoryStore');
goog.require('ydn.db.WebSql');
goog.require('ydn.object');
goog.require('ydn.db.ActiveQuery');
goog.require('ydn.db.RichStorage_');
goog.require('ydn.db.Core');


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
 * @param {!Object=} opt_options options.
 * @implements {ydn.db.QueryService}
 * @implements {ydn.db.QueryServiceProvider}
 * @extends {ydn.db.Core}
 * @constructor
 */
ydn.db.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);
};
goog.inherits(ydn.db.Storage, ydn.db.Core);


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
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

    this.db_ = null;
    if (goog.userAgent.product.ASSUME_CHROME ||
        goog.userAgent.product.ASSUME_FIREFOX) {
      // for dead-code elimination
      this.db_ = new ydn.db.IndexedDb(this.db_name, this.schema);
    } else if (goog.userAgent.product.ASSUME_SAFARI) {
      // for dead-code elimination
      this.db_ = new ydn.db.WebSql(this.db_name, this.schema);
    } else {
      // go according to ordering
      var preference = this.preference || ydn.db.Core.PREFERENCE;
      for (var i = 0; i < preference.length; i++) {
        var db_type = preference[i].toLowerCase();
        if (db_type == ydn.db.IndexedDbWrapper.TYPE && ydn.db.IndexedDbWrapper.isSupported()) { // run-time detection
          this.db_ = new ydn.db.IndexedDb(this.db_name, this.schema);
          break;
        } else if (db_type == ydn.db.WebSqlWrapper.TYPE && ydn.db.WebSqlWrapper.isSupported()) {
          this.db_ = new ydn.db.WebSql(this.db_name, this.schema);
          break;
        } else if (db_type == ydn.db.LocalStorage.TYPE && ydn.db.LocalStorage.isSupported()) {
          this.db_ = new ydn.db.LocalStorage(this.db_name, this.schema);
          break;
        } else if (db_type == ydn.db.SessionStorage.TYPE && ydn.db.SessionStorage.isSupported()) {
          this.db_ = new ydn.db.SessionStorage(this.db_name, this.schema);
          break;
        } else if (db_type == 'memory')  {
          this.db_ = new ydn.db.MemoryStore(this.db_name, this.schema);
          break;
        }
      }
      if (!this.db_) {
        throw Error('No database obtained for preference of ' + ydn.json.stringify(preference));
      }
    }

    if (this.deferredDb_.hasFired()) {
      this.deferredDb_ = new goog.async.Deferred();
    }
    this.deferredDb_.callback(this.db_);
  }
};



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
 * Return underlining database instance.
 * @return {ydn.db.QueryService} Database if exists.
 */
ydn.db.Storage.prototype.getQueryService = function() {
  return /** @type {ydn.db.QueryService} */ (this.db_) || null;
};


/**
 * @define {string} default key-value store name.
 */
ydn.db.Storage.DEFAULT_TEXT_STORE = 'default_text_store';


/**
 *
 * @param {string} secret
 * @param {number=} opt_expiration default expiration time in miliseconds.
 */
ydn.db.Storage.prototype.encrypt = function(secret, opt_expiration) {
  /**
   * @protected
   * @final
   * @type {ydn.db.RichStorage}
   */
  this.wrapper = new ydn.db.RichStorage(this, secret, opt_expiration);
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
  return new ydn.db.ActiveQuery(this, store_name, index, keyRange, direction);
};


/**
 * Put an object to the store.
 *
 * @export
 * @param {string} store_name the name of store to use.
 * @param {!Object|Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function. On error,
 * an {@code Error} object is return as received from the mechanism.
 */
ydn.db.Storage.prototype.put = function(store_name, value) {
  if (this.getQueryService()) {
    return this.getQueryService().put(store_name, value);
  } else {
    var df = new goog.async.Deferred();
    this.getDeferredDb().addCallback(function(db) {
      db.put(store_name, value).chainDeferred(df);
    });
    return df;
  }
};


/**
 * Retrieve an object.
 *
 * Note: This will not raise error to get non-existing object.
 * @export
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} store_name
 * The name of store to retrive object from.
 * @param {(string|number)=} opt_key the key of an object to be retrieved.
 * if not provided, all entries in the store will return.
 * @return {!goog.async.Deferred} return resulting object in deferred function.
 * If not found, {@code undefined} is return.
 */
ydn.db.Storage.prototype.get = function (store_name, opt_key) {

  if (this.getQueryService()) {
    return this.getQueryService().get(store_name, opt_key);
  } else {
    var df = new goog.async.Deferred();
    this.getDeferredDb().addCallback(function (db) {
      db.get(store_name, opt_key).chainDeferred(df);
    });
    return df;
  }
};


/**
 * Remove a specific entry or all entries from a store.
 *
 * @export
 * @param {string=} opt_store_name the store name to use.
 * If not provided all entries in the store will be cleared.
 * @param {(string|number)=} opt_key delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return {@code true} in the deferred function.
 */
ydn.db.Storage.prototype.clear = function(opt_store_name, opt_key) {
  if (this.getQueryService()) {
    return this.getQueryService().clear(opt_store_name, opt_key);
  } else {
    var df = new goog.async.Deferred();
    this.getDeferredDb().addCallback(function(db) {
      db.clear(opt_store_name, opt_key).chainDeferred(df);
    });
    return df;
  }
};


/**
 * Get number of items in a store.
 *
 * @export
 * @param {string=} opt_store_name store name, if not provided, count all entries
 * in the database.
 * @return {!goog.async.Deferred} return number of items in deferred function.
 */
ydn.db.Storage.prototype.count = function(opt_store_name) {
  if (this.getQueryService()) {
    return this.getQueryService().count(opt_store_name);
  } else {
    var df = new goog.async.Deferred();
    this.getDeferredDb().addCallback(function(db) {
      db.count(opt_store_name).chainDeferred(df);
    });
    return df;
  }
};


/**
 * Fetch result of a query and return as array.
 *
 * @export
 * @param {!ydn.db.Query} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @return {!goog.async.Deferred}
 */
ydn.db.Storage.prototype.fetch = function (q, limit, offset) {

  if (this.getQueryService()) {
    return this.getQueryService().fetch(q, limit, offset);
  } else {
    var df = new goog.async.Deferred();
    this.getDeferredDb().addCallback(function (db) {
      db.fetch(q, limit, offset).chainDeferred(df);
    });
    return df;
  }

};




goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);
goog.exportProperty(goog.async.Deferred.prototype, 'success',
  goog.async.Deferred.prototype.addCallback);
goog.exportProperty(goog.async.Deferred.prototype, 'error',
  goog.async.Deferred.prototype.addErrback);

//goog.exportProperty(ydn.db.Core.prototype, 'isReady',
//  ydn.db.Core.prototype.isReady);
goog.exportProperty(ydn.db.Core.prototype, 'type',
  ydn.db.Core.prototype.type);
goog.exportProperty(ydn.db.Core.prototype, 'setSchema',
  ydn.db.Core.prototype.setSchema);
goog.exportProperty(ydn.db.Core.prototype, 'setName',
  ydn.db.Core.prototype.setName);
goog.exportProperty(ydn.db.Core.prototype, 'getConfig',
  ydn.db.Core.prototype.getConfig);
// ActiveQuery do not need fetch, it is confusing if fetch in db.
//goog.exportProperty(ydn.db.Core.prototype, 'fetch',
//  ydn.db.Core.prototype.fetch);
goog.exportProperty(ydn.db.Core.prototype, 'transaction',
  ydn.db.Core.prototype.transaction);
goog.exportProperty(ydn.db.Core.prototype, 'close',
  ydn.db.Core.prototype.close);
// for hacker
goog.exportProperty(ydn.db.Core.prototype, 'db',
    ydn.db.Core.prototype.getDbInstance_);

goog.exportProperty(ydn.db.Storage.prototype, 'query',
  ydn.db.Storage.prototype.query);
//goog.exportProperty(ydn.db.Storage.prototype, 'key',
//  ydn.db.Storage.prototype.key);
goog.exportProperty(ydn.db.Storage.prototype, 'encrypt',
  ydn.db.Storage.prototype.encrypt);

goog.exportProperty(ydn.db.ActiveQuery.prototype, 'fetch',
  ydn.db.ActiveQuery.prototype.fetch);
goog.exportProperty(ydn.db.ActiveQuery.prototype, 'get',
  ydn.db.ActiveQuery.prototype.get);

goog.exportProperty(ydn.db.Query.prototype, 'starts',
  ydn.db.Query.prototype.startsWith);
goog.exportProperty(ydn.db.Query.prototype, 'bound',
  ydn.db.Query.prototype.bound);
goog.exportProperty(ydn.db.Query.prototype, 'only',
  ydn.db.Query.prototype.only);
goog.exportProperty(ydn.db.Query.prototype, 'lowerBound',
  ydn.db.Query.prototype.lowerBound);
goog.exportProperty(ydn.db.Query.prototype, 'upperBound',
  ydn.db.Query.prototype.upperBound);
goog.exportProperty(ydn.db.Query.prototype, 'select',
    ydn.db.Query.prototype.select);
goog.exportProperty(ydn.db.Query.prototype, 'where',
  ydn.db.Query.prototype.where);
goog.exportProperty(ydn.db.Query.prototype, 'sum',
    ydn.db.Query.prototype.sum);
goog.exportProperty(ydn.db.Query.prototype, 'count',
    ydn.db.Query.prototype.count);
goog.exportProperty(ydn.db.Query.prototype, 'average',
    ydn.db.Query.prototype.average);

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

goog.exportSymbol('ydn.async', ydn.async);
goog.exportProperty(ydn.async, 'dfl', ydn.async.dfl);

goog.exportSymbol('ydn.db.Key', ydn.db.Key);
goog.exportProperty(ydn.db.Key.prototype, 'parent', ydn.db.Key.prototype.parent);
