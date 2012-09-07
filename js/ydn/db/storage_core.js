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

goog.provide('ydn.db.Core');
goog.require('goog.userAgent.product');
goog.require('ydn.async');
goog.require('ydn.db.LocalStorage');
goog.require('ydn.db.SessionStorage');
goog.require('ydn.db.IndexedDbWrapper');
goog.require('ydn.db.MemoryStore');
goog.require('ydn.db.WebSqlWrapper');
goog.require('ydn.object');
goog.require('ydn.db.Db');


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
 * @constructor
 */
ydn.db.Core = function(opt_dbname, opt_schema, opt_options) {

  this.db_ = null;

  var options = opt_options || {};

  this.preference = options['preference'];

  /**
   * @protected
   * @type {!goog.async.Deferred} deferred db instance.
   */
  this.deferredDb_ = new goog.async.Deferred();

  this.setSchema(opt_schema || {});

  if (goog.isDef(opt_dbname)) {
    this.setName(opt_dbname);
  }
};


/**
 * @protected
 * @type {ydn.db.Db} db instance.
 */
ydn.db.Core.prototype.db_ = null;


/**
 * Factory.
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.DatabaseSchema=} opt_schema database schema
 * @return {ydn.db.Core}
 */
ydn.db.Core.createInstance = function(opt_dbname, opt_schema) {
  return new ydn.db.Core(opt_dbname, opt_schema);
};



/**
 * Get configuration of this storage. This is useful from getting storage from
 * main thread to worker thread.
 * <pre>
 *   var db = new ydn.db.Core(...);
 *   ... initialize ...
 *   var config = db.getConfig();
 *
 *   ... in worker thread ...
 *   var worker_db = new ydn.db.Core(config.db_name, config.schema);
 * </pre>
 * In this way, data can be share between the two threads.
 * @export
 * @return {{name: string, schema: !Object}?} configuration
 * containing database and list of schema in JSON format.
 */
ydn.db.Core.prototype.getConfig = function() {
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
 */
ydn.db.Core.prototype.setName = function(opt_db_name) {
  if (this.db_) {
    throw Error('DB already initialized');
  }
  /**
   * @final
   * @type {string}
   */
  this.db_name = opt_db_name;
  this.initDatabase();
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
ydn.db.Core.prototype.setSchema = function(schema) {

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
ydn.db.Core.PREFERENCE = [ydn.db.IndexedDbWrapper.TYPE,
  ydn.db.WebSqlWrapper.TYPE,
  ydn.db.LocalStorage.TYPE,
  ydn.db.SessionStorage.TYPE, 'memory'];


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * @protected
 */
ydn.db.Core.prototype.initDatabase = function() {
  // handle version change
  if (goog.isDef(this.db_name) && goog.isDef(this.schema)) {
    this.db_ = null;
    if (goog.userAgent.product.ASSUME_CHROME ||
      goog.userAgent.product.ASSUME_FIREFOX) {
      // for dead-code elimination
      this.db_ = new ydn.db.IndexedDbWrapper(this.db_name, this.schema);
    } else if (goog.userAgent.product.ASSUME_SAFARI) {
      // for dead-code elimination
      this.db_ = new ydn.db.WebSqlWrapper(this.db_name, this.schema);
    } else {
      // go according to ordering
      var preference = this.preference || ydn.db.Core.PREFERENCE;
      for (var i = 0; i < preference.length; i++) {
        var db_type = preference[i].toLowerCase();
        if (db_type == ydn.db.IndexedDbWrapper.TYPE && ydn.db.IndexedDbWrapper.isSupported()) { // run-time detection
          this.db_ = new ydn.db.IndexedDbWrapper(this.db_name, this.schema);
          break;
        } else if (db_type == ydn.db.WebSqlWrapper.TYPE && ydn.db.WebSqlWrapper.isSupported()) {
          this.db_ = new ydn.db.WebSqlWrapper(this.db_name, this.schema);
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
ydn.db.Core.prototype.isReady = function() {
  return goog.isDefAndNotNull(this.db_);
};


/**
 *
 * @return {string}
 */
ydn.db.Core.prototype.type = function() {
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
ydn.db.Core.prototype.close = function() {
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
ydn.db.Core.prototype.getDb = function() {
  return this.db_ || null;
};



/**
 * Return underlining database instance.
 * @return {!goog.async.Deferred} Database in deferred function.
 */
ydn.db.Core.prototype.getDeferredDb = function() {
  return this.deferredDb_;
};


/**
 * For undocumented export property to minified js file for hackers.
 * @deprecated this will be always deprecated.
 */
ydn.db.Core.prototype.getDbInstance_ = function() {
  if (this.db_) {
    return this.db_.getDbInstance();
  }
};




/**
 * Run a transaction.
 * @export
 * @final
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<!ydn.db.Key|string|ydn.db.Query>} keys list of keys or
 * store name involved in the transaction.
 * @param {(number|string)=} mode mode, default to 'read_write'.
 * @param {...} opt_args
 * @return {!goog.async.Deferred} d result in deferred function.
 */
ydn.db.Core.prototype.transaction = function (trFn, keys, mode, opt_args) {
  goog.asserts.assert(this.db_, 'database not ready');
  var store_names = [];
  if (goog.isString(keys)) {
    store_names = [keys];
  } else if (goog.isArray(keys)) {
    for (var key, i = 0; key = keys[i]; i++) {
      var store_name = goog.isString(key) ? key : goog.isString(key.store_name) ?
          key.store_name : null;

      if (store_name && !goog.array.contains(store_names, key.store_name)) {
        store_names.push(store_name);
      }
    }
  } else {
    store_names = this.schema.getStoreNames();
  }
  mode = goog.isDef(mode) ? mode : ydn.db.IndexedDbWrapper.TransactionMode.READ_WRITE;
  var outFn = trFn;
  if (arguments.length > 3) { // handle optional parameters
    // see how it work in goog.partial.
    var args = Array.prototype.slice.call(arguments, 3);
    outFn = function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      newArgs.unshift.apply(newArgs, args);
      return trFn.apply(this, newArgs);
    }
  }
  return this.db_.transaction(outFn, store_names, mode, keys);
};



goog.exportSymbol('ydn.db.Core', ydn.db.Core);
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
goog.exportProperty(ydn.db.Core.prototype, 'transaction',
  ydn.db.Core.prototype.transaction);
goog.exportProperty(ydn.db.Core.prototype, 'close',
  ydn.db.Core.prototype.close);
// for hacker
goog.exportProperty(ydn.db.Core.prototype, 'db',
  ydn.db.Core.prototype.getDbInstance_);
