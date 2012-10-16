/**
 * @license Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
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
 * @fileoverview Database connector.
 *
 * Create and maintain database connection and provide robust transaction
 * objects upon request. Storage mechanisms implement
 * ydn.db.con.IDatabase interface.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.con.Storage');
goog.require('goog.userAgent.product');
goog.require('ydn.async');
goog.require('ydn.db.con.LocalStorage');
goog.require('ydn.db.con.SessionStorage');
goog.require('ydn.db.con.IndexedDb');
goog.require('ydn.db.con.SimpleStorage');
goog.require('ydn.db.con.WebSql');
goog.require('ydn.object');
goog.require('ydn.error.ArgumentException');
goog.require('ydn.db.con.IStorage');
goog.require('goog.events.EventTarget');



/**
 * Create a suitable storage mechanism.
 *
 * If database name and schema are provided, this will immediately initialize
 * the database and ready to use. However if any of these two are missing,
 * the database is not initialize until they are set by calling
 * {@link #setsetDbName} and {@link #setSchema}.
 * @see goog.db Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.DatabaseSchema|DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * schema used in chronical order.
 * @param {!StorageOptions=} opt_options options.
 * @implements {ydn.db.con.IStorage}
 * @constructor
 * @extends {goog.events.EventTarget}
 */
ydn.db.con.Storage = function(opt_dbname, opt_schema, opt_options) {

  goog.base(this);

  var options = opt_options || {};

  /**
   * @final
   * @type {!Array.<string>}
   */
  this.mechanisms = options.Mechanisms || ydn.db.con.Storage.PREFERENCE;

  /**
   * @final
   * @type {number|undefined}
   */
  this.size = options.size;

  /**
   * @final
   * @type {boolean}
   */
  this.use_text_store = goog.isDef(options.use_text_store) ?
    options.use_text_store : ydn.db.base.ENABLE_DEFAULT_TEXT_STORE;

  /**
   * @type {ydn.db.con.IDatabase}
   * @private
   */
  this.db_ = null;
  /**
   * @type {!goog.async.Deferred}
   * @private
   */
  this.deferredDb_ = new goog.async.Deferred();
  // ?: keeping an object in deferred and non-deferred is not a good design

  /**
   * Transaction queue
   * @private
   * @final
   * @type {!Array.<{fnc: Function, scopes: Array.<string>,
   * mode: ydn.db.base.TransactionMode, oncompleted: Function}>}
   */
  this.txQueue_ = [];

  this.in_version_change_tx_ = false;

  /**
   * @final
   * @protected
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = (opt_schema instanceof ydn.db.DatabaseSchema) ?
    opt_schema : goog.isDefAndNotNull(opt_schema) ?
    ydn.db.DatabaseSchema.fromJSON(opt_schema) : new ydn.db.DatabaseSchema();

  if (this.use_text_store && !this.schema.hasStore(ydn.db.StoreSchema.DEFAULT_TEXT_STORE)) {
    this.schema.addStore(new ydn.db.StoreSchema(
      ydn.db.StoreSchema.DEFAULT_TEXT_STORE, 'id', false, ydn.db.DataType.TEXT));
  }

  if (goog.isDef(opt_dbname)) {
    this.setName(opt_dbname);
  }
};
goog.inherits(ydn.db.con.Storage, goog.events.EventTarget);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.Storage.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.con.Storage');



/**
 * Get configuration of this storage. This is useful from getting storage from
 * main thread to worker thread.
 * <pre>
 *   var db = new ydn.db.con.Storage(...);
 *   ... initialize ...
 *   var config = db.getConfig();
 *
 *   ... in worker thread ...
 *   var worker_db = new ydn.db.con.Storage(config.db_name, config.schema);
 * </pre>
 * In this way, data can be share between the two threads.
 *
 * @return {{name: string, schema: DatabaseSchema}?} configuration
 * containing database and list of schema in JSON format.
 * @export
 * @deprecated
 */
ydn.db.con.Storage.prototype.getConfig = function() {
  if (!this.schema) {
    return null;
  }

  return {
    'name': this.db_name,
    'schema': this.getSchema()
  };
};


/**
 * Get current schema.
 * @param {function(ydn.db.DatabaseSchema)=} callback
 * @return {DatabaseSchema}
 */
ydn.db.con.Storage.prototype.getSchema = function(callback) {
  if (goog.isDef(callback)) {
    if (this.db_) {
      this.deferredDb_.addCallback(function(db) {
        db.getSchema(callback);
      });
    } else {
      callback(null);
    }
  }
  return this.schema ? /** @type {!DatabaseSchema} */ (this.schema.toJSON()) : null;
};


/**
 * Get current schema.
 * @return {StoreSchema?} null if give store do not exist
 */
ydn.db.con.Storage.prototype.getStoreSchema = function(store_name) {
  var store = this.schema.getStore(store_name);
  return store ? /** @type {!StoreSchema} */ (store.toJSON()) : null;
};


/**
 * Add a store schema to current database schema on auto schema generation
 * mode {@see #auto_schema}.
 * If the store already exist it will be updated as necessary.
 * @param {!StoreSchema|!ydn.db.StoreSchema} store_schema
 * @return {!goog.async.Deferred}
 */
ydn.db.con.Storage.prototype.addStoreSchema = function (store_schema) {

  var new_store = store_schema instanceof ydn.db.StoreSchema ?
      store_schema : ydn.db.StoreSchema.fromJSON(store_schema);

  var store_name = store_schema.name;
  var store = this.schema.getStore(store_name);
  if (!new_store.equals(store)) {

    var action = store ? 'update' : 'add';

    if (! this.schema.isAutoSchema()) {
      throw new ydn.error.ConstrainError('Cannot ' + action + ' store: ' +
        store_name + '. Not auto schema generation mode.');
    } else {
      // do update
      var me;
      var df = new goog.async.Deferred();
      this.transaction(function (tx) {
        var d = me.db_.addStoreSchema(tx, store);
        df.chainDeferred(d);
      }, [], ydn.db.base.TransactionMode.VERSION_CHANGE);
      return df;
    }
  } else {
    return goog.async.Deferred.succeed(false); // no change
  }
};


/**
 * Set database. This will initialize the database.
 * @export
 * @throws {Error} if database is already initialized.
 * @param {string} opt_db_name set database name.
 */
ydn.db.con.Storage.prototype.setName = function(opt_db_name) {
  if (this.db_) {
    throw Error('DB already initialized');
  }

  /**
   * @final
   * @protected
   * @type {string}
   */
  this.db_name = opt_db_name;
  this.initDatabase();

};


/**
 *
 * @return {string}
 */
ydn.db.con.Storage.prototype.getName = function() {
  return this.db_name;
};



/**
 * Specified storage mechanism ordering.
 * The default represent
 * IndexedDB, WebSql, localStorage and in-memory store.
 * @const
 * @type {!Array.<string>}
 */
ydn.db.con.Storage.PREFERENCE = [
  ydn.db.con.IndexedDb.TYPE,
  ydn.db.con.WebSql.TYPE,
  ydn.db.con.LocalStorage.TYPE,
  ydn.db.con.SessionStorage.TYPE,
  ydn.db.con.SimpleStorage.TYPE];


/**
 * Create database instance.
 * @protected
 * @param {string} db_type
 * @return {ydn.db.con.IDatabase}
 */
ydn.db.con.Storage.prototype.createDbInstance = function(db_type) {

  if (db_type == ydn.db.con.IndexedDb.TYPE) {
    return new ydn.db.con.IndexedDb(this.db_name, this.schema);
  } else if (db_type == ydn.db.con.WebSql.TYPE) {
    return new ydn.db.con.WebSql(this.db_name, this.schema, this.size);
  } else if (db_type == ydn.db.con.LocalStorage.TYPE) {
    return new ydn.db.con.LocalStorage(this.db_name, this.schema);
  } else if (db_type == ydn.db.con.SessionStorage.TYPE) {
    return new ydn.db.con.SessionStorage(this.db_name, this.schema);
  } else if (db_type == ydn.db.con.SimpleStorage.TYPE)  {
    return new ydn.db.con.SimpleStorage(this.db_name, this.schema);
  }
  return null;
};


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * @protected
 */
ydn.db.con.Storage.prototype.initDatabase = function() {
  // handle version change
  if (goog.isDef(this.db_name) && goog.isDef(this.schema)) {
    var db = null;
    if (goog.userAgent.product.ASSUME_CHROME ||
      goog.userAgent.product.ASSUME_FIREFOX) {
      // for dead-code elimination
      db = this.createDbInstance(ydn.db.con.IndexedDb.TYPE);
    } else if (goog.userAgent.product.ASSUME_SAFARI) {
      // for dead-code elimination
      db = this.createDbInstance(ydn.db.con.WebSql.TYPE);
    } else {
      // go according to ordering
      var preference = this.mechanisms;
      for (var i = 0; i < preference.length; i++) {
        var db_type = preference[i].toLowerCase();
        if (db_type == ydn.db.con.IndexedDb.TYPE && ydn.db.con.IndexedDb.isSupported()) { // run-time detection
          db = this.createDbInstance(db_type);
          break;
        } else if (db_type == ydn.db.con.WebSql.TYPE && ydn.db.con.WebSql.isSupported()) {
          db = this.createDbInstance(db_type);
          break;
        } else if (db_type == ydn.db.con.LocalStorage.TYPE && ydn.db.con.LocalStorage.isSupported()) {
          db = this.createDbInstance(db_type);
          break;
        } else if (db_type == ydn.db.con.SessionStorage.TYPE && ydn.db.con.SessionStorage.isSupported()) {
          db = this.createDbInstance(db_type);
          break;
        } else if (db_type == ydn.db.con.SimpleStorage.TYPE)  {
          db = this.createDbInstance(db_type);
          break;
        }
      }
    }
    if (goog.isNull(db)) {
      throw new ydn.error.ConstrainError('No storage mechanism found.');
    } else {
      this.setDb_(db);
    }
  }
};


/**
 *
 * @return {string}
 * @export
 */
ydn.db.con.Storage.prototype.type = function() {
  if (this.db_) {
    return this.db_.type();
  } else {
    return '';
  }
};


/**
 *
 * @return {boolean}
 */
ydn.db.con.Storage.prototype.isReady = function() {
  return this.deferredDb_.hasFired();
};


/**
 *
 * @enum {string}
 */
ydn.db.con.Storage.EventTypes = {
  CONNECTED: 'conneted',
  FAIL: 'fail',
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted'
};


/**
 * Setting db .
 * @param {!ydn.db.con.IDatabase} db
 * @private
 */
ydn.db.con.Storage.prototype.setDb_ = function(db) {
  this.init(); // let super class to initialize.
  if (this.deferredDb_.hasFired()) {
    this.logger.warning(this + ': database already initialized.');
    this.deferredDb_ = new goog.async.Deferred();
  }
  this.db_ = db;

  var me = this;


  this.db_.onConnected = function (success, e) {
    if (goog.isDef(e)) {
      me.logger.warning(me + ': opening fail.');
      // this could happen if user do not allow to use the storage
      me.purgeTxQueue_(e);
      me.dispatchEvent(ydn.db.con.Storage.EventTypes.FAIL);
    } else {
      me.logger.finest(me + ': ready.');
      me.last_queue_checkin_ = NaN;
      me.popTxQueue_();
      me.dispatchEvent(ydn.db.con.Storage.EventTypes.CONNECTED);
    }
  }
};


/**
 * Database database is instantiated, but may not ready.
 * Subclass may perform initialization.
 * When ready, deferred call are invoked and transaction queue
 * will run.
 * @protected
 */
ydn.db.con.Storage.prototype.init = function() {
};


/**
 * Close the database.
 * @export
 */
ydn.db.con.Storage.prototype.close = function() {
  if (this.db_) {
    this.db_.close();
    this.db_ = null;
  }
};

//
//
///**
// * Access readied database instance asynchronously.
// * @param {function(!ydn.db.con.IDatabase)} callback
// * @export
// */
//ydn.db.con.Storage.prototype.onReady = function(callback) {
//  if (this.db_ && !this.db_.getDbInstance()) {
//    // we can skip this check, but it saves one function wrap.
//    callback(this.db_);
//  } else {
//    this.deferredDb_.addCallback(callback);
//  }
//};


/**
 * Get database instance.
 * @protected
 * @return {ydn.db.con.IDatabase}
 */
ydn.db.con.Storage.prototype.getDb = function() {
  return this.db_;
};



/**
 * Get database instance.
 * @see {@link #getDb}
 * @return {*}
 */
ydn.db.con.Storage.prototype.getDbInstance = function() {
  return this.db_ ? this.db_.getDbInstance() : null;
};


/**
 *
 * @type {number}
 * @private
 */
ydn.db.con.Storage.prototype.last_queue_checkin_ = NaN;


/**
 * @const
 * @type {number}
 */
ydn.db.con.Storage.timeOut = goog.DEBUG || ydn.db.con.IndexedDb.DEBUG ?
  500 : 3000;


/**
 * @const
 * @type {number}
 */
ydn.db.con.Storage.MAX_QUEUE = 1000;


/**
 * Run the first transaction task in the queue. DB must be ready to do the
 * transaction.
 * @private
 */
ydn.db.con.Storage.prototype.popTxQueue_ = function() {

  var task = this.txQueue_.shift();
  if (task) {
    ydn.db.con.Storage.prototype.transaction.call(this,
      task.fnc, task.scopes, task.mode, task.oncompleted);
  }
  this.last_queue_checkin_ = goog.now();
};


/**
 * Push a transaction job to the queue.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TransactionEventTypes, *)=} completed_event_handler
 * @private
 */
ydn.db.con.Storage.prototype.pushTxQueue_ = function (trFn, store_names,
    opt_mode, completed_event_handler) {
  this.txQueue_.push({
    fnc:trFn,
    scopes:store_names,
    mode:opt_mode,
    oncompleted:completed_event_handler
  });
  var now = goog.now();
  //if (!isNaN(this.last_queue_checkin_)) {
    //if ((now - this.last_queue_checkin_) > ydn.db.con.Storage.timeOut) {
    //  this.logger.warning('queue is not moving.');
      // todo: actively push the queue if transaction object is available
      // this will make robustness to the app.
      // in normal situation, queue will automatically empty since
      // pop queue will call whenever transaction is finished.
    //}
  //}
  if (this.txQueue_.length > ydn.db.con.Storage.MAX_QUEUE) {
    this.logger.warning('Maximum queue size exceed, dropping the first job.');
    this.txQueue_.shift();
  }

};


/**
 * Abort the queuing tasks.
 * @protected
 * @param e
 */
ydn.db.con.Storage.prototype.purgeTxQueue_ = function(e) {
  if (this.txQueue_) {
    this.logger.info('Purging ' + this.txQueue_.length +
      ' transactions request.');
    var task = this.txQueue_.shift();
    while (task) {
      task.oncompleted(ydn.db.base.TransactionEventTypes.ERROR, e);
      task = this.txQueue_.shift();
    }
  }
};


/**
 * Flag to indicate on version change transaction.
 * @type {boolean}
 * @private
 */
ydn.db.con.Storage.prototype.in_version_change_tx_ = false;



/**
 * Run a transaction.
 *
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TransactionEventTypes, *)=} completed_event_handler
 * @export
 * @final
 */
ydn.db.con.Storage.prototype.transaction = function (trFn, store_names, opt_mode, completed_event_handler) {

  var is_ready = !!this.db_ && this.db_.isReady();
  if (!is_ready || this.in_version_change_tx_) {
    // a "versionchange" transaction is still running, a InvalidStateError
    // exception must be thrown
    this.pushTxQueue_(trFn, store_names, opt_mode, completed_event_handler);
    return;
  }

  var me = this;
  var names = store_names;
  if (goog.isString(store_names)) {
    names = [store_names];
  } else if (!goog.isArray(store_names) ||
    (store_names.length > 0 && !goog.isString(store_names[0]))) {
    throw new ydn.error.ArgumentException("storeNames");
  }
  var mode = goog.isDef(opt_mode) ? opt_mode : ydn.db.base.TransactionMode.READ_ONLY;

  if (mode == ydn.db.base.TransactionMode.VERSION_CHANGE) {
    this.in_version_change_tx_ = true;
  }

  var on_complete = function (type, ev) {
    if (goog.isFunction(completed_event_handler)) {
      completed_event_handler(type, ev);
    }
    if (mode == ydn.db.base.TransactionMode.VERSION_CHANGE) {
      me.in_version_change_tx_ = false;
    }
    me.popTxQueue_();
  };

  //console.log('core running ' + trFn.name);
  this.db_.doTransaction(function (tx) {
    trFn(tx);
  }, names, mode, on_complete);

};


ydn.db.con.Storage.prototype.toString = function() {
  return 'ydn.db.con.Storage:' + this.db_;
};