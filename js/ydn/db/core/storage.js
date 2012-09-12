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

goog.provide('ydn.db.core.Storage');
goog.require('goog.userAgent.product');
goog.require('ydn.async');
goog.require('ydn.db.adapter.LocalStorage');
goog.require('ydn.db.adapter.SessionStorage');
goog.require('ydn.db.adapter.IndexedDb');
goog.require('ydn.db.adapter.SimpleStorage');
goog.require('ydn.db.adapter.WebSql');
goog.require('ydn.object');
goog.require('ydn.error.ArgumentException');
goog.require('ydn.db.core.IStorage');


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
 * @implements {ydn.db.core.IStorage}
 * @constructor
 */
ydn.db.core.Storage = function(opt_dbname, opt_schema, opt_options) {

  this.db_ = null;

  var options = opt_options || {};

  this.preference = options['preference'];

  /**
   * @protected
   * @type {!goog.async.Deferred} deferred db instance.
   */
  this.deferredDb_ = new goog.async.Deferred();

  /**
   * Transaction queue
   * @private
   * @final
   * @type {!Array.<{fnc: Function, scopes: Array.<string>,
   * mode: ydn.db.TransactionMode, oncompleted: Function}>}
   */
  this.txQueue = [];

  this.in_tx_ = false;
  this.setSchema(opt_schema || {});

  if (goog.isDef(opt_dbname)) {
    this.setName(opt_dbname);
  }
};


/**
 * @private
 * @type {ydn.db.adapter.IDatabase} db instance.
 */
ydn.db.core.Storage.prototype.db_ = null;


/**
 * Get configuration of this storage. This is useful from getting storage from
 * main thread to worker thread.
 * <pre>
 *   var db = new ydn.db.core.Storage(...);
 *   ... initialize ...
 *   var config = db.getConfig();
 *
 *   ... in worker thread ...
 *   var worker_db = new ydn.db.core.Storage(config.db_name, config.schema);
 * </pre>
 * In this way, data can be share between the two threads.
 * @export
 * @return {{name: string, schema: !Object}?} configuration
 * containing database and list of schema in JSON format.
 */
