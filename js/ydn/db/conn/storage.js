/**
 * @license Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");.
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
 * @fileoverview Storage provider.
 *
 * Create and maintain database connection and provide robust transaction
 * objects upon request. Storage mechanism providers implement
 * ydn.db.con.IDatabase interface.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.con.Storage');
goog.require('goog.events.EventTarget');
goog.require('ydn.db.base');
goog.require('ydn.db.con.IStorage');
goog.require('ydn.db.events.StorageEvent');
goog.require('ydn.db.schema.EditableDatabase');
goog.require('ydn.debug.error.ArgumentException');
goog.require('ydn.object');
if (!ydn.db.base.NO_SIMPLE) {
  goog.require('ydn.db.con.simple.UserData');
  goog.require('ydn.db.con.LocalStorage');
  goog.require('ydn.db.con.SessionStorage');
}
if (!ydn.db.base.NO_IDB) {
  goog.require('ydn.db.con.IndexedDb');
}
if (!ydn.db.base.NO_WEBSQL) {
  goog.require('ydn.db.con.WebSql');
}



/**
 * Create a storage and connect to suitable database connection.
 *
 * The storage is ready to use on created, but transaction requested
 * my buffered until connection is established.
 *
 * If database name is provided, this will immediately initialize
 * the connection. Database name can be set later by using {@link #setName}
 * method.
 *
 * This grantee that the connected database has the similar schema as specified
 * in the input. If dissimilar between the two schema, the version change
 * is issued and alter the schema to match the input schema.
 *
 * @see {@link goog.db} Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {ydn.db.schema.Database|DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty
 * auto-schema is used.
 * @param {!StorageOptions=} opt_options options.
 * @throws {ConstraintError} if fix version is used, but client database
 * schema is dissimilar.
 * @implements {ydn.db.con.IStorage}
 * @constructor
 * @extends {goog.events.EventTarget}
 */
ydn.db.con.Storage = function(opt_dbname, opt_schema, opt_options) {

  goog.base(this);

  var options = opt_options || {};

  if (goog.DEBUG) {
    var fields = ['autoSchema', 'connectionTimeout', 'size', 'mechanisms',
      'policy', 'isSerial'];
    for (var key in options) {
      if (options.hasOwnProperty(key) &&
          goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown attribute "' +
            key + '" in options.');
      }
    }
    if (options.mechanisms) {
      if (!goog.isArray(options.mechanisms)) {
        throw new ydn.debug.error.ArgumentException('mechanisms attribute ' +
            'must be an array but ' + goog.typeOf(options.mechanisms) +
            ' found.');
      }
      for (var i = 0; i < options.mechanisms.length; i++) {
        if (!goog.array.contains(ydn.db.con.Storage.PREFERENCE,
            options.mechanisms[i])) {
          throw new ydn.debug.error.ArgumentException('Invalid mechanism "' +
              options.mechanisms[i] + '"');
        }
      }
    }
  }

  /**
   * @final
   * @type {!Array.<string>}
   */
  this.mechanisms = options.mechanisms || ydn.db.con.Storage.PREFERENCE;

  /**
   * @final
   */
  this.size = options.size;

  /**
   * @final
   */
  this.connectionTimeout = goog.isDef(options.connectionTimeout) ?
      options.connectionTimeout :
      ydn.db.con.Storage.DEBUG ?
      1000 : goog.DEBUG ? 30 * 1000 : 30 * 60 * 1000;

  /**
   * @final
   * @type {boolean}
   */
  this.use_text_store = goog.isDef(options.use_text_store) ?
      options.use_text_store : ydn.db.base.ENABLE_DEFAULT_TEXT_STORE;

  this.db_ = null;

  /**
   * Transaction queue
   * @private
   * @final
   * @type {!Array.<{
   *    fnc: Function,
   *    scopes: Array.<string>,
   *    mode: ydn.db.base.TransactionMode,
   *    oncompleted: function(ydn.db.base.TxEventTypes, *)
   *  }>}
   */
  this.txQueue_ = [];

  this.in_version_change_tx_ = false;

  var schema;
  if (opt_schema instanceof ydn.db.schema.Database) {
    schema = opt_schema;
  } else if (goog.isObject(opt_schema)) {
    /**
     * @type {!DatabaseSchema}
     */
    var schema_json = opt_schema;
    if (options.autoSchema || !goog.isDef(schema_json.stores)) {
      schema = new ydn.db.schema.EditableDatabase(schema_json);
    } else {
      schema = new ydn.db.schema.Database(schema_json);
    }

    var n = schema_json.stores ? schema_json.stores.length : 0;
    for (var i = 0; i < n; i++) {
      var store = schema.getStore(schema_json.stores[i].name);
      if (schema_json.stores[i].Sync) {
        this.addSynchronizer(store, schema_json.stores[i].Sync);
      }
    }

  } else {
    schema = new ydn.db.schema.EditableDatabase();
  }

  /**
   * @final
   * @protected
   * @type {!ydn.db.schema.Database}
   */
  this.schema = schema;

  if (goog.isDef(opt_dbname)) {
    this.setName(opt_dbname);
  }
};
goog.inherits(ydn.db.con.Storage, goog.events.EventTarget);


