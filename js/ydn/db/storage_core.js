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

goog.provide('ydn.db.StorageCore');
goog.require('goog.userAgent.product');
goog.require('ydn.async');
goog.require('ydn.db.LocalStorage');
goog.require('ydn.db.IndexedDb');
goog.require('ydn.db.MemoryStore');
goog.require('ydn.db.WebSql');
goog.require('ydn.object');


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
 * @param {!Object=} opt_options options.
 * @implements {ydn.db.Db}
 * @implements {ydn.db.QueryServiceProvider}
 * @constructor
 */
ydn.db.StorageCore = function(opt_dbname, opt_schema, opt_options) {

  /**
   * @private
   * @type {ydn.db.Db} db instance.
   */
  this.db_ = null;

  var options = opt_options || {};

  this.preference = options['preference'];


  /**
   * @private
   * @type {!goog.async.Deferred} deferred db instance.
   */
  this.deferredDb_ = new goog.async.Deferred();

  this.setSchema(opt_schema || {});

  if (goog.isDef(opt_dbname)) {
    this.setName(opt_dbname);
  }
};


/**
 * Factory.
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.DatabaseSchema=} opt_schema database schema
 * @return {ydn.db.StorageCore}
 */
ydn.db.StorageCore.createInstance = function(opt_dbname, opt_schema) {
  return new ydn.db.StorageCore(opt_dbname, opt_schema);
};



/**
 * Get configuration of this storage. This is useful from getting storage from
 * main thread to worker thread.
 * <pre>
 *   var db = new ydn.db.StorageCore(...);
 *   ... initialize ...
 *   var config = db.getConfig();
 *
 *   ... in worker thread ...
 *   var worker_db = new ydn.db.StorageCore(config.db_name, config.schema);
 * </pre>
 * In this way, data can be share between the two threads.
 * @export
 * @return {{name: string, schema: !Object}?} configuration
 * containing database and list of schema in JSON format.
 */
ydn.db.StorageCore.prototype.getConfig = function() {
  if (!this.schema) {
    return null;
  }

  return {
    'name': this.db_name,
    'schema': /** @type {!Object} */ (this.schema.toJSON())
  };
};


/**
 * Set database. This will initialize the database.
 * @export
 * @throws {Error} if database is already initialized.
 * @param {string} opt_db_name set database name.
 * @return {string} normalized database name.
 */
ydn.db.StorageCore.prototype.setName = function(opt_db_name) {
  if (this.db_) {
    throw Error('DB already initialized');
  }
  /**
   * @final
   * @type {string}
   */
  this.db_name = opt_db_name.replace(/[@|\.|\s]/g, '');
  this.initDatabase();
  return this.db_name;
};


/**
 * Set the latest version of database schema. This will start initialization if
 * database name have been set. The the database is already initialized,
 * this will issue version change event and migrate to the schema.
 * @export
 * @see {@link #addTableSchema}
 * @param {!ydn.db.DatabaseSchema|!Object} schema set the last schema or its
 * configuration in JSON format.
 */
