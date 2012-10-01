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
 * @param {ydn.db.DatabaseSchema=} schema table schema contain table
 * name and keyPath.
 * @implements {ydn.db.adapter.IDatabase}
 * @constructor
 */
ydn.db.adapter.IndexedDb = function(dbname, schema) {
  var me = this;
  this.dbname = dbname;

  this.idx_db_ = null;

  this.deferredIdxDb_ = new goog.async.Deferred();

  // Currently in unstable stage, opening indexedDB has two incompatible call.
  // version could be number of string.
  // In chrome, version is taken as description.
  var msg = 'Trying to open database: ' + this.dbname + ' ver: ' +
    schema.version;
  me.logger.finer(msg);
  if (ydn.db.adapter.IndexedDb.DEBUG) {
    window.console.log(msg);
  }

  /**
   * This open request return two format.
   * @type {IDBOpenDBRequest|IDBRequest}
   */
  var openRequest;
  if (goog.isDef(schema.version)) {
    openRequest = ydn.db.adapter.IndexedDb.indexedDb.open(this.dbname,
      // old externs uncorrected defined as string
      /** @type {string} */ (schema.version));
  } else {
    openRequest = ydn.db.adapter.IndexedDb.indexedDb.open(this.dbname);
  }

  if (ydn.db.adapter.IndexedDb.DEBUG) {
    window.console.log(openRequest);
  }

  openRequest.onsuccess = function(ev) {
    var msg = me.dbname + ' ver: ' + schema.version + ' OK.';
    me.logger.finer(msg);
    if (ydn.db.adapter.IndexedDb.DEBUG) {
      window.console.log(msg);
    }
    var db = ev.target.result;
    var old_version = db.version;
    if (goog.isDef(schema.version) &&
      schema.version > old_version) { // for chrome

      var setVrequest = db.setVersion(schema.version); // for chrome

      setVrequest.onfailure = function(e) {
        me.logger.warning('migrating from ' + db.version + ' to ' +
          schema.version + ' failed.');
        me.setDb(null);
      };
      setVrequest.onsuccess = function(e) {
        me.doVersionChange(db, setVrequest['transaction'], schema, true);
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

    me.doVersionChange(db, openRequest['transaction'], schema);

  };

  openRequest.onerror = function(ev) {
    var msg = 'opening database ' + dbname + ':' + schema.version + ' failed.';
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
 * @param {IDBTransaction} trans
 */
ydn.db.adapter.IndexedDb.prototype.setDb = function (db, trans) {

  this.idx_db_ = db;
  if (this.deferredIdxDb_.hasFired()) {
    // require for version change
    this.deferredIdxDb_ = new goog.async.Deferred();
  }

  this.deferredIdxDb_.callback(this.idx_db_);

};


/**
 * @private
 * @param {IDBDatabase} db DB instance.
 * @param {string} store_name store name.
 * @return {boolean} true if the store exist.
 */
ydn.db.adapter.IndexedDb.prototype.hasStore_ = function(db, store_name) {
  if ('objectStoreNames' in db) {
    return db['objectStoreNames'].contains(store_name);
  } else {
    // old chrome is not following IndexedDB spec, not likely to encounter
    throw new ydn.error.NotSupportedException('Very old IndexedDB API');
    //return true;
  }
};


/**
 * Validate schema. If schema is not set, this will sniff the schema.
 * @protected
 * @param {IDBDatabase} db
 * @param {IDBTransaction} trans
 * @param {DOMStringList} objectStoreNames
 * @param {ydn.db.DatabaseSchema=} schema
 */
ydn.db.adapter.IndexedDb.prototype.setSchema = function(db, trans, objectStoreNames, schema) {

  if (!goog.isDef(schema)) {
    schema = new ydn.db.DatabaseSchema(/** @type {number} */ (db.version));
    for (var i = 0; i < objectStoreNames.length; i++) {
      var objStore = trans.objectStore(objectStoreNames[i]);
      var indexes = [];
      var n = objStore.indexNames.length;
      for (var j = 0; j < n; j++) {
        var index = objStore.index(objStore.indexNames[j]);
        indexes.push(new ydn.db.IndexSchema(index.name, index.unique, undefined, index.keyPath, index.multiEntry));
      }
      var store = new ydn.db.StoreSchema(objStore.name, objStore.keyPath, objStore.autoIncremenent, undefined, indexes);
    }
  } else {
    // validate schema
    if (goog.DEBUG) {
      var storeNames = schema.getStoreNames();
      if (storeNames.length != objectStoreNames.length) {
        var names = goog.array.map(objectStoreNames, function(x) {return x});
        throw new ydn.error.ConstrainError('Different number of object stores in schema and database: ' +
            ydn.json.stringify(storeNames) + ' vs. ' + ydn.json.stringify(names));
      }
      for (var i = 0; i < storeNames.length; i++) {
        if (!objectStoreNames.contains(storeNames[i])) {
          throw new ydn.error.ConstrainError('Require store: ' + storeNames[i] + ' not exist in the database');
        }
        var objStore = trans.objectStore(storeNames[i]);
        var store = schema.getStore(storeNames[i]);
        if (objStore.keyPath !== store.keyPath) {
          throw new ydn.error.ConstrainError('Different keyPath between schema and database: ' +
            store.keyPath + ' vs. ' + objStore.keyPath);
        }
        if (store.autoIncremenent != !!objStore.autoIncremenent) {
          throw new ydn.error.ConstrainError('Different autoIncrement between schema and database: ' +
            store.autoIncremenent + ' vs. ' + objStore.autoIncremenent);
        }

        var indexNames = store.getIndexNames();
        if (indexNames.length != objStore.indexNames.length) {
          throw new ydn.error.ConstrainError('Different number of index in ' +
              storeNames[i] + ' between schema and database: ' +
              ydn.json.stringify(indexNames) + ' vs. ' + ydn.json.stringify(objStore.indexNames));
        }
        for (var j = 0; j < indexNames.length; j++) {
          var objIndex = objStore.index(indexNames[j]);
          var index = store.getIndex(indexNames[j]);
          var msg = ' in index: ' + indexNames[j] + ' of store: ' + storeNames[i] + ' between schema and database: ' ;
          if (objIndex.keyPath !== index.keyPath) {
            throw new ydn.error.ConstrainError('Different keyPath ' +
                msg + index.keyPath + ' vs. ' + objIndex.keyPath);
          }
          if (objIndex.unique != index.unique) {
            throw new ydn.error.ConstrainError('Different unique value ' +
                msg + index.unique + ' vs. ' + objIndex.unique);
          }
          if (objIndex.multiEntry != index.multiEntry) {
            throw new ydn.error.ConstrainError('Different multiEntry value ' +
                msg + index.multiEntry + ' vs. ' + objIndex.multiEntry);
          }
        }
      }
    }
  }

  goog.asserts.assertInstanceof(schema, ydn.db.DatabaseSchema);
  /**
   * @protected
   * @final
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = schema;
};


/**
 * Migrate from current version to the last version.
 * @protected
 * @param {IDBDatabase} db database instance.
 * @param {IDBTransaction} trans
 * {ydn.db.DatabaseSchema} schema
 * @param {boolean=} is_caller_setversion call from set version;.
 */
ydn.db.adapter.IndexedDb.prototype.doVersionChange = function(db, trans, schema, is_caller_setversion) {

  var me = this;
  var s = is_caller_setversion ? 'changing' : 'upgrading';
  this.logger.finer(s + ' version from ' + db.version + ' to ' +
      schema.version);


  trans.oncomplete = function(e) {

    // by reopening the database, we make sure that we are not in
    // version change state since transaction cannot open during version
    // change state. this is most common mistake on using IndexedDB API.
    // db.close(); // cannot close connection. this cause InvalidStateError
    var reOpenRequest = ydn.db.adapter.IndexedDb.indexedDb.open(me.dbname);
    reOpenRequest.onsuccess = function(rev) {
      var db = rev.target.result;
      me.logger.finer('Database: ' + me.dbname + ' upgraded.');
      me.setDb(db);
    };

    reOpenRequest.onerror = function(e) {
      me.logger.finer('Database: ' + me.dbname + ' upgrade fail.');
      me.setDb(null);
    }
  };

  // create store that we don't have previously
  for (var i = 0; i < schema.stores.length; i++) {
    var table = schema.stores[i];
    this.logger.finest('Creating Object Store for ' + table.name +
      ' keyPath: ' + table.keyPath);

    var store;
    if (this.hasStore_(db, table.name)) {
      // already have the store, just update indexes

      store = trans.objectStore(table.name);
      goog.asserts.assertObject(store, table.name + ' not found.');
      var indexNames = /** @type {DOMStringList} */ (store.indexNames);

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

      // IE10 is picky on optional parameters of keyPath. If it is undefined, it must not be defined.
      var options = {"autoIncremenent": table.autoIncremenent};
      if (goog.isDefAndNotNull(table.keyPath)) {
        options['keyPath'] = table.keyPath;
      }
      try {
        store = db.createObjectStore(table.name, options);
      } catch (e) {
        if (e.name == 'InvalidAccessError') {
          throw new ydn.db.InvalidAccessError('creating store for ' + table.name + ' of keyPath: ' +
              table.keyPath + ' and autoIncrement: ' + table.autoIncremenent);
        } else if (e.name == 'ConstraintError') {
          // store already exist.
          throw new ydn.error.ConstrainError('creating store for ' + table.name);
        } else {
          throw e;
        }
      }

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

  me.setSchema(db, trans, /** @type {DOMStringList} */ (db.objectStoreNames), schema);

  // TODO: delete unused stores ?
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
 * @param {function(ydn.db.TransactionEventTypes, *)} completed_event_handler
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
 */
ydn.db.adapter.IndexedDb.prototype.close = function() {

  this.idx_db_.close(); // IDB return void.

};