/**
 * @protected
 * @define {boolean} turn on debug flag to dump object.
 */
ydn.db.con.Storage.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.Storage.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.con.Storage');


/**
 * Get current schema.
 * @param {function(ydn.db.schema.Database)=} opt_callback schema in database.
 * @return {DatabaseSchema} schema in memory. Null if not connected.
 */
ydn.db.con.Storage.prototype.getSchema = function(opt_callback) {
  if (goog.isDef(opt_callback)) {
    var callback = function(schema) {
      opt_callback(schema.toJSON());
    };
    if (this.db_) {
      this.db_.getSchema(callback);
    } else {
      var me = this;
      goog.asserts.assertFunction(callback, 'schema'); // compiler complained.
      var get_schema = function(tx) {
        me.db_.getSchema(callback, tx);
      };
      this.transaction(get_schema, null, ydn.db.base.TransactionMode.READ_ONLY);
    }
  }
  return this.schema ? /** @type {!DatabaseSchema} */ (this.schema.toJSON()) :
      null;
};


/**
 * Add a store schema to current database schema on auto schema generation
 * mode {@see #auto_schema}.
 * If the store already exist it will be updated as necessary.
 * @param {!StoreSchema|!ydn.db.schema.Store} store_schema store schema.
 * @return {!goog.async.Deferred} promise.
 */
ydn.db.con.Storage.prototype.addStoreSchema = function(store_schema) {

  /**
   *
   * @type {ydn.db.schema.Store}
   */
  var new_store = store_schema instanceof ydn.db.schema.Store ?
      store_schema : ydn.db.schema.Store.fromJSON(store_schema);

  var store_name = store_schema.name;
  var store = this.schema.getStore(store_name);
  if (!new_store.similar(store)) {

    var action = store ? 'update' : 'add';

    if (this.schema instanceof ydn.db.schema.EditableDatabase) {
      // do update
      var schema = /** @type {ydn.db.schema.EditableDatabase} */ (this.schema);
      schema.addStore(new_store);
      if (this.db_) {
        this.db_.close();
        this.db_ = null;
        return this.connectDatabase();
      } else {
        return goog.async.Deferred.succeed(false);
      }
    } else {
      var msg = goog.DEBUG ? 'Cannot ' + action + ' store: ' +
          store_name + '. Not auto schema generation mode.' : '';
      throw new ydn.error.ConstraintError(msg);
    }
  } else {
    return goog.async.Deferred.succeed(false); // no change required
  }
};


/**
 * Set database name. This will initialize the database.
 * @export
 * @throws {Error} name already defined.
 * @param {string} db_name set database name.
 */
ydn.db.con.Storage.prototype.setName = function(db_name) {
  if (this.db_) {
    throw Error('Already defined with ' + this.db_name);
  }

  /**
   * @final
   */
  this.db_name = db_name;
  this.connectDatabase();

};


/**
 * @type {string}
 * @protected
 */
ydn.db.con.Storage.prototype.db_name;


/**
 * @type {ydn.db.con.IDatabase}
 * @private
 */
ydn.db.con.Storage.prototype.db_;


/**
 * @type {number|undefined}
 * @protected
 */
