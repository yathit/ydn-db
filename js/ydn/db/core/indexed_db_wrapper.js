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

goog.provide('ydn.db.IndexedDbWrapper');
goog.require('goog.Timer');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Error');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db');
goog.require('ydn.db.DatabaseSchema');
goog.require('ydn.db.CoreService');
goog.require('ydn.json');


/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @implements {ydn.db.CoreService}
 * @constructor
 */
ydn.db.IndexedDbWrapper = function(dbname, schema) {
  var me = this;
  this.dbname = dbname;

  /**
   * @protected
   * @final
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = schema;

  /**
   * Transaction queue
   * @type {!Array.<{fnc: Function, scopes: Array.<string>,
   * mode: ydn.db.TransactionMode}>}
   */
  this.txQueue = [];

  this.in_tx_ = false;

  // Currently in unstable stage, opening indexedDB has two incompatible call.
  // version could be number of string.
  // In chrome, version is taken as description.
  var msg = 'Trying to open database: ' + this.dbname + ' ver: ' +
    this.schema.version;
  me.logger.finer(msg);
  if (ydn.db.IndexedDbWrapper.DEBUG) {
    window.console.log(msg);
  }

  /**
   * This open request return two format.
   * @type {IDBOpenDBRequest|IDBRequest}
   */
  var openRequest = ydn.db.IndexedDbWrapper.indexedDb.open(this.dbname,
    // old externs uncorrected defined as string
    /** @type {string} */ (this.schema.version));
  if (ydn.db.IndexedDbWrapper.DEBUG) {
    window.console.log(openRequest);
  }

  openRequest.onsuccess = function(ev) {
    var msg = me.dbname + ' ver: ' + me.schema.version + ' OK.';
    me.logger.finer(msg);
    if (ydn.db.IndexedDbWrapper.DEBUG) {
      window.console.log(msg);
    }
    var db = ev.target.result;
    var old_version = db.version;
    if (goog.isDef(me.schema.version) &&
      me.schema.version > old_version) { // for chrome
      msg = 'initializing database from ' + db.version + ' to ' +
        me.schema.version;
      me.logger.finer(msg);
      if (ydn.db.IndexedDbWrapper.DEBUG) {
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
        var reOpenRequest = ydn.db.IndexedDbWrapper.indexedDb.open(me.dbname);
        // have to reopen for new schema
        reOpenRequest.onsuccess = function(rev) {
          db = ev.target.result;
          me.logger.finer('version ' + db.version + ' ready.');
          me.setDb(db);
        };
      };
    } else {
      msg = 'database version ' + db.version + 'ready to go';
      if (ydn.db.IndexedDbWrapper.DEBUG) {
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
    if (ydn.db.IndexedDbWrapper.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.finer(msg);
    }

    me.migrate(db);

    var reOpenRequest = ydn.db.IndexedDbWrapper.indexedDb.open(me.dbname);
    reOpenRequest.onsuccess = function(rev) {
      db = ev.target.result;
      me.logger.finer('Database: ' + me.dbname + ' upgraded.');
      me.setDb(db);
    };
  };

  openRequest.onerror = function(ev) {
    var msg = 'opening database ' + dbname + ' failed.';
    if (ydn.db.IndexedDbWrapper.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.severe(msg);
    }
    me.db = null;
  };

  openRequest.onblocked = function(ev) {
    var msg = 'database ' + dbname + ' block, close other connections.';
    if (ydn.db.IndexedDbWrapper.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.severe(msg);
    }
    me.db = null;
  };

  openRequest.onversionchange = function(ev) {
    var msg = 'Version change request, so closing the database';
    if (ydn.db.IndexedDbWrapper.DEBUG) {
      window.console.log(msg);
    } else {
      me.logger.fine(msg);
    }
    if (me.db) {
      me.db.close();
    }
  };

  // extra checking whether, database is OK
  if (goog.DEBUG || ydn.db.IndexedDbWrapper.DEBUG) {
    goog.Timer.callOnce(function() {
      if (openRequest.readyState != 'done') {
        // what we observed is chrome attached error object to openRequest
        // but did not call any of over listening events.
        var msg = 'Database timeout ' + ydn.db.IndexedDbWrapper.timeOut +
          ' reached. Database state is ' + openRequest.readyState;
        me.logger.severe(msg);
        if (ydn.db.IndexedDbWrapper.DEBUG) {
          window.console.log(openRequest);
        }
        me.abortTxQueue_(new Error(msg));
        goog.Timer.callOnce(function() {
          // we invoke error in later thread, so that task queue have
          // enough window time to clean up.
          throw Error(openRequest['error'] || msg);
        }, 500);
      }
    }, ydn.db.IndexedDbWrapper.timeOut, this);
  }

};


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.IndexedDbWrapper.DEBUG = goog.DEBUG && false;


/**
 * @const
 * @type {number}
 */
ydn.db.IndexedDbWrapper.timeOut = goog.DEBUG || ydn.db.IndexedDbWrapper.DEBUG ?
  500 : 3000;



/**
 * @const
 * @type {IDBFactory} IndexedDb.
 */
ydn.db.IndexedDbWrapper.indexedDb = goog.global.indexedDB ||
  goog.global.mozIndexedDB || goog.global.webkitIndexedDB ||
  goog.global.moz_indexedDB ||
  goog.global['msIndexedDB'];


/**
 * @const
 * @type {string}
 */
ydn.db.IndexedDbWrapper.TYPE = 'indexeddb';


/**
 * @return {string} storage mechanism type.
 */
ydn.db.IndexedDbWrapper.prototype.type = function() {
  return ydn.db.IndexedDbWrapper.TYPE;
};


/**
 * @final
 * @return {IDBDatabase} this instance.
 */
ydn.db.IndexedDbWrapper.prototype.getDbInstance = function() {
  return this.db_ || null;
};


/**
 *
 * @return {boolean} return indexedDB support on run time.
 */
ydn.db.IndexedDbWrapper.isSupported = function() {
  return !!ydn.db.IndexedDbWrapper.indexedDb;
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
ydn.db.IndexedDbWrapper.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.IndexedDbWrapper');


/**
 * @final
 * @protected
 * @param {IDBDatabase} db database instance.
 */
ydn.db.IndexedDbWrapper.prototype.setDb = function(db) {

  this.logger.finest('Setting DB: ' + db.name + ' ver: ' + db.version);
  /**
   * @final
   * @private
   * @type {IDBDatabase}
   */
  this.db_ = db;

  if (this.txQueue) {
    this.runTxQueue_();
  }

};


/**
 * @protected
 * @param {IDBDatabase} db DB instance.
 * @param {string} table store name.
 * @return {boolean} true if the store exist.
 */
ydn.db.IndexedDbWrapper.prototype.hasStore_ = function(db, table) {
  if (goog.isDef(db['objectStoreNames'])) {
    return db['objectStoreNames'].contains(table);
  } else {
    return false; // TODO:
  }
};


/**
 * Migrate from current version to the last version.
 * @protected
 * @param {IDBDatabase} db database instance.
 * @param {boolean=} is_caller_setversion call from set version;.
 */
ydn.db.IndexedDbWrapper.prototype.migrate = function(db, is_caller_setversion) {

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
 * Run the first transaction task in the queue. DB must be ready to do the
 * transaction.
 * @private
 */
ydn.db.IndexedDbWrapper.prototype.runTxQueue_ = function() {

  goog.asserts.assertObject(this.db_);

  var task = this.txQueue.shift();
  if (task) {
    this.doTransaction(task.fnc, task.scopes, task.mode);
  }
};


/**
 * Abort the queuing tasks.
 * @private
 * @param e
 */
ydn.db.IndexedDbWrapper.prototype.abortTxQueue_ = function(e) {
  if (this.txQueue) {
    var task = this.txQueue.shift();
    while (task) {
      task = this.txQueue.shift();
      task.fnc(null); // TODO: any better way ?
      // fake transaction object possible. calling tx.objectStore return
      // request and call error on all requests.
    }
  }
};


/**
 * Flag to indicate in transaction.
 * @type {boolean}
 * @private
 */
ydn.db.IndexedDbWrapper.prototype.in_tx_ = false;



/**
 * When DB is ready, fnc will be call with a fresh transaction object. Fnc must
 * put the result to 'result' field of the transaction object on success. If
 * 'result' field is not set, it is assumed
 * as failed.
 * @protected
 * @param {function(IDBTransaction)} fnc transaction function.
 * @param {!Array.<string>} scopes list of stores involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode.
 */
ydn.db.IndexedDbWrapper.prototype.doTransaction = function(fnc, scopes, mode)
{
  //console.log('doTransaction_ ' + JSON.stringify(scopes) + ' ' + mode);
  var me = this;

  /**
   * This is a start of critical section on transaction.
   * If db_ is not defined, database is not ready.
   * 
   * 
   *
   * After transaction is over after receiving three possible (COMPLETE, ABORT
   * or ERROR) events, we set tx_ to null and start next transaction in the
   * queue.
   */
  if (this.db_ && !this.in_tx_) {

    /**
     * Existence of transaction object indicate that this database is in
     * transaction. This must be set to null on finished and before
     * put the result to deferred object.
     * @private
     * @type {!IDBTransaction}
     */
    var tx = this.db_.transaction(scopes, /** @type {number} */ (mode));

    this.in_tx_ = true;

    tx.oncomplete = function(event) {
      // window.console.log(['oncomplete', event, tx, me.mu_tx_]);
      me.in_tx_ = false;
      me.runTxQueue_();
    };

    tx.onerror = function(event) {
      me.in_tx_ = false;
      me.runTxQueue_();
    };

    tx.onabort = function(event) {
      me.in_tx_ = false;
      me.runTxQueue_();
    };

    fnc(tx);

  } else {
    this.txQueue.push({fnc: fnc, scopes: scopes, mode: mode});
  }
};



/**
 * Close the connection.
 * @final
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.IndexedDbWrapper.prototype.close = function() {

  var df = new goog.async.Deferred();
  var request = this.db_.close();

  request.onsuccess = function(event) {
    if (ydn.db.IndexedDbWrapper.DEBUG) {
      window.console.log(event);
    }
    df.callback(true);
  };
  request.onerror = function(event) {
    if (ydn.db.IndexedDbWrapper.DEBUG) {
      window.console.log(event);
    }
    df.errback(event);
  };

  return df;
};



