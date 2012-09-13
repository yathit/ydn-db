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
 * @fileoverview Wrapper for IndexedDb.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.adapter.IndexedDb');
goog.require('goog.Timer');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Error');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db');
goog.require('ydn.db.DatabaseSchema');
goog.require('ydn.db.adapter.IDatabase');
goog.require('ydn.json');


/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @implements {ydn.db.adapter.IDatabase}
 * @constructor
 */
ydn.db.adapter.IndexedDb = function(dbname, schema) {
  var me = this;
  this.dbname = dbname;

  /**
   * @protected
   * @final
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = schema;

  this.idx_db_ = null;

  this.deferredIdxDb_ = new goog.async.Deferred();

  // Currently in unstable stage, opening indexedDB has two incompatible call.
  // version could be number of string.
  // In chrome, version is taken as description.
  var msg = 'Trying to open database: ' + this.dbname + ' ver: ' +
    this.schema.version;
  me.logger.finer(msg);
  if (ydn.db.adapter.IndexedDb.DEBUG) {
    window.console.log(msg);
  }

  /**
   * This open request return two format.
   * @type {IDBOpenDBRequest|IDBRequest}
   */
  var openRequest = ydn.db.adapter.IndexedDb.indexedDb.open(this.dbname,
    // old externs uncorrected defined as string
    /** @type {string} */ (this.schema.version));
  if (ydn.db.adapter.IndexedDb.DEBUG) {
    window.console.log(openRequest);
  }

  openRequest.onsuccess = function(ev) {
    var msg = me.dbname + ' ver: ' + me.schema.version + ' OK.';
    me.logger.finer(msg);
    if (ydn.db.adapter.IndexedDb.DEBUG) {
      window.console.log(msg);
    }
    var db = ev.target.result;
    var old_version = db.version;
    if (goog.isDef(me.schema.version) &&
      me.schema.version > old_version) { // for chrome
      msg = 'initializing database from ' + db.version + ' to ' +
        me.schema.version;
      me.logger.finer(msg);
      if (ydn.db.adapter.IndexedDb.DEBUG) {
        window.console.log(msg);
      }

      var setVrequest = db.setVersion(me.schema.version); // for chrome

      setVrequest.onfailure = function(e) {
        me.logger.warning('migrating from ' + db.version + ' to ' +
          me.schema.version + ' failed.');
        me.setDb(null);
      };
      setVrequest.onsuccess = function(e) {
        me.migrate(db, true);
        me.logger.finer('Migrated to version ' + db.version + '.');
        // db.close(); necessary?
        var reOpenRequest = ydn.db.adapter.IndexedDb.indexedDb.open(me.dbname);
        // have to reopen for new schema
        reOpenRequest.onsuccess = function(rev) {
          db = ev.target.result;
          me.logger.finer('version ' + db.version + ' ready.');
          me.setDb(db);
        };
      };
    } else {
      msg = 'database version ' + db.version + 'ready to go';
      if (ydn.db.adapter.IndexedDb.DEBUG) {
        window.console.log(msg);
      } else {
        me.logger.finer(msg);
      }
      me.setDb(db);
    }
  };

  openRequest.onupgradeneeded = function(ev) {
    var db = ev.target.result;
    var msg = 'upgrading version ' + db.version;
    if (ydn.db.adapter.IndexedDb.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.finer(msg);
    }

    me.migrate(db);

    var reOpenRequest = ydn.db.adapter.IndexedDb.indexedDb.open(me.dbname);
    reOpenRequest.onsuccess = function(rev) {
      db = ev.target.result;
      me.logger.finer('Database: ' + me.dbname + ' upgraded.');
      me.setDb(db);
    };
  };

  openRequest.onerror = function(ev) {
    var msg = 'opening database ' + dbname + ' failed.';
    if (ydn.db.adapter.IndexedDb.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.severe(msg);
    }
    me.db = null;
  };

  openRequest.onblocked = function(ev) {
    var msg = 'database ' + dbname + ' block, close other connections.';
    if (ydn.db.adapter.IndexedDb.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.severe(msg);
    }
    me.db = null;
  };

  openRequest.onversionchange = function(ev) {
    var msg = 'Version change request, so closing the database';
    if (ydn.db.adapter.IndexedDb.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.fine(msg);
    }
    if (me.db) {
      me.db.close();
    }
  };

  // extra checking whether, database is OK
  if (goog.DEBUG || ydn.db.adapter.IndexedDb.DEBUG) {
    goog.Timer.callOnce(function() {
      if (openRequest.readyState != 'done') {
        // what we observed is chrome attached error object to openRequest
        // but did not call any of over listening events.
        var msg = 'Database timeout ' + ydn.db.adapter.IndexedDb.timeOut +
          ' reached. Database state is ' + openRequest.readyState;
        me.logger.severe(msg);
        if (ydn.db.adapter.IndexedDb.DEBUG) {
          window.console.log(openRequest);
        }
        // me.abortTxQueue(new Error(msg)); how to notified ?
        goog.Timer.callOnce(function() {
          // we invoke error in later thread, so that task queue have
          // enough window time to clean up.
          throw Error(openRequest['error'] || msg);
        }, 500);
      }
    }, ydn.db.adapter.IndexedDb.timeOut, this);
  }

};


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.adapter.IndexedDb.DEBUG = goog.DEBUG && false;