ydn.db.StorageCore.prototype.setSchema = function(schema) {

  if (!(schema instanceof ydn.db.DatabaseSchema)) {
    schema = ydn.db.DatabaseSchema.fromJSON(schema);
  }

  /**
   * @final
   * @protected
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = schema;

  if (!this.isReady()) {
    this.initDatabase();
  } else {
    var me = this;
    var df = this.db_.close();
    df.addCallback(function(e) {
      me.initDatabase();
    });
  }
};


/**
 * Specified storage mechanism ordering.
 * The default represent
 * IndexedDB, WebSql, localStorage and in-memory store.
 * @const
 * @type {!Array.<string>}
 */
ydn.db.StorageCore.PREFERENCE = [ydn.db.IndexedDbWrapper.TYPE,
  ydn.db.WebSqlWrapper.TYPE,
  ydn.db.LocalStorage.TYPE,
  ydn.db.SessionStorage.TYPE, 'memory'];


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * 1. IndexedDb
 * 2. Sqlite
 * 3. Html5Db
 * 4. MemoryStore
 * @protected
 */
ydn.db.StorageCore.prototype.initDatabase = function() {
  // handle version change
  if (goog.isDef(this.db_name) && goog.isDef(this.schema)) {
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
      var preference = this.preference || ydn.db.StorageCore.PREFERENCE;
      for (var i = 0; i < preference.length; i++) {
        var db_type = preference[i].toLowerCase();
        if (db_type == ydn.db.IndexedDbWrapper.TYPE && ydn.db.IndexedDb.isSupported()) { // run-time detection
          this.db_ = new ydn.db.IndexedDb(this.db_name, this.schema);
          break;
        } else if (db_type == ydn.db.WebSqlWrapper.TYPE && ydn.db.WebSql.isSupported()) {
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
 * Probe database is initialized and ready to be use.
 * @export
 * @return {boolean} true if the database has been initialized.
 */
ydn.db.StorageCore.prototype.isReady = function() {
  return goog.isDefAndNotNull(this.db_);
};


/**
 *
 * @return {string}
 */
ydn.db.StorageCore.prototype.type = function() {
  if (this.db_) {
    return this.db_.type();
  } else {
    return '';
  }
};


/**
 * Close the database.
 * @export
 * @return {!goog.async.Deferred} deferred function.
 */
ydn.db.StorageCore.prototype.close = function() {
  if (this.db_) {
    var df = this.db_.close();
    delete this.db_;
    return df;
  }
  return goog.async.Deferred.succeed(true);
};


/**
 * Return underlining database instance.
 * @return {ydn.db.Db} Database if exists.
 */
ydn.db.StorageCore.prototype.getDb = function() {
  return this.db_ || null;
};


/**
 * For undocumented export property to minified js file for hackers.
 * @deprecated this will be always deprecated.
 */
ydn.db.StorageCore.prototype.getDbInstance_ = function() {
  if (this.db_) {
    return this.db_.getDb();
  }
};


/**
 * Return underlining database instance.
 * @return {!goog.async.Deferred} Database in deferred function.
 */
ydn.db.StorageCore.prototype.getDeferredDb = function() {
  return this.deferredDb_;
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
ydn.db.StorageCore.prototype.put = function(store_name, value) {
  if (this.db_) {
    return this.db_.put(store_name, value);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb_.addCallback(function(db) {
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
 * @param {string|!ydn.db.Query|!ydn.db.Key} store_name
 * The name of store to retrive object from.
 * @param {(string|number)=} opt_key the key of an object to be retrieved.
 * if not provided, all entries in the store will return.
 * @return {!goog.async.Deferred} return resulting object in deferred function.
 * If not found, {@code undefined} is return.
 */
ydn.db.StorageCore.prototype.get = function (store_name, opt_key) {

  if (this.db_) {
    return this.db_.get(store_name, opt_key);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb_.addCallback(function (db) {
      db.get(store_name, opt_key).chainDeferred(df);
    });
    return df;
  }

};

/**
 * Retrieve an object from store.
 * @param {ydn.db.Key} key
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.StorageCore.prototype.getByKey = function(key) {
  if (this.db_) {
    return this.db_.getByKey(key);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb_.addCallback(function(db) {
      db.getByKey(key).chainDeferred(df);
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
ydn.db.StorageCore.prototype.clear = function(opt_store_name, opt_key) {
  if (this.db_) {
    return this.db_.clear(opt_store_name, opt_key);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb_.addCallback(function(db) {
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
ydn.db.StorageCore.prototype.count = function(opt_store_name) {
  if (this.db_) {
    return this.db_.count(opt_store_name);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb_.addCallback(function(db) {
      db.count(opt_store_name).chainDeferred(df);
    });
    return df;
  }
};


/**
 * Fetch result of a query and return as array.
 *
 * @export
 * @param {!ydn.db.Query|!Array.<!ydn.db.Key>} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @return {!goog.async.Deferred}
 */
ydn.db.StorageCore.prototype.fetch = function(q, limit, offset) {

  if (this.db_) {
    return this.db_.fetch(q, limit, offset);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb_.addCallback(function(db) {
      db.fetch(q, limit, offset).chainDeferred(df);
    });
    return df;
  }
};



/**
 * @export
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<!ydn.db.Key|string|ydn.db.Query>} keys list of keys or
 * store name involved in the transaction.
 * @param {(number|string)=} mode mode, default to 'read_write'.
 * @return {!goog.async.Deferred} d result in deferred function.
 */
ydn.db.StorageCore.prototype.transaction = function (trFn, keys, mode) {
  goog.asserts.assert(this.db_, 'database not ready');
  var store_names = [];
  for (var key, i = 0; key = keys[i]; i++) {
    var store_name = goog.isString(key) ? key : goog.isString(key.store_name) ?
        key.store_name : null;

    if (store_name && !goog.array.contains(store_names, key.store_name)) {
      store_names.push(store_name);
    }
  }
  mode = mode || ydn.db.IndexedDbWrapper.TransactionMode.READ_WRITE;
  return this.db_.transaction(trFn, store_names, mode, keys);
};



/**
 * Debug information about this database.
 * @private
 */
ydn.db.StorageCore.prototype.disp_ = function() {
  if (goog.DEBUG) {
    var schema = this.schema;
    window.console.log(this.db_name + ' ver: ' + schema.version);

    /**
     *
     * @param {ydn.db.StoreSchema} table table.
     * @param {number} count number.
     */
    var print_table_description = function(table, count) {
      window.console.log('Table: ' + table.name + ', keyPath: ' +
        table.keyPath + ', count: ' + count);
    };

    for (var table, i = 0; table = schema.stores[i]; i++) {
      this.count(table.name).addBoth(
        goog.partial(print_table_description, table));
    }
  }
};


goog.exportSymbol('ydn.db.StorageCore', ydn.db.StorageCore);
goog.exportProperty(goog.async.Deferred.prototype, 'success',
  goog.async.Deferred.prototype.addCallback);
goog.exportProperty(goog.async.Deferred.prototype, 'error',
  goog.async.Deferred.prototype.addErrback);

// somehow these methods are not exported via @export annotation
goog.exportProperty(ydn.db.StorageCore.prototype, 'isReady',
  ydn.db.StorageCore.prototype.isReady);
goog.exportProperty(ydn.db.StorageCore.prototype, 'type',
  ydn.db.StorageCore.prototype.type);
goog.exportProperty(ydn.db.StorageCore.prototype, 'setSchema',
  ydn.db.StorageCore.prototype.setSchema);
goog.exportProperty(ydn.db.StorageCore.prototype, 'setName',
  ydn.db.StorageCore.prototype.setName);
goog.exportProperty(ydn.db.StorageCore.prototype, 'getConfig',
  ydn.db.StorageCore.prototype.getConfig);
goog.exportProperty(ydn.db.StorageCore.prototype, 'fetch',
  ydn.db.StorageCore.prototype.fetch);
goog.exportProperty(ydn.db.StorageCore.prototype, 'get',
  ydn.db.StorageCore.prototype.get);
goog.exportProperty(ydn.db.StorageCore.prototype, 'put',
  ydn.db.StorageCore.prototype.put);
goog.exportProperty(ydn.db.StorageCore.prototype, 'clear',
  ydn.db.StorageCore.prototype.clear);
goog.exportProperty(ydn.db.StorageCore.prototype, 'transaction',
  ydn.db.StorageCore.prototype.transaction);
// for hacker
goog.exportProperty(ydn.db.StorageCore.prototype, 'db',
  ydn.db.StorageCore.prototype.getDbInstance_);
