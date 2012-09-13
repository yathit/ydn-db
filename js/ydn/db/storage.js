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
goog.require('ydn.db.io.Query');
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
 * @implements {ydn.db.io.QueryService}
 * @extends {ydn.db.tr.Storage}
 * @constructor *
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
 * @override
 */
ydn.db.Storage.prototype.init = function() {
  var type = this.type();
  if (type == ydn.db.adapter.IndexedDb.TYPE) {
    this.executor = new ydn.db.req.IndexedDb(this.db_name, this.schema);
  } else if (type == ydn.db.adapter.WebSql.TYPE) {
    this.executor = new ydn.db.req.WebSql(this.db_name, this.schema);
  } else if (type == ydn.db.adapter.SimpleStorage.TYPE ||
      type == ydn.db.adapter.LocalStorage.TYPE ||
      type == ydn.db.adapter.SessionStorage.TYPE) {
    this.executor = new ydn.db.req.SimpleStore(this.db_name, this.schema);
  } else {
    throw new ydn.db.InternalError('No executor for ' + type);
  }
  goog.base(this, 'init');
};


/**
 * Inject transaction instance to the executor.
 * @override
 */
ydn.db.Storage.prototype.newTxInstance = function(scope) {
  var tx_db = new ydn.db.TxStorage(this, scope);
  var tx = this.getMuTx().getTx();
  this.executor.setTx(tx, scope);
  return tx_db;
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
 * @type {!ydn.db.req.RequestExecutor}
 */
ydn.db.Storage.prototype.executor;


/**
 *
 * @throws {ydn.db.ScopeError}
 * @return {!ydn.db.req.RequestExecutor}
 */
ydn.db.Storage.prototype.getExecutor = function () {
  goog.asserts.assertObject(this.executor);
  return this.executor;
};


/**
 * @throws {ydn.db.ScopeError}
 * @param {function(!ydn.db.req.RequestExecutor)} callback
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'readonly'.
 */
ydn.db.Storage.prototype.execute = function(callback, store_names, mode)
{
  var me = this;
  var scope = '?';
  if (!this.getMuTx().isActiveAndAvailable()) {
    // invoke in non-transaction context
    // create a new transaction and close
    var tx_callback = function(idb) {
      // transaction should be active now
      if (!me.getMuTx().isActiveAndAvailable()) {
        throw new ydn.db.InternalError();
      }
      callback(me.executor);
      idb.lock(); // explicitly told not to use this transaction again.
    };
    tx_callback.name = scope; // scope name
    this.transaction(tx_callback, store_names, mode);
  } else {
    // call within a transaction
    // continue to use existing transaction
    callback(me.executor);
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
 * @param {string} store store name.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!ydn.db.KeyRangeJson|!ydn.db.KeyRange|undefined)=}
  * keyRange configuration in
 * json format.
 * @param {string=} direction cursor direction.
 */
ydn.db.Storage.prototype.query = function(store, index, keyRange, direction) {
  return new ydn.db.io.Query(this, store, index, keyRange, direction);
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
 * Remove a specific entry from a store or all.
 * @param {(!Array.<string>|string)=} arg1 delete the table as provided otherwise
 * delete all stores.
 * @param {(string|number)=} arg2 delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Storage.prototype.clear = function(arg1, arg2) {

  var df = ydn.db.createDeferred();

  if (goog.isString(arg1)) {
    var store_name = arg1;
    if (goog.isString(arg2) || goog.isNumber(arg2)) {
      var id = arg2;
      this.execute(function(executor) {
        executor.clearById(df, store_name, id);
      }, [store_name], ydn.db.TransactionMode.READ_WRITE);
    } else if (!goog.isDef(arg2)) {
      this.execute(function(executor) {
        executor.clearByStore(df, store_name);
      }, [store_name], ydn.db.TransactionMode.READ_WRITE);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (goog.isArray(arg1) && goog.isString(arg1[0])) {
    var store_names = arg1;
    this.execute(function(executor) {
      executor.clearByStore(df, store_names);
    }, [store_names], ydn.db.TransactionMode.READ_WRITE);
  } else if (!goog.isDef(arg1)) {
    var store_names = this.schema.getStoreNames();
    this.execute(function(executor) {
      executor.clearByStore(df, store_names);
    }, [store_names], ydn.db.TransactionMode.READ_WRITE);
  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};


/**
 *
 * @param {string} store_name
 */
ydn.db.Storage.prototype.count = function(store_name) {
  var df = ydn.db.createDeferred();
  var count = function(executor) {
    executor.count(df, store_name);
  };
  this.execute(count, [store_name], ydn.db.TransactionMode.READ_ONLY);
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

  var df = ydn.db.createDeferred();


  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {ydn.db.Key}
     */
    var k = arg1;
    var store = k.getStoreName();
    var kid = k.getId();
    this.execute(function (executor) {
      executor.getById(df, store, kid);
    }, [store], ydn.db.TransactionMode.READ_ONLY);
  } else if (goog.isString(arg1)) {
    var store_name = arg1;
    if (goog.isString(arg2) || goog.isNumber(arg2)) {
      /** @type {string} */
      /** @type {string|number} */
      var id = arg2;
      this.execute(function (executor) {
        executor.getById(df, store_name, id);
      }, [store_name], ydn.db.TransactionMode.READ_ONLY);
    } else if (!goog.isDef(arg2)) {
      this.execute(function (executor) {
        executor.getByStore(df, store_name);
      }, [store_name], ydn.db.TransactionMode.READ_ONLY);

    } else if (goog.isArray(arg2)) {
      if (goog.isString(arg2[0]) || goog.isNumber(arg2[0])) {
        var ids = arg2;
        this.execute(function (executor) {
          executor.getByIds(df, store_name, ids);
        }, [store_name], ydn.db.TransactionMode.READ_ONLY);
      } else {
        throw new ydn.error.ArgumentException();
      }
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (goog.isArray(arg1)) {
    if (arg1[0] instanceof ydn.db.Key) {
      var store_names = [];
      /**
       * @type {!Array.<!ydn.db.Key>}
       */
      var keys = arg1;
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!goog.array.contains(store_names, key.getStoreName())) {
          store_names.push(key.getStoreName());
        }
      }
      this.execute(function (executor) {
        executor.getByKeys(df, keys);
      }, store_names, ydn.db.TransactionMode.READ_ONLY);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (!goog.isDef(arg1) && !goog.isDef(arg2)) {
    this.execute(function (executor) {
      executor.getByStore(df);
    }, this.schema.getStoreNames(), ydn.db.TransactionMode.READ_ONLY);
  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};



/**
 * Execute PUT request either storing result to tx or callback to df.
 * @param {string} store_name table name.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred}
 */
ydn.db.Storage.prototype.put = function (store_name, value) {

  var df = ydn.db.createDeferred();
  var me = this;
  if (goog.isString(store_name)) {
    goog.asserts.assert(this.schema.hasStore(store_name), 'Store: ' +
      store_name + ' not exists.');
    if (goog.isArray(value)) {
      var objs = value;
      this.execute(function (executor) {
        executor.putObjects(df, store_name, objs);
      }, [store_name], ydn.db.TransactionMode.READ_WRITE);
    } else if (goog.isObject(value)) {
      var obj = value;
      this.execute(function (executor) {
        executor.putObject(df, store_name, obj);
      }, [store_name], ydn.db.TransactionMode.READ_WRITE);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};


/**
 * @param {!ydn.db.Query} q query.
 * @param {number=} max
 * @param {number=} skip
 * @return {!goog.async.Deferred}
 */
ydn.db.Storage.prototype.fetch = function(q, max, skip) {
  var df = ydn.db.createDeferred();
  if (!(q instanceof ydn.db.Query)) {
    throw new ydn.error.ArgumentException();
  }
  goog.asserts.assert(this.schema.hasStore(q.store_name), q.store_name +
      ' not exists.');

  this.execute(function (executor) {
    executor.fetch(df, q, max, skip);
  }, [q.store_name], ydn.db.TransactionMode.READ_ONLY);

  return df;
};


/** @override */
ydn.db.Storage.prototype.toString = function() {
  if (goog.DEBUG) {
    var scope = this.getMuTx().getScope();
    scope = scope ? ' [' + scope + ']' : '';
    return this.db_name + ':' + this.getTxNo() + scope;
  }
  return ydn.db.Storage + ':' + this.db_name;
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


//goog.exportProperty(ydn.db.Storage.prototype, 'query',
//  ydn.db.Storage.prototype.query);
//goog.exportProperty(ydn.db.Storage.prototype, 'key',
//  ydn.db.Storage.prototype.key);
goog.exportProperty(ydn.db.Storage.prototype, 'encrypt',
  ydn.db.Storage.prototype.encrypt);

//goog.exportProperty(ydn.db.io.Query.prototype, 'fetch',
//  ydn.db.io.Query.prototype.fetch);
//goog.exportProperty(ydn.db.io.Query.prototype, 'get',
//  ydn.db.io.Query.prototype.get);

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
