// Copyright 2012 YDN Authors. All Rights Reserved.
//
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
 * @fileoverview IndexedDb connector.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.con.IndexedDb');
goog.require('goog.Timer');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Error');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db.base');
goog.require('ydn.db.con.IDatabase');
goog.require('ydn.db.schema.Database');
goog.require('ydn.json');


/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema
 *
 * @param {number=} opt_size estimated database size.
 * @implements {ydn.db.con.IDatabase}
 * @constructor
 */
ydn.db.con.IndexedDb = function(opt_size) {

  if (goog.isDef(opt_size)) {
    // https://developers.google.com/chrome/whitepapers/storage#asking_more
    // IndexedDB is yet to implement in Quota Management API.
    /*
    webkitStorageInfo.requestQuota(
        webkitStorageInfo.PERSISTENT
        newQuotaInBytes,
        quotaCallback,
        errorCallback);
    */
    if (opt_size > 5 * 1024 * 1024) { // no need to ask for 5 MB.
      this.logger.warning('storage size request ignored.');
    }
  }

  this.idx_db_ = null;

};



/**
 * @inheritDoc
 */
ydn.db.con.IndexedDb.prototype.connect = function(dbname, schema) {

  /**
   * @type {ydn.db.con.IndexedDb}
   */
  var me = this;
  var df = new goog.async.Deferred();

  /**
   * This is final result of connection. It is either fail or connected
   * and only once.
   * @param {IDBDatabase} db database instance.
   * @param {Error=} e error.
   */
  var setDb = function(db, e) {

    if (goog.isDef(e)) {
      me.logger.warning(e ? e.message : 'Error received.');
      me.idx_db_ = null;
      df.errback(e);
    } else {
      goog.asserts.assertObject(db);
      me.idx_db_ = db;
      me.idx_db_.onabort = function(e) {
        me.logger.finest(me + ': onabort - ' + e.message);
      };
      me.idx_db_.onerror = function(e) {
        if (ydn.db.con.IndexedDb.DEBUG) {
          window.console.log([this, e]);
        }
        me.logger.finest(me + ': onerror - ' + e.message);
      };

      /**
       * @this {null}
       * @param {IDBVersionChangeEvent} event event.
       */
      me.idx_db_.onversionchange = function(event) {
        // Handle version changes while a web app is open in another tab
        // https://developer.mozilla.org/en-US/docs/IndexedDB/Using_IndexedDB#
        // Version_changes_while_a_web_app_is_open_in_another_tab
        //
        if (ydn.db.con.IndexedDb.DEBUG) {
          window.console.log([this, event]);
        }
        me.logger.finest(me + ': onversionchange to: ' + event.version);
        if (me.idx_db_) {
          me.idx_db_.onabort = null;
          me.idx_db_.onerror = null;
          me.idx_db_.onversionchange = null;
          me.idx_db_.close();
          me.idx_db_ = null;
          if (goog.isFunction(me.onDisconnected)) {
            me.onDisconnected(event);
          }
        }
      };
      df.callback(true);
    }

  };


  /**
   * Migrate from current version to the given version.
   * @protected
   * @param {IDBDatabase} db database instance.
   * @param {IDBTransaction} trans transaction.
   * @param {boolean=} is_caller_setversion call from set version;.
   */
  var updateSchema = function(db, trans, is_caller_setversion) {

    var action = is_caller_setversion ? 'changing' : 'upgrading';
    me.logger.finer(action + ' version to ' + db.version + ' from ' +
      schema.getVersion());


    // create store that we don't have previously
    for (var i = 0; i < schema.stores.length; i++) {
      // this is sync process.
      me.update_store_(db, trans, schema.stores[i]);
    }

    //var storeNames = /** @type {DOMStringList} */ (db.objectStoreNames);
    //this.setSchema(db, trans, storeNames, schema);

    // TODO: delete unused stores ?
  };

  var version = schema.getVersion();

  // In chrome, version is taken as description.
  me.logger.finer('Opening database: ' + dbname + ' ver: ' + version);

  /**
   * Currently in transaction stage, opening indexedDB return two format.
   * IDBRequest from old and IDBOpenDBRequest from new API.
   * @type {IDBOpenDBRequest|IDBRequest}
   */
  var openRequest;
  if (!goog.isDef(version)) {
    // auto schema do not have version
    // Note: undefined is not 'not defined', i.e. open('name', undefined)
    // is not the same effect as open('name');
    openRequest = ydn.db.con.IndexedDb.indexedDb.open(dbname);
  } else {
    openRequest = ydn.db.con.IndexedDb.indexedDb.open(dbname, version);
    // version could be number (new) or string (old).
    // casting is for old externs uncorrected defined as string
    // old version will think, version as description.

  }


  openRequest.onsuccess = function(ev) {
    /**
     * @type {IDBDatabase}
     */
    var db = ev.target.result;
    var msg = 'Database: ' + db.name + ', ver: ' + db.version + ' opened.';
    me.logger.finer(msg);

    if (schema.isAutoVersion()) {
      // since there is no version, auto schema always need to validate
      /**
       * Validate given schema and schema of opened database.
       * @param {ydn.db.schema.Database} db_schema schema.
       */
      var schema_updater = function(db_schema) {

        // add existing object store
        if (schema.isAutoSchema()) {
          for (var i = 0; i < db_schema.stores.length; i++) {
            if (!schema.hasStore(db_schema.stores[i].name)) {
              schema.addStore(db_schema.stores[i].clone());
            }
          }
        }

        var diff_msg = schema.difference(db_schema);
        if (diff_msg.length > 0) {
          me.logger.finer('Schema change require for difference in ' +
            diff_msg);

          var on_completed = function(t, e) {
            if (t == ydn.db.base.TransactionEventTypes.COMPLETE) {
              setDb(db);
            } else {
              me.logger.severe('Fail to update version on ' + db.name + ':' +
                db.version);
              setDb(null, e);
            }
          };

          var next_version = goog.isNumber(db.version) ? db.version + 1 : 1;

          if ('IDBOpenDBRequest' in goog.global) {
            db.close();
            var req = ydn.db.con.IndexedDb.indexedDb.open(
              dbname, /** @type {number} */ (next_version));
            req.onupgradeneeded = function(ev) {
              var db = ev.target.result;
              me.logger.finer('re-open for version ' + db.version);
              updateSchema(db, req['transaction'], false);

            };
            req.onsuccess = function(ev) {
              setDb(ev.target.result);
            };
            req.onerror = function(e) {
              me.logger.finer(me + ': fail.');
              setDb(null);
            };
          } else {
            var ver_request = db.setVersion(next_version + '');

            ver_request.onfailure = function(e) {
              me.logger.warning('migrating from ' + db.version + ' to ' +
                next_version + ' failed.');
              setDb(null, e);
            };

            var trans = ver_request['transaction'];
            ver_request.onsuccess = function(e) {
              updateSchema(db, trans, true);
            };

            //
            trans.oncomplete = function(e) {

              // for old format.
              // by reopening the database, we make sure that we are not in
              // version change state since transaction cannot open during
              // version change state.
              // db.close(); // necessary - cause error ?
              var reOpenRequest = ydn.db.con.IndexedDb.indexedDb.open(dbname);
              reOpenRequest.onsuccess = function(rev) {
                var db = rev.target.result;
                me.logger.finer(me + ': OK.');
                setDb(db);
              };

              reOpenRequest.onerror = function(e) {
                me.logger.finer(me + ': fail.');
                setDb(null);
              };
            };

          }

        } else {
          setDb(db);
        }
      };
      me.getSchema(schema_updater, undefined, db);

    } else if (schema.getVersion() > db.version) {

      // in old format, db.version will be a string. type coercion should work
      // here

      goog.asserts.assertFunction(db['setVersion'],
        'Expecting IDBDatabase in old format');
      var version = /** @type {*} */ (schema.getVersion());
      var ver_request = db.setVersion(/** @type {string} */ (version));

      ver_request.onfailure = function(e) {
        me.logger.warning('migrating from ' + db.version + ' to ' +
          schema.getVersion() + ' failed.');
        setDb(null, e);
      };
      ver_request.onsuccess = function(e) {
        updateSchema(db, ver_request['transaction'], true);
      };
    } else {
      if (schema.getVersion() == db.version) {
        me.logger.finer('database version ' + db.version + ' ready to go');
      } else {
        // this will not happen according to IDB spec.
        me.logger.warning('connected database version ' + db.version +
          ' is higher than requested version.');
      }

      /**
       * Validate given schema and schema of opened database.
       * @param {ydn.db.schema.Database} db_schema schema.
       */
      var validator = function(db_schema) {
        var diff_msg = schema.difference(db_schema);
        if (diff_msg.length > 0) {
          me.logger.finer(diff_msg);
          setDb(null, new ydn.error.ConstrainError('different schema: ' +
            diff_msg));
        } else {
          setDb(db);
        }
      };

      me.getSchema(validator, undefined, db);

    }
  };

  openRequest.onupgradeneeded = function(ev) {
    var db = ev.target.result;
    me.logger.finer('upgrade needed for version ' + db.version);
    updateSchema(db, openRequest['transaction'], false);
  };

  openRequest.onerror = function(ev) {
    var msg = 'opening database ' + dbname + ':' + schema.version + ' failed.';
    if (ydn.db.con.IndexedDb.DEBUG) {
      window.console.log([ev, openRequest]);
    }
    me.logger.severe(msg);
    setDb(null, ev);
  };

  openRequest.onblocked = function(ev) {
    if (ydn.db.con.IndexedDb.DEBUG) {
      window.console.log([ev, openRequest]);
    }
    me.logger.severe('database ' + dbname + ' ' + schema.version +
      ' block, close other connections.');

    // should we reopen again after some time?
    setDb(null, ev);
  };

  // extra checking whether, database is OK
  if (goog.DEBUG || ydn.db.con.IndexedDb.DEBUG) {
    var timer = new goog.Timer(1000);
    timer.addEventListener(goog.Timer.TICK, function() {
      if (openRequest.readyState != 'done') {
        // what we observed is chrome attached error object to openRequest
        // but did not call any of over listening events.
        var msg = me + ': database state is still ' + openRequest.readyState;
        me.logger.severe(msg);
      } else {
        timer.stop();
        timer.dispose();
      }
    });
  }

  return df;

};


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.con.IndexedDb.DEBUG = goog.DEBUG && false;