ydn.db.con.Storage.prototype.size;


/**
 * @type {number}
 * @protected
 */
ydn.db.con.Storage.prototype.connectionTimeout;


/**
 * Super class must not mutate schema data.
 * @type {!ydn.db.schema.Database} database schema as requested.
 */
ydn.db.con.Storage.prototype.schema;


/**
 *
 * @return {string} name of database.
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
  ydn.db.base.Mechanisms.IDB,
  ydn.db.base.Mechanisms.WEBSQL,
  ydn.db.base.Mechanisms.LOCAL_STORAGE,
  ydn.db.base.Mechanisms.SESSION_STORAGE,
  ydn.db.base.Mechanisms.USER_DATA,
  ydn.db.base.Mechanisms.MEMORY_STORAGE];


/**
 * Create database instance.
 * @protected
 * @param {string} db_type database type.
 * @return {ydn.db.con.IDatabase} newly created database instance.
 */
ydn.db.con.Storage.prototype.createDbInstance = function(db_type) {

  if (!ydn.db.base.NO_IDB && db_type == ydn.db.base.Mechanisms.IDB) {
    return new ydn.db.con.IndexedDb(this.size, this.connectionTimeout);
  } else if (!ydn.db.base.NO_WEBSQL &&
      db_type == ydn.db.base.Mechanisms.WEBSQL) {
    return new ydn.db.con.WebSql(this.size);
  } else if (!ydn.db.base.NO_SIMPLE &&
      db_type == ydn.db.base.Mechanisms.LOCAL_STORAGE) {
    return new ydn.db.con.LocalStorage();
  } else if (!ydn.db.base.NO_SIMPLE &&
      db_type == ydn.db.base.Mechanisms.SESSION_STORAGE) {
    return new ydn.db.con.SessionStorage();
  } else if (!ydn.db.base.NO_SIMPLE &&
      db_type == ydn.db.base.Mechanisms.MEMORY_STORAGE) {
    return new ydn.db.con.SimpleStorage();
  } else if (!ydn.db.base.NO_SIMPLE &&
      db_type == ydn.db.base.Mechanisms.USER_DATA) {
    return new ydn.db.con.simple.UserData();
  }
  return null;
};


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * @protected
 * @return {!goog.async.Deferred} promise.
 */
ydn.db.con.Storage.prototype.connectDatabase = function() {
  // handle version change

  var me = this;
  goog.asserts.assertString(this.db_name, 'database name must be a string' +
      ' but found ' + this.db_name + ' of type ' + (typeof this.db_name));

  var df = new goog.async.Deferred();
  var resolve = function(is_connected, ev) {
    if (is_connected) {
      me.logger.finest(me + ': ready.');
      me.last_queue_checkin_ = NaN;

      goog.Timer.callOnce(function() {
        // dispatch asynchroniously so that any err on running db request
        // are not caught under deferred object.

        me.onReady(ev);
        me.popTxQueue_();
      });
      df.callback(ev);

    } else {
      me.logger.warning(me + ': database connection fail ' + ev.name);

      goog.Timer.callOnce(function() {
        me.onReady(ev);
        me.purgeTxQueue_(ev);
      });

      df.errback(ev);
    }
  };

  /**
   * The connected database instance.
   * @type {ydn.db.con.IDatabase}
   */
  var db = null;

  // go according to ordering
  var preference = this.mechanisms;
  for (var i = 0; i < preference.length; i++) {
    var db_type = preference[i].toLowerCase();
    if (db_type == ydn.db.base.Mechanisms.IDB &&
        ydn.db.con.IndexedDb.isSupported()) { // run-time detection
      db = this.createDbInstance(db_type);
      break;
    } else if (db_type == ydn.db.base.Mechanisms.WEBSQL &&
        ydn.db.con.WebSql.isSupported()) {
      db = this.createDbInstance(db_type);
      break;
    } else if (db_type == ydn.db.base.Mechanisms.LOCAL_STORAGE &&
        ydn.db.con.LocalStorage.isSupported()) {
      db = this.createDbInstance(db_type);
      break;
    } else if (db_type == ydn.db.base.Mechanisms.SESSION_STORAGE &&
        ydn.db.con.SessionStorage.isSupported()) {
      db = this.createDbInstance(db_type);
      break;
    } else if (db_type == ydn.db.base.Mechanisms.MEMORY_STORAGE) {
      db = this.createDbInstance(db_type);
      break;
    } else if (db_type == ydn.db.base.Mechanisms.USER_DATA) {
      db = this.createDbInstance(db_type);
      break;
    }
  }

  if (goog.isNull(db)) {

    var e = new ydn.error.ConstraintError('No storage mechanism found.');

    var event = new ydn.db.events.StorageEvent(ydn.db.events.Types.READY, this,
        NaN, NaN, e);
    resolve(false, event);
  } else {

    this.init(); // let super class to initialize.

    db.connect(this.db_name, this.schema).addCallbacks(function(old_version) {
      this.db_ = db;
      var event = new ydn.db.events.StorageEvent(ydn.db.events.Types.READY,
          this, parseFloat(db.getVersion()), parseFloat(old_version), null);
      resolve(true, event);

      /**
       *
       * @param {*} e event.
       */
      db.onDisconnected = function(e) {

        this.logger.finest(this + ': disconnected.');
        // no event for disconnected.

      };
    }, function(e) {
      this.logger.warning(this + ': opening fail: ' + e.message);
      var event = new ydn.db.events.StorageEvent(ydn.db.events.Types.READY,
          this, NaN, NaN, e);
      event.message = e.message;
      resolve(false, event);
    }, this);

  }

  return df;

};


