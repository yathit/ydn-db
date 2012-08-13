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


/**
 * Create a suitable storage mechanism. starting from indexdb, to websql to
 * localStorage.
 * @see goog.db
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.DatabaseSchema=} opt_schema database schema
 * or its configuration in JSOn format.
 * schema used in chronical order.
 * @implements {ydn.db.Db}
 * @constructor
 */
ydn.db.Storage = function(opt_dbname, opt_schema) {

  /**
   * @private
   * @type {ydn.db.Db} db instance.
   */
  this.db_;

  /**
   *
   * @type {goog.async.Deferred} deferred db instance.
   */
  this.deferredDb = new goog.async.Deferred();

  if (goog.isDef(opt_dbname)) {
    this.setDbName(opt_dbname);
  }
  if (goog.isDef(opt_schema)) {
    this.setSchema(opt_schema);
  }
};


/**
 * @define {string} default key-value store name.
 */
ydn.db.Storage.DEFAULT_TEXT_STORE = 'default_text_store';


/**
 * Get configuration of this storage. This is useful from getting storage from
 * main thread to worker thread.
 * <pre>
 *   var db = new ydn.db.Storage(...);
 *   ... initialize ...
 *   var config = db.getConfig();
 *
 *   ... in worker thread ...
 *   var schemas = [];
 *   for (var i = 0; i < config.schemas.length; i++) {
 *      schemas.push(ydn.db.DatabaseSchema.fromJSON(config.schemas[i]));
 *   }
 *   var worker_db = new ydn.db.Storage(config.db_name, schemas);
 * </pre>
 *
 * @export
 * @return {{db_name: string, schema: !Object}} configuration
 * containing database and list of schema in JSON format.
 */
ydn.db.Storage.prototype.getConfig = function() {
  if (!this.isReady()) {
    throw Error('Database not initialized.');
  }

  return {
    db_name: this.db_name,
    schema: /** @type {!Object} */ (this.schema.toJSON())
  };
};


/**
 * @export
 * @param {string} opt_db_name set database name.
 * @return {string} normalized database name.
 */
ydn.db.Storage.prototype.setDbName = function(opt_db_name) {
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
 * database name have been set.
 * @export
 * @see {@link #addTableSchema}
 * @param {!ydn.db.DatabaseSchema|!Object} schema set the last schema or its
 * configuration in JSON format.
 */
ydn.db.Storage.prototype.setSchema = function(schema) {

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
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * 1. IndexedDb
 * 2. Sqlite
 * 3. Html5Db
 * 4. MemoryStore
 * @protected
 */
ydn.db.Storage.prototype.initDatabase = function() {
  // handle version change
  if (goog.isDef(this.db_name) && goog.isDef(this.schema)) {

    if (!goog.string.isEmpty(ydn.db.Storage.DEFAULT_TEXT_STORE) &&
      !this.schema.hasStore(ydn.db.Storage.DEFAULT_TEXT_STORE)) {
      this.schema.addStore(new ydn.db.StoreSchema(
        ydn.db.Storage.DEFAULT_TEXT_STORE, 'id'));
    }

    if (goog.userAgent.product.ASSUME_CHROME ||
      goog.userAgent.product.ASSUME_FIREFOX) {
      // for dead-code elimination
      this.db_ = new ydn.db.IndexedDb(this.db_name, this.schema);
    } else if (goog.userAgent.product.ASSUME_SAFARI ||
      goog.userAgent.ASSUME_WEBKIT) {
      // for dead-code elimination
      this.db_ = new ydn.db.WebSql(this.db_name, this.schema);
    } else if (ydn.db.IndexedDb.isSupported()) { // run-time detection
      this.db_ = new ydn.db.IndexedDb(this.db_name, this.schema);
    } else if (ydn.db.WebSql.isSupported()) {
      this.db_ = new ydn.db.WebSql(this.db_name, this.schema);
    } else if (ydn.db.Html5Db.isSupported()) {
      this.db_ = new ydn.db.Html5Db(this.db_name, this.schema);
    } else {
      this.db_ = new ydn.db.MemoryStore(this.db_name, this.schema);
    }

    if (this.deferredDb.hasFired()) {
      this.deferredDb = new goog.async.Deferred();
    }
    this.deferredDb.callback(this.db_);
  }
};


/**
 * Probe database is initialized and ready to be use.
 * @export
 * @return {boolean} true if the database has been initialized.
 */
ydn.db.Storage.prototype.isReady = function() {
  return !!this.db_;
};


/**
 * Close the database.
 * @return {!goog.async.Deferred} deferred function.
 */
ydn.db.Storage.prototype.close = function() {
  if (this.db_) {
    var df = this.db_.close();
    delete this.db_;
    return df;
  }
  return goog.async.Deferred.succeed(true);
};


/**
 * Return underlining database instance.
 * @return {ydn.db.Db|undefined} Database if exists.
 */
ydn.db.Storage.prototype.getDb = function() {
  return this.db_;
};


/**
 * Store a value to default key-value store.
 * @export
 * @param {string} key key.
 * @param {string} value value.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Storage.prototype.setItem = function(key, value) {

  return this.put(ydn.db.Storage.DEFAULT_TEXT_STORE,
    {'id': key, 'value': value});

};


/**
 * @export
 * @inheritDoc
 */
ydn.db.Storage.prototype.put = function(table, value) {
  if (this.db_) {
    return this.db_.put(table, value);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.put(table, value).chainDeferred(df);
    });
    return df;
  }
};


/**
 * Retrieve a value from default key-value store.
 * @export
 * @param {string} key key.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Storage.prototype.getItem = function(key) {
  var out = this.get(ydn.db.Storage.DEFAULT_TEXT_STORE, key);
  var df = new goog.async.Deferred();
  out.addCallback(function(data) {
    if (goog.isDef(data)) {
      df.callback(data['value']);
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
 * @inheritDoc
 */
ydn.db.Storage.prototype.get = function(table, key) {
  if (this.db_) {
    return this.db_.get(table, key);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.get(table, key).chainDeferred(df);
    });
    return df;
  }
};


/**
 * @export
 * @inheritDoc
 */
ydn.db.Storage.prototype.clear = function(opt_table, opt_key) {
  if (this.db_) {
    return this.db_.clear(opt_table, opt_key);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.clear(opt_table, opt_key).chainDeferred(df);
    });
    return df;
  }
};


/**
 * @export
 * @inheritDoc
 */
ydn.db.Storage.prototype.count = function(table) {
  if (this.db_) {
    return this.db_.count(table);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.count(table).chainDeferred(df);
    });
    return df;
  }
};


/**
 * @export
 * @inheritDoc
 */
ydn.db.Storage.prototype.fetch = function(q) {
  if (this.db_) {
    return this.db_.fetch(q);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.fetch(q).chainDeferred(df);
    });
    return df;
  }
};


/**
 * Debug information about this database.
 */
ydn.db.Storage.prototype.disp = function() {
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


goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);
goog.exportProperty(goog.async.Deferred.prototype, 'success',
  goog.async.Deferred.prototype.addCallback);
goog.exportProperty(goog.async.Deferred.prototype, 'error',
  goog.async.Deferred.prototype.addErrback);