/**
 * @const
 * @type {number}
 */
ydn.db.adapter.IndexedDb.timeOut = goog.DEBUG || ydn.db.adapter.IndexedDb.DEBUG ?
  500 : 3000;



/**
 * @const
 * @type {IDBFactory} IndexedDb.
 */
ydn.db.adapter.IndexedDb.indexedDb = goog.global.indexedDB ||
  goog.global.mozIndexedDB || goog.global.webkitIndexedDB ||
  goog.global.moz_indexedDB ||
  goog.global['msIndexedDB'];


/**
 * @const
 * @type {string}
 */
ydn.db.adapter.IndexedDb.TYPE = 'indexeddb';


/**
 * @return {string} storage mechanism type.
 */
ydn.db.adapter.IndexedDb.prototype.type = function() {
  return ydn.db.adapter.IndexedDb.TYPE;
};


/**
 * @type {goog.async.Deferred}
 * @private
 */
ydn.db.adapter.IndexedDb.prototype.deferredIdxDb_ = null;


/**
 *
 * @param {function(!ydn.db.adapter.IndexedDb)} callback
 */
ydn.db.adapter.IndexedDb.prototype.onReady = function(callback) {
  this.deferredIdxDb_.addCallback(callback);
};


/**
 * Return database object, on if it is ready.
 * @final
 * @return {IDBDatabase} this instance.
 */
ydn.db.adapter.IndexedDb.prototype.getDbInstance = function() {
  // no checking for closing status. caller should know it.
  return this.idx_db_ || null;
};


/**
 * @return {boolean}
 */
ydn.db.adapter.IndexedDb.prototype.isReady = function() {
  return !!this.idx_db_;
};


/**
 *
 * @return {boolean} return indexedDB support on run time.
 */
ydn.db.adapter.IndexedDb.isSupported = function() {
  return !!ydn.db.adapter.IndexedDb.indexedDb;
};


// The fun fact with current Chrome 22 is it defines
// goog.global.webkitIDBTransaction as numeric value, the database engine
// accept only string format.

//ydn.db.TransactionMode = {
//  READ_ONLY: (goog.global.IDBTransaction ||
//      goog.global.webkitIDBTransaction).READ_ONLY || 'readonly',
//  READ_WRITE: (goog.global.IDBTransaction ||
//      goog.global.webkitIDBTransaction).READ_WRITE || 'readwrite',
//  VERSION_CHANGE: (goog.global.IDBTransaction ||
//      goog.global.webkitIDBTransaction).VERSION_CHANGE || 'versionchange'
//};



/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.adapter.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.adapter.IndexedDb');



/**
 * @private
 * @type {IDBDatabase}
 */
ydn.db.adapter.IndexedDb.prototype.idx_db_ = null;


/**
 * @final
 * @protected
 * @param {IDBDatabase} db database instance.
 */
ydn.db.adapter.IndexedDb.prototype.setDb = function (db) {

  this.idx_db_ = db;

  // often web app developer have problem with versioning, in that schema is
  // different but version number is the same. So let us do sanity check
  if (goog.DEBUG) {
    for (var i = 0; i < this.schema.stores.length; i++) {
      var store = this.schema.stores[i];
      goog.asserts.assert(this.hasStore_(store.name), 'store: ' + store.name +
        ' not exist in database but in schema, new version?');
      // more checking in indexes.
    }
    this.deferredIdxDb_.callback(this.idx_db_);
  } else {
    this.deferredIdxDb_.callback(this.idx_db_);
  }
};