/**
 * @const
 * @type {IDBFactory} IndexedDb.
 */
ydn.db.con.IndexedDb.indexedDb = goog.global.indexedDB ||
  goog.global.mozIndexedDB || goog.global.webkitIndexedDB ||
  goog.global.moz_indexedDB ||
  goog.global['msIndexedDB'];


/**
 * @const
 * @type {string}
 */
ydn.db.con.IndexedDb.TYPE = 'indexeddb';


/**
 * @return {string} storage mechanism type.
 */
ydn.db.con.IndexedDb.prototype.type = function() {
  return ydn.db.con.IndexedDb.TYPE;
};


/**
 * Return database object, on if it is ready.
 * @final
 * @return {IDBDatabase} this instance.
 */
ydn.db.con.IndexedDb.prototype.getDbInstance = function() {
  // no checking for closing status. caller should know it.
  return this.idx_db_ || null;
};


/**
 * @inheritDoc
 */
ydn.db.con.IndexedDb.prototype.isReady = function() {
  return !!this.idx_db_;
};


/**
 *
 * @return {boolean} return indexedDB support on run time.
 */
ydn.db.con.IndexedDb.isSupported = function() {
  return !!ydn.db.con.IndexedDb.indexedDb;
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.con.IndexedDb');



/**
 * @private
 * @type {IDBDatabase}
 */
ydn.db.con.IndexedDb.prototype.idx_db_ = null;


/**
 * @inheritDoc
 */
ydn.db.con.IndexedDb.prototype.getSchema = function(callback, trans, db) {

  /**
   * @type {IDBDatabase}
   */
  var idb = /** @type {IDBDatabase} */ (db) || this.idx_db_;
  var mode = ydn.db.base.TransactionMode.READ_ONLY;
  if (!goog.isDef(trans)) {
    var names = [];
    for (var i = idb.objectStoreNames.length - 1; i >= 0; i--) {
      names[i] = idb.objectStoreNames[i];
    }
    if (names.length == 0) {
      // http://www.w3.org/TR/IndexedDB/#widl-IDBDatabase-transaction-
      // IDBTransaction-any-storeNames-DOMString-mode
      //
      // InvalidAccessError: The function was called with an empty list of
      // store names

      callback(new ydn.db.schema.Database(idb.version));
      return;
    }
    trans = idb.transaction(names, /** @type {number} */ (mode));
  } else if (goog.isNull(trans)) {
    if (idb.objectStoreNames.length == 0) {
      callback(new ydn.db.schema.Database(idb.version));
      return;
    } else {
      throw new ydn.error.InternalError();
    }
  } else {
    //window.console.log(['trans', trans]);
    idb = trans['db'];
  }

  /** @type {DOMStringList} */
  var objectStoreNames = /** @type {DOMStringList} */ (idb.objectStoreNames);

  var stores = [];
  var n = objectStoreNames.length;
  for (var i = 0; i < n; i++) {
    /**
     * @type {IDBObjectStore}
     */
    var objStore = trans.objectStore(objectStoreNames[i]);
    var indexes = [];
    for (var j = objStore.indexNames.length - 1; j >= 0; j--) {
      /**
       * @type {IDBIndex}
       */
      var index = objStore.index(objStore.indexNames[j]);
      indexes[j] = new ydn.db.schema.Index(index.keyPath, undefined,
        index.unique, index.multiEntry, index.name);
    }
    stores[i] = new ydn.db.schema.Store(objStore.name, objStore.keyPath,
      objStore.autoIncrement, undefined, indexes);
  }
  var schema = new ydn.db.schema.Database(/** @type {number} */ (idb.version),
    stores);

  callback(schema);
};


/**
 *
 * @param {IDBDatabase} db database.
 * @param {IDBTransaction} trans transaction.
 * @param {ydn.db.schema.Store} store_schema store schema.
 * @private
 */
ydn.db.con.IndexedDb.prototype.update_store_ = function(db, trans, store_schema)
{
  this.logger.finest('Creating Object Store for ' + store_schema.name +
    ' keyPath: ' + store_schema.keyPath);

  var objectStoreNames = /** @type {DOMStringList} */ (db.objectStoreNames);

  var store;
  if (objectStoreNames.contains(store_schema.name)) {
    // already have the store, just update indexes

    store = trans.objectStore(store_schema.name);
    goog.asserts.assertObject(store, store_schema.name + ' not found.');

    if (store.keyPath != store_schema.keyPath) {
      throw new ydn.error.InvalidOperationException('keyPath: ' +
        store.keyPath + ' in ' + store_schema.name +
        ' cannot be changed into ' + store_schema.keyPath);
    }

    var indexNames = /** @type {DOMStringList} */ (store.indexNames);

    var created = 0;
    var deleted = 0;
    for (var j = 0; j < store_schema.indexes.length; j++) {
      var index = store_schema.indexes[j];
      if (!indexNames.contains(index.name)) {
        store.createIndex(index.name, index.keyPath, {unique: index.unique});
        created++;
      }
    }
    for (var j = 0; j < indexNames.length; j++) {
      if (!store_schema.hasIndex(indexNames[j])) {
        store.deleteIndex(indexNames[j]);
        deleted++;
      }
    }

    this.logger.finest('Updated store: ' + store.name + ', ' + created +
      ' index created, ' + deleted + ' index deleted.');
  } else {

    // IE10 is picky on optional parameters of keyPath. If it is undefined,
    // it must not be defined.
    var options = {'autoIncrement': store_schema.autoIncrement};
    if (goog.isDefAndNotNull(store_schema.keyPath)) {
      options['keyPath'] = store_schema.keyPath;
    }
    try {
      store = db.createObjectStore(store_schema.name, options);
    } catch (e) {
      if (e.name == 'InvalidAccessError') {
        throw new ydn.db.InvalidAccessError('creating store for ' +
          store_schema.name + ' of keyPath: ' +
          store_schema.keyPath + ' and autoIncrement: ' +
          store_schema.autoIncrement);
      } else if (e.name == 'ConstraintError') {
        // store already exist.
        throw new ydn.error.ConstrainError('creating store for ' +
          store_schema.name);
      } else {
        throw e;
      }
    }

    for (var j = 0; j < store_schema.indexes.length; j++) {
      var index = store_schema.indexes[j];
      if (index.unique || index.multiEntry) {
        var idx_options = {unique: index.unique, multiEntry: index.multiEntry};
        store.createIndex(index.name, index.name, idx_options);
      } else {
        store.createIndex(index.name, index.name);
      }
    }

    this.logger.finest('Created store: ' + store.name + ' keyPath: ' +
      store.keyPath);
  }
};


/**
 * When DB is ready, fnc will be call with a fresh transaction object. Fnc must
 * put the result to 'result' field of the transaction object on success. If
 * 'result' field is not set, it is assumed
 * as failed.
 * @protected
 * @param {function(IDBTransaction)|Function} fnc transaction function.
 * @param {Array.<string>} scopes list of stores involved in the
 * transaction. If null, all stores is used.
 * @param {ydn.db.base.TransactionMode} mode mode.
 * @param {function(ydn.db.base.TransactionEventTypes, *)}
  * completed_event_handler handler.
 */
ydn.db.con.IndexedDb.prototype.doTransaction = function(fnc, scopes, mode,
      completed_event_handler) {

  /**
   *
   * @type {IDBDatabase}
   */
  var db = this.idx_db_;

  if (!scopes) {
    scopes = [];
    for (var i = db.objectStoreNames.length - 1; i >= 0; i--) {
      scopes[i] = db.objectStoreNames[i];
    }
  }

  if (scopes.length == 0) {
    fnc(null);
    // opening without object store name will cause InvalidAccessError
  }

  var tx;
  try { // this try...catch block will removed on non-debug compiled.
    tx = db.transaction(scopes, /** @type {number} */ (mode));
  } catch (e) {
    if (goog.DEBUG && e.name == 'NotFoundError') {
      // http://www.w3.org/TR/IndexedDB/#widl-IDBDatabase-transaction-
      // IDBTransaction-any-storeNames-DOMString-mode

      // show informative message on debug mode.
      throw new ydn.db.NotFoundError('stores not found: ' +
        ydn.json.stringify(scopes) + ' in ' +
        ydn.json.stringify(db.objectStoreNames));

    // InvalidAccessError will not happen with our logic.
    //}
    // if (goog.DEBUG && e.name == 'InvalidAccessError') {
    //  throw new ydn.db.NotFoundError('store names must be given: ' +
    // ydn.json.stringify(scopes));
    } else {
      throw e;
    }
  }

  tx.oncomplete = function(event) {
    completed_event_handler(ydn.db.base.TransactionEventTypes.COMPLETE, event);
  };

  tx.onerror = function(event) {
    completed_event_handler(ydn.db.base.TransactionEventTypes.ERROR, event);
  };

  tx.onabort = function(event) {
    completed_event_handler(ydn.db.base.TransactionEventTypes.ABORT, event);
  };

  fnc(tx);

};


/**
 * Close the connection.
 */
ydn.db.con.IndexedDb.prototype.close = function() {
  this.idx_db_.close(); // IDB return void.
};


/**
 * @override
 */
ydn.db.con.IndexedDb.prototype.toString = function() {
  var s = this.idx_db_ ? this.idx_db_.name + ':' + this.idx_db_.version : '';
  return this.type() + ':' + s;
};
