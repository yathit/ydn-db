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

goog.provide('ydn.db.con.IndexedDb');
goog.require('goog.Timer');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Error');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db');
goog.require('ydn.db.DatabaseSchema');
goog.require('ydn.db.con.IDatabase');
goog.require('ydn.json');


/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema
 * @param {string} dbname name of database.
 * @param {ydn.db.DatabaseSchema=} schema table schema contain table
 * name and keyPath.
 * @implements {ydn.db.con.IDatabase}
 * @constructor
 */
ydn.db.con.IndexedDb = function(dbname, schema) {

  /**
   * @type {ydn.db.con.IndexedDb}
   */
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
  if (ydn.db.con.IndexedDb.DEBUG) {
    window.console.log(msg);
  }

  /**
   * This open request return two format.
   * @type {IDBOpenDBRequest|IDBRequest}
   */
  var openRequest;
  if (goog.isDef(schema.version)) {
    openRequest = ydn.db.con.IndexedDb.indexedDb.open(this.dbname,
      // old externs uncorrected defined as string
      /** @type {string} */ (schema.version));
  } else {
    openRequest = ydn.db.con.IndexedDb.indexedDb.open(this.dbname);
  }

  if (ydn.db.con.IndexedDb.DEBUG) {
    window.console.log(openRequest);
  }

  openRequest.onsuccess = function(ev) {
    var msg = me.dbname + ' ver: ' + schema.version + ' OK.';
    me.logger.finer(msg);
    if (ydn.db.con.IndexedDb.DEBUG) {
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
        me.setDb(null, e);
      };
      setVrequest.onsuccess = function(e) {
        me.doVersionChange(db, setVrequest['transaction'], schema, true);
      };
    } else {
      msg = 'database version ' + db.version + 'ready to go';
      if (ydn.db.con.IndexedDb.DEBUG) {
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
    if (ydn.db.con.IndexedDb.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.finer(msg);
    }

    me.doVersionChange(db, openRequest['transaction'], schema);

  };

  openRequest.onerror = function(ev) {
    var msg = 'opening database ' + dbname + ':' + schema.version + ' failed.';
    if (ydn.db.con.IndexedDb.DEBUG) {
      window.console.log([msg, ev, openRequest]);
    } else {
      me.logger.severe(msg);
    }
    me.setDb(null, ev);
  };

  openRequest.onblocked = function(ev) {
    var msg = 'database ' + dbname + ' block, close other connections.';
    if (ydn.db.con.IndexedDb.DEBUG) {
      window.console.log([msg, ev, openRequest]);
    } else {
      me.logger.severe(msg);
    }
    me.setDb(null, ev);
  };

  openRequest.onversionchange = function(ev) {
    var msg = 'Version change request, so closing the database';
    if (ydn.db.con.IndexedDb.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.fine(msg);
    }
    if (me.db) {
      me.db.close();
    }
  };

  // extra checking whether, database is OK
  if (goog.DEBUG || ydn.db.con.IndexedDb.DEBUG) {
    goog.Timer.callOnce(function() {
      if (openRequest.readyState != 'done') {
        // what we observed is chrome attached error object to openRequest
        // but did not call any of over listening events.
        var msg = 'Database state is still ' + openRequest.readyState;
        me.logger.severe(msg);
      }
    }, ydn.db.con.IndexedDb.timeOut, this);
  }

};


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.con.IndexedDb.DEBUG = goog.DEBUG && false;


/**
 * @const
 * @type {number}
 */
ydn.db.con.IndexedDb.timeOut = goog.DEBUG || ydn.db.con.IndexedDb.DEBUG ?
  500 : 3000;



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
 * @type {goog.async.Deferred}
 * @private
 */
ydn.db.con.IndexedDb.prototype.deferredIdxDb_ = null;


/**
 *
 * @param {function(!ydn.db.con.IndexedDb)} callback
 */
ydn.db.con.IndexedDb.prototype.onReady = function(callback, errback) {
  this.deferredIdxDb_.addCallback(callback);
  this.deferredIdxDb_.addErrback(errback);
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
 * @return {boolean}
 */
ydn.db.con.IndexedDb.prototype.isReady = function() {
  return this.deferredIdxDb_.hasFired();
};


/**
 *
 * @return {boolean} return indexedDB support on run time.
 */
ydn.db.con.IndexedDb.isSupported = function() {
  return !!ydn.db.con.IndexedDb.indexedDb;
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
ydn.db.con.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.con.IndexedDb');



/**
 * @private
 * @type {IDBDatabase}
 */
ydn.db.con.IndexedDb.prototype.idx_db_ = null;


/**
 * @final
 * @protected
 * @param {IDBDatabase} db database instance.
 * @param {Error=} e
 */
ydn.db.con.IndexedDb.prototype.setDb = function (db, e) {

  if (this.deferredIdxDb_.hasFired()) {
    this.deferredIdxDb_ = new goog.async.Deferred();
  }
  if (goog.isDef(e)) {
    this.idx_db_ = null;
    this.deferredIdxDb_.errback(e);
  } else {
    this.idx_db_ = db;
    this.deferredIdxDb_.callback(this.idx_db_);
  }


};


/**
 * @private
 * @param {IDBDatabase} db DB instance.
 * @param {string} store_name store name.
 * @return {boolean} true if the store exist.
 */
ydn.db.con.IndexedDb.prototype.hasStore_ = function(db, store_name) {
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
ydn.db.con.IndexedDb.prototype.setSchema = function(db, trans, objectStoreNames, schema) {

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
 *
 * @param {IDBDatabase} db
 * @param {IDBTransaction} trans
 * @param {ydn.db.StoreSchema} store_schema
 * @private
 */
ydn.db.con.IndexedDb.prototype.update_store_ = function(db, trans, store_schema) {
  this.logger.finest('Creating Object Store for ' + store_schema.name +
    ' keyPath: ' + store_schema.keyPath);

  var objectStoreNames = /** @type {DOMStringList} */ (db.objectStoreNames);

  var store;
  if (objectStoreNames.contains(store_schema.name)) {
    // already have the store, just update indexes

    store = trans.objectStore(store_schema.name);
    goog.asserts.assertObject(store, store_schema.name + ' not found.');
    var indexNames = /** @type {DOMStringList} */ (store.indexNames);

    var created = 0;
    var deleted = 0;
    for (var j = 0; j < store_schema.indexes.length; j++) {
      var index = store_schema.indexes[j];
      if (!indexNames.contains(index.name)) {
        store.createIndex(index.name, index.name, {unique: index.unique});
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

    // IE10 is picky on optional parameters of keyPath. If it is undefined, it must not be defined.
    var options = {"autoIncremenent": store_schema.autoIncremenent};
    if (goog.isDefAndNotNull(store_schema.keyPath)) {
      options['keyPath'] = store_schema.keyPath;
    }
    try {
      store = db.createObjectStore(store_schema.name, options);
    } catch (e) {
      if (e.name == 'InvalidAccessError') {
        throw new ydn.db.InvalidAccessError('creating store for ' + store_schema.name + ' of keyPath: ' +
          store_schema.keyPath + ' and autoIncrement: ' + store_schema.autoIncremenent);
      } else if (e.name == 'ConstraintError') {
        // store already exist.
        throw new ydn.error.ConstrainError('creating store for ' + store_schema.name);
      } else {
        throw e;
      }
    }

    for (var j = 0; j < store_schema.indexes.length; j++) {
      var index = store_schema.indexes[j];
      goog.asserts.assertString(index.name, 'name required.');
      goog.asserts.assertBoolean(index.unique, 'unique required.');
      store.createIndex(index.name, index.name, {unique: index.unique});
    }

    this.logger.finest('Created store: ' + store.name + ' keyPath: ' +
      store.keyPath);
  }
};


/**
 * Migrate from current version to the last version.
 * @protected
 * @param {IDBDatabase} db database instance.
 * @param {IDBTransaction} trans
 * {ydn.db.DatabaseSchema} schema
 * @param {boolean=} is_caller_setversion call from set version;.
 */
ydn.db.con.IndexedDb.prototype.doVersionChange = function(db, trans, schema, is_caller_setversion) {

  var me = this;
  var s = is_caller_setversion ? 'changing' : 'upgrading';
  this.logger.finer(s + ' version from ' + db.version + ' to ' +
      schema.version);

  trans.oncomplete = function(e) {

    // by reopening the database, we make sure that we are not in
    // version change state since transaction cannot open during version
    // change state. this is most common mistake on using IndexedDB API.
    // db.close(); // cannot close connection. this cause InvalidStateError
    var reOpenRequest = ydn.db.con.IndexedDb.indexedDb.open(me.dbname);
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
    // this is sync process.
    this.update_store_(db, trans, schema.stores[i]);
  }

  var storeNames = /** @type {DOMStringList} */ (db.objectStoreNames);
  this.setSchema(db, trans, storeNames, schema);

  // TODO: delete unused stores ?
};


/**
 * @inheritDoc
 */
ydn.db.con.IndexedDb.prototype.addStoreSchema = function(tx, store_schema) {
  this.update_store_(this.idx_db_, /** @type {IDBTransaction} */ (tx), store_schema);
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
ydn.db.con.IndexedDb.prototype.doTransaction = function (fnc, scopes, mode, completed_event_handler) {

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
ydn.db.con.IndexedDb.prototype.close = function() {

  this.idx_db_.close(); // IDB return void.

};