/**
 * @protected
 * @return {IDBDatabase}
 */
ydn.db.adapter.IndexedDb.prototype.getIdxDb = function() {
  return this.idx_db_;
};


/**
 * @private
 * @param {IDBDatabase} db DB instance.
 * @param {string} table store name.
 * @return {boolean} true if the store exist.
 */
ydn.db.adapter.IndexedDb.prototype.hasStore_ = function(db, table) {
  if (goog.isDef(db['objectStoreNames'])) {
    return db['objectStoreNames'].contains(table);
  } else {
    // old chrome is not following IndexedDB spec, not likely to encounter
    // throw new ydn.error.InternalError('objectStoreNames not supported');
    return true;
  }
};


/**
 * Migrate from current version to the last version.
 * @protected
 * @param {IDBDatabase} db database instance.
 * @param {boolean=} is_caller_setversion call from set version;.
 */
ydn.db.adapter.IndexedDb.prototype.migrate = function(db, is_caller_setversion) {

  // create store that we don't have previously

  for (var i = 0; i < this.schema.stores.length; i++) {
    var table = this.schema.stores[i];
    this.logger.finest('Creating Object Store for ' + table.name +
      ' keyPath: ' + table.keyPath);

    var store;
    if (this.hasStore_(db, table.name)) {
      // already have the store, just update indexes
      if (is_caller_setversion) {
        // transaction cannot open in version upgrade
        continue;
      }
      if (goog.userAgent.product.CHROME) {
        // as of Chrome 22, transaction cannot open here
        continue;
      }
      var trans = db.transaction([table.name],
        /** @type {number} */ (ydn.db.TransactionMode.READ_WRITE));
      store = trans.objectStore(table.name);
      goog.asserts.assertObject(store, table.name + ' not found.');
      var indexNames = store['indexNames']; // closre externs not yet updated.
      goog.asserts.assertObject(indexNames); // let compiler know there it is.

      var created = 0;
      var deleted = 0;
      for (var j = 0; j < table.indexes.length; j++) {
        var index = table.indexes[j];
        if (!indexNames.contains(index.name)) {
          store.createIndex(index.name, index.name, {unique: index.unique});
          created++;
        }
      }
      for (var j = 0; j < indexNames.length; j++) {
        if (!table.hasIndex(indexNames[j])) {
          store.deleteIndex(indexNames[j]);
          deleted++;
        }
      }

      this.logger.finest('Updated store: ' + store.name + ', ' + created +
        ' index created, ' + deleted + ' index deleted.');
    } else {
      store = db.createObjectStore(table.name,
        {keyPath: table.keyPath, autoIncrement: table.autoIncrement});

      for (var j = 0; j < table.indexes.length; j++) {
        var index = table.indexes[j];
        goog.asserts.assertString(index.name, 'name required.');
        goog.asserts.assertBoolean(index.unique, 'unique required.');
        store.createIndex(index.name, index.name, {unique: index.unique});
      }

      this.logger.finest('Created store: ' + store.name + ' keyPath: ' +
        store.keyPath);
    }

  }

  // TODO: delete unused old stores ?
};



/**
 * When DB is ready, fnc will be call with a fresh transaction object. Fnc must
 * put the result to 'result' field of the transaction object on success. If
 * 'result' field is not set, it is assumed
 * as failed.
 * @protected
 * @param {function(IDBTransaction)|Function} fnc transaction function.
 * @param {!Array.<string>} scopes list of stores involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode.
 * @param {function(ydn.db.TransactionEventTypes, *)=} completed_event_handler
 */
ydn.db.adapter.IndexedDb.prototype.doTransaction = function (fnc, scopes, mode, completed_event_handler) {

  /**
   * @private
   * @type {!IDBTransaction}
   */
  var tx = this.idx_db_.transaction(scopes, /** @type {number} */ (mode));

  tx.oncomplete = function (event) {
    completed_event_handler(ydn.db.TransactionEventTypes.COMPLETE, event);
  };

  tx.onerror = function (event) {
    completed_event_handler(ydn.db.TransactionEventTypes.ERROR, event);
  };

  tx.onabort = function (event) {
    completed_event_handler(ydn.db.TransactionEventTypes.ABORT, event);
  };

  fnc(tx);

};



/**
 * Close the connection.
 * @final
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.adapter.IndexedDb.prototype.close = function() {

  var df = new goog.async.Deferred();

  this.idx_db_.close(); // return void.

  return df;
};