/**
 *
 * @return {string|undefined} database mechanism type.
 * @export
 */
ydn.db.con.Storage.prototype.getType = function() {
  if (this.db_) {
    return this.db_.getType();
  } else {
    return undefined;
  }
};


/**
 * Handle ready event by dispatching 'ready' event.
 * @param {ydn.db.events.StorageEvent} ev event.
 * @expose since we want this function to be overidable, we have to use expose
 * instead of goog.exportProperty.
 */
ydn.db.con.Storage.prototype.onReady = function(ev) {
  this.dispatchEvent(ev);
};


/**
 *
 * @return {boolean} true on ready.
 */
ydn.db.con.Storage.prototype.isReady = function() {
  return !!this.db_ && this.db_.isReady();
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
    this.logger.finest(this + ' closed');
  }
};


/**
 * Get nati database instance.
 * @return {*} database instance.
 * @deprecated no longer exported.
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
ydn.db.con.Storage.QUEUE_LIMIT = 100;


/**
 * Return number elements in tx queue.
 * @return {number}
 */
ydn.db.con.Storage.prototype.countTxQueue = function() {
  return this.txQueue_.length;
};


/**
 * Run the first transaction task in the queue. DB must be ready to do the
 * transaction.
 * @private
 */
ydn.db.con.Storage.prototype.popTxQueue_ = function() {

  var task = this.txQueue_.shift();
  if (task) {
    this.logger.finest('pop tx queue[' + (this.txQueue_.length + 1) + ']');
    this.transaction(task.fnc, task.scopes, task.mode, task.oncompleted);
  }
  this.last_queue_checkin_ = goog.now();
};


/**
 * Push a transaction job to the queue.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_on_completed handler.
 * @private
 */
ydn.db.con.Storage.prototype.pushTxQueue_ = function(trFn, store_names,
    opt_mode, opt_on_completed) {
  this.logger.finest('push tx queue[' + this.txQueue_.length + ']');
  this.txQueue_.push({
    fnc: trFn,
    scopes: store_names,
    mode: opt_mode,
    oncompleted: opt_on_completed
  });

  if (goog.DEBUG && this.txQueue_.length > ydn.db.con.Storage.QUEUE_LIMIT &&
      (this.txQueue_.length % ydn.db.con.Storage.QUEUE_LIMIT) == 0) {
    this.logger.warning('Transaction queue stack size is ' +
        this.txQueue_.length +
        '. It is too large, possibility due to incorrect usage.');
  }

};


/**
 * Abort the queuing tasks.
 * @private
 * @param {Error} e error.
 */
