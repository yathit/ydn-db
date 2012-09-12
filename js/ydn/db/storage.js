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
goog.require('ydn.db.req.IndexedDb');
goog.require('ydn.db.req.SimpleStore');
goog.require('ydn.db.req.WebSql');
goog.require('ydn.object');
goog.require('ydn.db.RichStorage_');
goog.require('ydn.db.tr.Storage');
goog.require('ydn.db.TxStorage');
goog.require('ydn.db.IStorage');
goog.require('ydn.db.io.QueryService');
goog.require('ydn.db.io.QueryServiceProvider');


/**
 * Create a suitable storage mechanism from indexdb, to websql to
 * localStorage.
 *
 * If database name and schema are provided, this will immediately initialize
 * the database and ready to use. However if any of these two are missing,
 * the database is not initialize until they are set by calling
 * {@link #setName} and {@link #setSchema}.
 * @see goog.db Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * @param {!Object=} opt_options options.
 * @implements {ydn.db.IStorage}
 * @extends {ydn.db.tr.Storage}
 * @constructor
 */
ydn.db.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);
};
goog.inherits(ydn.db.Storage, ydn.db.tr.Storage);


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * @override
 */
ydn.db.Storage.prototype.initDatabase = function () {
  // handle version change
  if (goog.isDef(this.schema) &&
    (!goog.string.isEmpty(ydn.db.Storage.DEFAULT_TEXT_STORE) &&
      !this.schema.hasStore(ydn.db.Storage.DEFAULT_TEXT_STORE))) {
    this.schema.addStore(new ydn.db.StoreSchema(
      ydn.db.Storage.DEFAULT_TEXT_STORE, 'id'));
  }
  goog.base(this, 'initDatabase');
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
 * @type {ydn.db.req.AbstractRequestExecutor}
 */
ydn.db.Storage.prototype.executor = null;


/**
 *
 * @param {string} scope callback function name as scope name
 * @throws {ydn.db.ScopeError}
 * @return {!ydn.db.req.AbstractRequestExecutor}
 */
ydn.db.Storage.prototype.getExecutor = function (scope) {

  var type = this.type();
  if (type == ydn.db.adapter.IndexedDb.TYPE) {
    this.executor = new ydn.db.req.IndexedDb();
  } else if (type == ydn.db.adapter.WebSql.TYPE) {
    this.executor = new ydn.db.req.WebSql();
  } else if (type == ydn.db.adapter.SimpleStorage.TYPE ||
    type == ydn.db.adapter.LocalStorage.TYPE ||
    type == ydn.db.adapter.SessionStorage.TYPE) {
    this.executor = new ydn.db.req.SimpleStorage();
  } else {
    throw new ydn.db.InternalError('No executor for ' + type);
  }

  return this.executor;
};


/**
 * @throws {ydn.db.ScopeError}
 * @param {function(!ydn.db.req.AbstractRequestExecutor)} callback
 */
ydn.db.Storage.prototype.execute = function(callback, scope, store_names, mode)
{
  var me = this;
  var executor = this.getExecutor(scope);
  if (!executor.isActive()) {
    // invoke in non-transaction context
    // create a new transaction and close
    var tx_callback = function(idb) {
      // transaction should be active now
      executor = me.getExecutor(scope);
      if (!executor.isActive()) {
        throw new ydn.db.InternalError();
      }
      callback(executor);
      idb.setDone(); // explicitly told not to use this transaction again.
    };
    tx_callback.name = scope; // scope name
    this.transaction(tx_callback, store_names, mode);
  } else {
    // call within a transaction
    // continue to use existing transaction
    callback(executor);
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
 * Return object
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(string|number|!Array.<string>)=} arg2 object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Storage.prototype.get = function (arg1, arg2) {

  var df = ydn.db.createDeferred;

  /**
   *
   * @param {!ydn.db.req.AbstractRequestExecutor} executor
   */
  var get = function(executor) {

    if (arg1 instanceof ydn.db.Key) {
      /**
       * @type {ydn.db.Key}
       */
      var k = arg1;
      df.callback(executor.getById(k.getStoreName(), k.getId()));
    } else if (goog.isString(arg1)) {
      if (goog.isString(arg2) || goog.isNumber(arg2)) {
        /** @type {string} */
        var store_name = arg1;
        /** @type {string|number} */
        var id = arg2;
        df.callback(this.getById(store_name, id));
      } else if (!goog.isDef(arg2)) {
        df.callback(this.getByStore(arg1));
      } else if (goog.isArray(arg2)) {
        if (goog.isString(arg2[0]) || goog.isNumber(arg2[0])) {
          df.callback(this.getByIds(arg1, arg2));
        } else {
          throw new ydn.error.ArgumentException();
        }
      } else {
        throw new ydn.error.ArgumentException();
      }
    } else if (goog.isArray(arg1)) {
      if (arg1[0] instanceof ydn.db.Key) {
        df.callback(this.getByKeys(arg1));
      } else {
        throw new ydn.error.ArgumentException();
      }
    } else if (!goog.isDef(arg1) && !goog.isDef(arg2)) {
      df.callback(this.getByStore());
    } else {
      throw new ydn.error.ArgumentException();
    }
  };

  this.execute(get);
  return df;
};






goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);
goog.exportProperty(goog.async.Deferred.prototype, 'success',
  goog.async.Deferred.prototype.addCallback);
goog.exportProperty(goog.async.Deferred.prototype, 'error',
  goog.async.Deferred.prototype.addErrback);

//goog.exportProperty(ydn.db.core.Storage.prototype, 'isReady',
//  ydn.db.core.Storage.prototype.isReady);
goog.exportProperty(ydn.db.core.Storage.prototype, 'type',
  ydn.db.core.Storage.prototype.type);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setSchema',
  ydn.db.core.Storage.prototype.setSchema);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setName',
  ydn.db.core.Storage.prototype.setName);
