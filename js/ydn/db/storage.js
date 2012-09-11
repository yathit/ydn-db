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
goog.require('ydn.db.exe.LocalStorage');
goog.require('ydn.db.exe.IndexedDb');
goog.require('ydn.db.exe.MemoryStore');
goog.require('ydn.db.exe.WebSql');
goog.require('ydn.object');
goog.require('ydn.db.RichStorage_');
goog.require('ydn.db.tr.Storage');


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
 *
 * @param {function(!ydn.db.tr.QueryService)} callback
 * @override
 */
ydn.db.Storage.prototype.onReady = function(callback) {
  goog.base(this, 'onReady', /**
   @type {function(!ydn.db.tr.DbService)} */ (callback));
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
 * @type {ydn.db.exe.Executor}
 */
ydn.db.Storage.prototype.executor = null;


/**
 *
 * @param {string} scope callback function name as scope name
 * @throws {ydn.db.ScopeError}
 * @return {!ydn.db.exe.Executor}
 */
ydn.db.Storage.prototype.getExecutor = function (scope) {
  var service = this.getDb();
  goog.asserts.assertObject(service, 'how could this be');

  if (service.type() == ydn.db.adapter.IndexedDb.TYPE) {
    this.executor = new ydn.db.exe.IndexedDb();
  } else {
    throw new ydn.db.InternalError('No executor for ' + service.type());
  }

  if (!this.executor.isActive()) {
    throw new ydn.db.ScopeError(scope);
  }

  return this.executor;
};


/**
 * @throws {ydn.db.ScopeError}
 * @param {function(!ydn.db.exe.Executor)} callback
 */
ydn.db.Storage.prototype.execute = function(callback) {
  // only TxStorage has active executor.
  throw new ydn.db.ScopeError(callback.name);
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
   * @param {!ydn.db.exe.Executor} executor
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
        df.callback(this.getByStore(tx, arg1));
      } else if (goog.isArray(arg2)) {
        if (goog.isString(arg2[0]) || goog.isNumber(arg2[0])) {
          df.callback(this.getByIds_(tx, arg1, arg2));
        } else {
          throw new ydn.error.ArgumentException();
        }
      } else {
        throw new ydn.error.ArgumentException();
      }
    } else if (goog.isArray(arg1)) {
      if (arg1[0] instanceof ydn.db.Key) {
        df.callback(this.getByKeys_(tx, arg1));
      } else {
        throw new ydn.error.ArgumentException();
      }
    } else if (!goog.isDef(arg1) && !goog.isDef(arg2)) {
      df.callback(this.getByStore_(tx));
    } else {
      throw new ydn.error.ArgumentException();
    }
  };

  this.execute(get);
  return df;
};





/**
 * @override
 */
ydn.db.Storage.prototype.newTxInstance = function(tx) {
  return new ydn.db.TxStorage(this, tx);
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

goog.exportProperty(ydn.db.TQuery.prototype, 'fetch',
  ydn.db.TQuery.prototype.fetch);
goog.exportProperty(ydn.db.TQuery.prototype, 'get',
  ydn.db.TQuery.prototype.get);

goog.exportProperty(ydn.db.exe.Query.prototype, 'select',
    ydn.db.exe.Query.prototype.select);
goog.exportProperty(ydn.db.exe.Query.prototype, 'where',
  ydn.db.exe.Query.prototype.where);
goog.exportProperty(ydn.db.exe.Query.prototype, 'sum',
    ydn.db.exe.Query.prototype.sum);
goog.exportProperty(ydn.db.exe.Query.prototype, 'count',
    ydn.db.exe.Query.prototype.count);
goog.exportProperty(ydn.db.exe.Query.prototype, 'average',
    ydn.db.exe.Query.prototype.average);

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