ydn.db.con.Storage.prototype.purgeTxQueue_ = function(e) {
  if (this.txQueue_) {
    this.logger.info('Purging ' + this.txQueue_.length +
        ' transactions request.');
    var task;
    while (task = this.txQueue_.shift()) {
      // task.fnc(null); this will cause error
      if (task.oncompleted) {
        task.oncompleted(ydn.db.base.TxEventTypes.ERROR, e);
      }
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
 * @param {Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_on_completed handler.
 * @final
 */
ydn.db.con.Storage.prototype.transaction = function(trFn, store_names,
    opt_mode, opt_on_completed) {

  var names = store_names;

  if (goog.isString(store_names)) {
    names = [store_names];
  } else if (!goog.isDefAndNotNull(store_names)) {
    names = null;
  } else {
    if (goog.DEBUG) {
      if (!goog.isArrayLike(store_names)) {  // could be  DOMStringList or Array
        throw new ydn.debug.error.ArgumentException(
            'store names must be an array');
      } else if (store_names.length == 0) {
        throw new ydn.debug.error.ArgumentException(
            'number of store names must more than 0');
      } else {
        for (var i = 0; i < store_names.length; i++) {
          if (!goog.isString(store_names[i])) {
            throw new ydn.debug.error.ArgumentException('store name at ' + i +
                ' must be string but found ' + typeof store_names[i]);
          }
        }
      }
    }
  }

  var is_ready = !!this.db_ && this.db_.isReady();
  if (!is_ready || this.in_version_change_tx_) {
    // a "versionchange" transaction is still running, a InvalidStateError
    // exception will be thrown
    this.pushTxQueue_(trFn, names, opt_mode, opt_on_completed);
    return;
  }

  var me = this;

  var mode = goog.isDef(opt_mode) ? opt_mode :
      ydn.db.base.TransactionMode.READ_ONLY;

  if (mode == ydn.db.base.TransactionMode.VERSION_CHANGE) {
    this.in_version_change_tx_ = true;
  }

  var on_complete = function(type, ev) {
    if (goog.isFunction(opt_on_completed)) {
      opt_on_completed(type, ev);
      opt_on_completed = undefined;
    }
    if (mode == ydn.db.base.TransactionMode.VERSION_CHANGE) {
      me.in_version_change_tx_ = false;
    }
    me.popTxQueue_();
  };

  //console.log('core running ' + trFn.name);
  this.db_.doTransaction(function(tx) {
    trFn(tx);
    trFn = null;
  }, names, mode, on_complete);

};


/**
 *
 * @return {boolean} true if auto version mode.
 */
ydn.db.con.Storage.prototype.isAutoVersion = function() {
  return this.schema.isAutoVersion();
};


/**
 *
 * @return {boolean} true if auto schema mode.
 */
ydn.db.con.Storage.prototype.isAutoSchema = function() {
  return this.schema.isAutoSchema();
};


/**
 * ydn.db.sync module will override this method to inject sync functions.
 * @param {ydn.db.schema.Store} store
 * @param {StoreSyncOptionJson} option
 * @protected
 */
ydn.db.con.Storage.prototype.addSynchronizer = function(store, option) {
  this.logger.warning('Synchronization option for ' + store.getName() +
      ' ignored.');
};


/**
 * For validating user input.
 * @return {!Array.<string>} list of event types.
 */
ydn.db.con.Storage.prototype.getEventTypes = function() {
  return ['created', 'ready', 'deleted', 'updated'];
};


if (goog.DEBUG) { // don't allow to added non existing event type
  /**
   * @inheritDoc
   */
  ydn.db.con.Storage.prototype.addEventListener = function(
      type, handler, opt_capture, opt_handlerScope) {
    var event_types = this.getEventTypes();
    var checkType = function(type) {
      if (!goog.array.contains(event_types,
          type)) {
        throw new ydn.debug.error.ArgumentException('Invalid event type "' +
            type + '"');
      }
    };
    if (goog.isArrayLike(type)) {
      for (var i = 0; i < type.length; i++) {
        checkType(type[i]);
      }
    } else {
      checkType(type);
    }
    goog.base(this, 'addEventListener', type, handler, opt_capture,
        opt_handlerScope);
  };
}

if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.con.Storage.prototype.toString = function() {
    return 'Storage:' + this.db_;
  };
}