goog.exportProperty(ydn.db.core.Storage.prototype, 'getConfig',
  ydn.db.core.Storage.prototype.getConfig);
// ActiveQuery do not need fetch, it is confusing if fetch in db.
//goog.exportProperty(ydn.db.core.Storage.prototype, 'fetch',
//  ydn.db.core.Storage.prototype.fetch);
goog.exportProperty(ydn.db.core.Storage.prototype, 'transaction',
  ydn.db.core.Storage.prototype.transaction);
goog.exportProperty(ydn.db.core.Storage.prototype, 'close',
  ydn.db.core.Storage.prototype.close);
// for hacker
goog.exportProperty(ydn.db.core.Storage.prototype, 'db',
    ydn.db.core.Storage.prototype.getDbInstance_);

goog.exportProperty(ydn.db.Storage.prototype, 'query',
  ydn.db.Storage.prototype.query);
//goog.exportProperty(ydn.db.Storage.prototype, 'key',
//  ydn.db.Storage.prototype.key);
goog.exportProperty(ydn.db.Storage.prototype, 'encrypt',
  ydn.db.Storage.prototype.encrypt);

goog.exportProperty(ydn.db.io.Query.prototype, 'fetch',
  ydn.db.io.Query.prototype.fetch);
goog.exportProperty(ydn.db.io.Query.prototype, 'get',
  ydn.db.io.Query.prototype.get);

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

goog.exportProperty(ydn.db.KeyRangeImpl, 'bound',
  ydn.db.KeyRangeImpl.bound);
goog.exportProperty(ydn.db.KeyRangeImpl, 'upperBound',
  ydn.db.KeyRangeImpl.upperBound);
goog.exportProperty(ydn.db.KeyRangeImpl, 'lowerBound',
  ydn.db.KeyRangeImpl.lowerBound);
goog.exportProperty(ydn.db.KeyRangeImpl, 'only',
  ydn.db.KeyRangeImpl.only);

goog.exportSymbol('ydn.async', ydn.async);
goog.exportProperty(ydn.async, 'dfl', ydn.async.dfl);

goog.exportSymbol('ydn.db.Key', ydn.db.Key);
goog.exportProperty(ydn.db.Key.prototype, 'parent', ydn.db.Key.prototype.parent);