ydn.db.core.Storage.prototype.valueOf = function() {
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
ydn.db.core.Storage.prototype.setName = function(opt_db_name) {
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
ydn.db.core.Storage.prototype.setSchema = function(schema) {

  if (!(schema instanceof ydn.db.DatabaseSchema)) {
    schema = ydn.db.DatabaseSchema.fromJSON(schema);
  }

  /**
   * @final
   * @protected
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = schema;

  if (!this.db_) {
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
ydn.db.core.Storage.PREFERENCE = [ydn.db.adapter.IndexedDb.TYPE,
  ydn.db.adapter.WebSql.TYPE,
  ydn.db.adapter.LocalStorage.TYPE,
  ydn.db.adapter.SessionStorage.TYPE,
  ydn.db.adapter.SimpleStorage.TYPE];


/**
 * Create database instance.
 * @param {string} db_type
 * @param {string} db_name
 * @param {!ydn.db.DatabaseSchema} config
 * @return {ydn.db.adapter.IDatabase}
 */
ydn.db.core.Storage.prototype.createDbInstance = function(db_type, db_name, config) {
  //noinspection JSValidateTypes
  if (db_type == ydn.db.adapter.IndexedDb.TYPE) {
    return new ydn.db.adapter.IndexedDb(db_name, config);
  } else if (db_type == ydn.db.adapter.WebSql.TYPE) {
    return new ydn.db.adapter.WebSql(db_name, config);
  } else if (db_type == ydn.db.adapter.LocalStorage.TYPE) {
    return new ydn.db.adapter.LocalStorage(db_name, config);
  } else if (db_type == ydn.db.adapter.SessionStorage.TYPE) {
    return new ydn.db.adapter.SessionStorage(db_name, config);
  } else if (db_type == ydn.db.adapter.SimpleStorage.TYPE)  {
    return new ydn.db.adapter.SimpleStorage(db_name, config);
  }
  return null;
};


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * @protected
 */
ydn.db.core.Storage.prototype.initDatabase = function() {
  // handle version change
  if (goog.isDef(this.db_name) && goog.isDef(this.schema)) {
    this.db_ = null;
    if (goog.userAgent.product.ASSUME_CHROME ||
      goog.userAgent.product.ASSUME_FIREFOX) {
      // for dead-code elimination
      this.db_ = this.createDbInstance(ydn.db.adapter.IndexedDb.TYPE, this.db_name, this.schema);
    } else if (goog.userAgent.product.ASSUME_SAFARI) {
      // for dead-code elimination
      this.db_ = this.createDbInstance(ydn.db.adapter.WebSql.TYPE, this.db_name, this.schema);
    } else {
      // go according to ordering
      var preference = this.preference || ydn.db.core.Storage.PREFERENCE;
      for (var i = 0; i < preference.length; i++) {
        var db_type = preference[i].toLowerCase();
        if (db_type == ydn.db.adapter.IndexedDb.TYPE && ydn.db.adapter.IndexedDb.isSupported()) { // run-time detection
          this.db_ = this.createDbInstance(db_type, this.db_name, this.schema);
          break;
        } else if (db_type == ydn.db.adapter.WebSql.TYPE && ydn.db.adapter.WebSql.isSupported()) {
          this.db_ = this.createDbInstance(db_type, this.db_name, this.schema);
          break;
        } else if (db_type == ydn.db.adapter.LocalStorage.TYPE && ydn.db.adapter.LocalStorage.isSupported()) {
          this.db_ = this.createDbInstance(db_type, this.db_name, this.schema);
          break;
        } else if (db_type == ydn.db.adapter.SessionStorage.TYPE && ydn.db.adapter.SessionStorage.isSupported()) {
          this.db_ = this.createDbInstance(db_type, this.db_name, this.schema);
          break;
        } else if (db_type == ydn.db.adapter.SimpleStorage.TYPE)  {
          this.db_ = this.createDbInstance(db_type, this.db_name, this.schema);
          break;
        }
      }
      if (!this.db_) {
        throw new ydn.error.ConstrainError('No storage mechanism found.');
      }
    }

    if (this.deferredDb_.hasFired()) {
      this.deferredDb_ = new goog.async.Deferred();
    }
    var me = this;
    this.db_.onReady(function(db) {
      me.deferredDb_.callback(me.db_);
      me.runTxQueue();
    });
  }
};


/**
 *
 * @return {string}
 */
ydn.db.core.Storage.prototype.type = function() {
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
ydn.db.core.Storage.prototype.close = function() {
  if (this.db_) {
    var df = this.db_.close();
    delete this.db_;
    return df;
  }
  return goog.async.Deferred.succeed(true);
};


/**
 * Datbase instance is ready to used.
 * @param {function(!ydn.db.adapter.IDatabase)} callback
 */
ydn.db.core.Storage.prototype.onReady = function(callback) {
  if (this.db_ && !this.db_.getDbInstance()) {
    // we can skip this check, but it saves one function wrap.
    callback(this.db_);
  } else {
    this.deferredDb_.addCallback(callback);
  }
};


/**
 * @protected
 * @return {ydn.db.adapter.IDatabase}
 */
ydn.db.core.Storage.prototype.getDb = function() {
  return this.db_;
};



/**
 * Run the first transaction task in the queue. DB must be ready to do the
 * transaction.
 * @protected
 */
ydn.db.core.Storage.prototype.runTxQueue = function() {

  var task = this.txQueue.shift();
  if (task) {
    this.transaction(task.fnc, task.scopes, task.mode, task.oncompleted);
  }
};


/**
 * Abort the queuing tasks.
 * @protected
 * @param e
 */
ydn.db.core.Storage.prototype.abortTxQueue = function(e) {
  if (this.txQueue) {
    var task = this.txQueue.shift();
    while (task) {
      task = this.txQueue.shift();
      task.oncompleted(ydn.db.TransactionEventTypes.ABORT, e);
    }
  }
};





/**
 * Flag to indicate in transaction.
 * @type {boolean}
 * @private
 */
ydn.db.core.Storage.prototype.in_tx_ = false;



/**
 * Run a transaction.
 * @export
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.TransactionMode, *)=} completed_event_handler
 */
ydn.db.core.Storage.prototype.transaction = function (trFn, store_names,
     opt_mode, completed_event_handler) {

  var names = store_names;
  if (goog.isString(store_names)) {
    names = [store_names];
  } else if (!goog.isArray(store_names) ||
      (store_names.length > 0 && !goog.isString(store_names[0]))) {
    throw new ydn.error.ArgumentException("storeNames");
  }
  var mode = goog.isDef(opt_mode) ? opt_mode : ydn.db.TransactionMode.READ_ONLY;

  var me = this;

  var ready = !!this.db_ && this.db_.isReady();
  if (ready && !this.in_tx_) {
    var on_complete = function (type, ev) {
      if (goog.isFunction(completed_event_handler)) {
        /**
         * @preserve_try
         */
        try {
          completed_event_handler(type, ev);
        } catch (e) {
          // swallow error. document it publicly.
          // this is necessary and
          if (goog.DEBUG) {
            throw e;
          }
        }
      }
      me.in_tx_ = false;
      me.runTxQueue();
    };

    this.in_tx_ = true;
    this.db_.doTransaction(function (tx) {
      trFn(tx);
    }, names, mode, on_complete);
  } else {
    this.txQueue.push({
      fnc:trFn,
      scopes:names,
      mode:mode,
      oncompleted:completed_event_handler
    });
  }
};


goog.exportSymbol('ydn.db.core.Storage', ydn.db.core.Storage);
goog.exportProperty(ydn.db.core.Storage.prototype, 'type',
  ydn.db.core.Storage.prototype.type);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setName',
  ydn.db.core.Storage.prototype.setName);
goog.exportProperty(ydn.db.core.Storage.prototype, 'valueOf',
  ydn.db.core.Storage.prototype.valueOf);
goog.exportProperty(ydn.db.core.Storage.prototype, 'transaction',
  ydn.db.core.Storage.prototype.transaction);
goog.exportProperty(ydn.db.core.Storage.prototype, 'close',
  ydn.db.core.Storage.prototype.close);
// for hacker only. This method should not document this, since this will change
// transaction state.
goog.exportProperty(ydn.db.core.Storage.prototype, 'onReady',
  ydn.db.core.Storage.prototype.onReady);
