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
 * @fileoverview Deferred wrapper for HTML5 IndexedDb.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.IndexedDb');
goog.require('goog.Timer');
goog.require('goog.async.DeferredList');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db.DatabaseSchema');
goog.require('ydn.db.tr.Db');
goog.require('ydn.db.Query');
goog.require('ydn.json');
goog.require('goog.debug.Error');


/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema defination
 * @implements {ydn.db.tr.Db}
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.IndexedDb = function(dbname, schema) {
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
   * @type {Array.<{fnc: Function, scopes: Array.<string>,
   * mode: IDBTransaction, d: goog.async.Deferred}>}
   */
  this.txQueue = [];

  // Currently in unstable stage, opening indexedDB has two incompatible call.
  // version could be number of string.
  // In chrome, version is taken as description.
  var msg = 'Trying to open database: ' + this.dbname + ' ver: ' + this.schema.version;
  me.logger.finer(msg);
  if (ydn.db.IndexedDb.DEBUG) {
    window.console.log(msg)
  }

  /**
   * This open request return two format.
   * @type {IDBOpenDBRequest|IDBRequest}
   */
  var openRequest = ydn.db.IndexedDb.indexedDb.open(this.dbname,
    // old externs uncorrected defined as string
    /** @type {string} */ (this.schema.version));
  if (ydn.db.IndexedDb.DEBUG) {
    window.console.log(openRequest);
  }

  openRequest.onsuccess = function(ev) {
    var msg = me.dbname + ' ver: ' + me.schema.version + ' OK.';
    me.logger.finer(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg);
    }
    var db = ev.target.result;
    var old_version = db.version;
    if (goog.isDef(me.schema.version) &&
      me.schema.version > old_version) { // for chrome
      msg = 'initializing database from ' + db.version + ' to ' +
        me.schema.version;
      me.logger.finer(msg);
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(msg)
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
        var reOpenRequest = ydn.db.IndexedDb.indexedDb.open(me.dbname);
        // have to reopen for new schema
        reOpenRequest.onsuccess = function(rev) {
          db = ev.target.result;
          me.logger.finer('version ' + db.version + ' ready.');
          me.setDb(db);
        };
      };
    } else {
      msg = 'database version ' + db.version + 'ready to go';
      me.logger.finer(msg);
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(msg);
      }
      me.setDb(db);
    }
  };

  openRequest.onupgradeneeded = function(ev) {
    var db = ev.target.result;
    var msg = 'upgrading version ' + db.version;
    me.logger.finer(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg);
    }

    me.migrate(db);

    var reOpenRequest = ydn.db.IndexedDb.indexedDb.open(me.dbname);
    reOpenRequest.onsuccess = function(rev) {
      db = ev.target.result;
      me.logger.finer('Database: ' + me.dbname + ' upgraded.');
      me.setDb(db);
    };
  };

  openRequest.onerror = function(ev) {
    var msg = 'opening database ' + dbname + ' failed.';
    me.logger.severe(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg)
    }
    me.db = null;
  };

  openRequest.onblocked = function(ev) {
    var msg = 'database ' + dbname + ' block, close other connections.';
    me.logger.severe(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg)
    }
    me.db = null;
  };

  openRequest.onversionchange = function(ev) {
    var msg = 'Version change request, so closing the database';
    me.logger.fine(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg);
    }
    if (me.db) {
      me.db.close();
    }
  };

  // extra checking whether, database is OK
  if (goog.DEBUG || ydn.db.IndexedDb.DEBUG) {
    goog.Timer.callOnce(function () {
      if (openRequest.readyState != 'done') {
        // what we observed is chrome attached error object to openRequest
        // but did not call any of over listening events.
        var msg = 'Database timeout ' + ydn.db.IndexedDb.timeOut +
          ' reached. Database state is ' + openRequest.readyState;
        me.logger.severe(msg);
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log(openRequest);
        }
        me.abortTxQueue(new Error(msg));
        goog.Timer.callOnce(function () {
          // we invoke error in later thread, so that task queue have
          // enough window time to clean up.
          throw Error(openRequest.error || msg);
        }, 500);
      }
    }, ydn.db.IndexedDb.timeOut, this);
  }

};


/**
 *
 * @define {boolean} turn on debug flag to dump object.
 */
ydn.db.IndexedDb.DEBUG = false;


/**
 * @const
 * @type {number}
 */
ydn.db.IndexedDb.timeOut =  goog.DEBUG || ydn.db.IndexedDb.DEBUG ? 500 : 3000;




/**
 *
 * @type {IDBFactory} IndexedDb.
 */
ydn.db.IndexedDb.indexedDb = goog.global.indexedDB ||
  goog.global.mozIndexedDB || goog.global.webkitIndexedDB ||
  goog.global.moz_indexedDB ||
  goog.global['msIndexedDB'];


/**
 *
 * @return {boolean} return indexedDB support on run time.
 */
ydn.db.IndexedDb.isSupported = function() {
  return !!ydn.db.IndexedDb.indexedDb;
};


//
/**
 * The three possible transaction modes.
 * @see http://www.w3.org/TR/IndexedDB/#idl-def-IDBTransaction
 * @enum {string|number}
 */
ydn.db.IndexedDb.TransactionMode = {
  READ_ONLY: 'readonly',
  READ_WRITE: 'readwrite',
  VERSION_CHANGE: 'versionchange'
};



// The fun fact with current Chrome 22 is it defines
// goog.global.webkitIDBTransaction as numeric value, the database engine
// accept only string format.

//ydn.db.IndexedDb.TransactionMode = {
//  READ_ONLY: (goog.global.IDBTransaction ||
//      goog.global.webkitIDBTransaction).READ_ONLY || 'readonly',
//  READ_WRITE: (goog.global.IDBTransaction ||
//      goog.global.webkitIDBTransaction).READ_WRITE || 'readwrite',
//  VERSION_CHANGE: (goog.global.IDBTransaction ||
//      goog.global.webkitIDBTransaction).VERSION_CHANGE || 'versionchange'
//};




/**
 * Event types the Transaction can dispatch. COMPLETE events are dispatched
 * when the transaction is committed. If a transaction is aborted it dispatches
 * both an ABORT event and an ERROR event with the ABORT_ERR code. Error events
 * are dispatched on any error.
 *
 * @see {@link goog.db.Transaction.EventTypes}
 *
 * @enum {string}
 */
ydn.db.IndexedDb.EventTypes = {
  COMPLETE: 'complete',
  ABORT: 'abort',
  ERROR: 'error'
};


/**
 * @protected
 * @final
 * @type {goog.debug.Logger} logger.
 */
ydn.db.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.IndexedDb');


/**
 * @protected
 * @param {IDBDatabase} db database instance.
 */
ydn.db.IndexedDb.prototype.setDb = function(db) {

  this.logger.finest('Setting DB: ' + db.name + ' ver: ' + db.version);
  /**
   * @final
   * @private
   * @type {IDBDatabase}
   */
  this.db_ = db;

  this.is_ready = true;
  if (this.txQueue) {
    this.runTxQueue();
  }

};


/**
 *
 * @return {IDBDatabase}
 * @private
 */
ydn.db.IndexedDb.prototype.getDb_ = function() {
  return this.db_;
};


/**
 * @private
 * @param {IDBDatabase} db DB instance.
 * @param {string} table store name.
 * @return {boolean} true if the store exist.
 */
ydn.db.IndexedDb.prototype.hasStore_ = function(db, table) {
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
 * @param {boolean=} is_caller_setversion call from set version;
 */
ydn.db.IndexedDb.prototype.migrate = function(db, is_caller_setversion) {

  // create store that we don't have previously

  for (var table, i = 0; table = this.schema.stores[i]; i++) {
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
        /** @type {number} */ (ydn.db.IndexedDb.TransactionMode.READ_WRITE));
      store = trans.objectStore(table.name);
      goog.asserts.assertObject(store, table.name + ' not found.');
      var indexNames = store['indexNames']; // closre externs not yet updated.
      goog.asserts.assertObject(indexNames); // let compiler know there it is.

      var created = 0;
      var deleted = 0;
      for (var j = 0; j < table.indexes.length; j++) {
        var index = table.indexes[j];
        if (!indexNames.contains(index.name)) {
          store.createIndex(index.name, index.name, {unique:index.unique});
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
        {keyPath:table.keyPath, autoIncrement:table.autoIncrement});

      for (var j = 0; j < table.indexes.length; j++) {
        var index = table.indexes[j];
        goog.asserts.assertString(index.name, 'name required.');
        goog.asserts.assertBoolean(index.unique, 'unique required.');
        store.createIndex(index.name, index.name, {unique:index.unique});
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
 * @protected
 */
ydn.db.IndexedDb.prototype.runTxQueue = function() {

  if (!this.db_) {
    return;
  }

  if (this.txQueue) {
    var task = this.txQueue.shift();
    if (task) {
      this.doTransaction_(task.fnc, task.scopes, task.mode, task.d);
    }
  }
};


/**
 * Abort the queuing tasks.
 * @param e
 */
ydn.db.IndexedDb.prototype.abortTxQueue = function(e) {
  if (this.txQueue) {
    var task = this.txQueue.shift();
    while (task) {
      task.d.errback(e);
      task = this.txQueue.shift();
    }
  }
};


/**
 * When DB is ready, fnc will be call with a fresh transaction object. Fnc must
 * put the result to 'result' field of the transaction object on success. If
 * 'result' field is not set, it is assumed
 * as failed.
 * @private
 * @param {Function} fnc transaction function.
 * @param {!Array.<string>} scopes list of stores involved in the
 * transaction.
 * @param {number|string} mode mode.
 * @param {goog.async.Deferred=} opt_dfr output deferred function to be used.
 * @return {!goog.async.Deferred} d result in deferred function.
 */
ydn.db.IndexedDb.prototype.doTransaction_ = function(fnc, scopes, mode, opt_dfr)
{
  var me = this;
  var df = opt_dfr || new goog.async.Deferred();
  df.addBoth(function() {
    me.tx_ = null;
  });

  if (this.is_ready) {
    this.is_ready = false;

    /**
     * Existence of transaction object indicate that this database is in
     * transaction. This must be set to null on finished.
     * @private
     * @type {IDBTransaction}
     */
    me.tx_ = this.db_.transaction(scopes, /** @type {number} */ (mode));
    goog.events.listen(/** @type {EventTarget} */ (me.tx_),
      [ydn.db.IndexedDb.EventTypes.COMPLETE,
        ydn.db.IndexedDb.EventTypes.ABORT, ydn.db.IndexedDb.EventTypes.ERROR],
      function(event) {

        if (goog.isDef(me.tx_.is_success)) {
          df.callback(me.tx_.result);
        } else {
          df.errback(me.tx_.error);
        }

        goog.Timer.callOnce(function() {
          me.is_ready = true;
          me.runTxQueue();
        });
      });

    fnc(me.tx_);

  } else {
    this.txQueue.push({fnc: fnc, scopes: scopes, mode: mode, d: df});
  }
  return df;
};


/**
 * Execute GET request either storing result to tx or callback to df.
 * @param {IDBTransaction} tx
 * @param {goog.async.Deferred} df
 * @param {string} store_name table name.
 * @param {string|number} id id to get.
 * @private
 */
ydn.db.IndexedDb.prototype.executeGet_ = function(tx, df, store_name, id) {
  var me = this;

  var store = tx.objectStore(store_name);
  var request = store.get(id);

  request.onsuccess = function(event) {
    tx.is_success = true;
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    tx.result = event.target.result;
    if (df) {
      df.callback(event.target.result);
    }
  };


  request.onerror = function(event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    me.logger.warning('Error retrieving ' + id + ' in ' + store_name + ' ' +
        event.message);
    tx.abort();
    if (df) {
      df.errback(event);
    }
  };
};


/**
 * Execute PUT request either storing result to tx or callback to df.
 * @param {IDBTransaction} tx
 * @param {goog.async.Deferred} df
 * @param {string} table table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @private
 */
ydn.db.IndexedDb.prototype.executePut_ = function(tx, df, table, value) {
  var store = tx.objectStore(table);
  var request;

  if (goog.isArray(value)) {
    var has_error = false;
    tx.result = [];
    for (var i = 0; i < value.length && !has_error; i++) {
      request = store.put(value[i]);
      request.onsuccess = function(event) {
        tx.is_success = true;
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log(event);
        }
        tx.result.push(event.target.result);
        var last = i == value.length - 1;
        if (df && last) {
          df.callback(tx.result);
        }
      };
      request.onerror = function(event) {
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log(event);
        }
        tx.error = event;
        has_error = true;
        tx.abort();
        if (df) {
          df.errback(event);
        }
      };

    }
  } else {
    request = store.put(value);
    request.onsuccess = function(event) {
      tx.is_success = true;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result = event.target.result;
      if (df) {
        df.callback(tx.result);
      }
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.error = event;
      if (df) {
        df.errback(event);
      }
    };
  }
};



/**
 * Get object in the store in a transaction. This return requested object
 * immediately.
 *
 * This method must be {@link #runInTransaction}.
 * @param {IDBTransaction|SQLTransaction} tx
 * @param {goog.async.Deferred} df
 * @param {string} opt_store_name store name.
 * @param {(string|number)=} opt_key object key.
 */
ydn.db.IndexedDb.prototype.executeClear_ = function (tx, df, opt_store_name, opt_key) {

  var clearStore = function (df, store_name, opt_key) {
    var store = tx.objectStore(store_name);
    var request;
    if (goog.isDef(opt_key)) {
      request = store['delete'](opt_key);
    } else {
      request = store.clear();
    }
    request.onsuccess = function (event) {
      tx.is_success = true;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log([tx, store_name, opt_key, event]);
      }
      tx.result = event.target.result;
      if (df) {
        df.callback(event.target.result);
      }
    };
    request.onerror = function (event) {
      tx.is_success = false;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log([tx, store_name, opt_key, event]);
      }
      tx.abort();
      if (df) {
        df.errback(event);
      }
    };
  };

  if (goog.isDef(opt_store_name)) {
    clearStore(df, opt_store_name, opt_key);
  } else {
    var dfs = [];
    for (var i = 0; i < this.schema.stores.length; i++) {
      var idf = new goog.async.Deferred();
      dfs[i] = idf;
      clearStore(idf, this.schema.stores[i].name, opt_key);
    }
    if (goog.isDefAndNotNull(df)) {
      var all_df = new goog.async.DeferredList(dfs);
      all_df.chainDeferred(df);
    }
  }
};


/**
 * @param {string} table table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.IndexedDb.prototype.put = function(table, value) {
  var me = this;

  if (!this.schema.hasStore(table)) {
    throw Error(table + ' not exist in ' + this.dbname);
  }

  return this.doTransaction_(function(tx) {
    me.executePut_(tx, null, table, value);

  }, [table], ydn.db.IndexedDb.TransactionMode.READ_WRITE);
};


/**
 * Get all item in the store.
 * @private
 * @param {string} table table name.
 * @return {!goog.async.Deferred} d result in deferred function.
 */
ydn.db.IndexedDb.prototype.getAll_ = function(table) {
  var self = this;

  if (!this.schema.hasStore(table)) {
    throw Error('Store: ' + table + ' not exist.');
  }

  // Workaround for Firefox: for opening version 1, firefox do not raise
  // onupgradeneeded if the database do not exist. writing can start already,
  // but reading is not. Opening a store raise NotFoundError.
//  if (this.db_ && this.db_.objectStoreNames &&
//    goog.isFunction(this.db_.objectStoreNames.contains) &&
//    !this.db_.objectStoreNames.contains(table)) {
//    return goog.async.Deferred.succeed([]);
//  }

  return this.doTransaction_(function(tx) {
    var store = tx.objectStore(table);

    // Get everything in the store;
    var keyRange = ydn.db.Query.IDBKeyRange.lowerBound(0);
    var request = store.openCursor(keyRange);

    request.onsuccess = function(event) {
      tx.is_success = true;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }

      if (!goog.isDef(tx.result)) {
        tx.result = []; // return at least an empty array
      }

      var result = event.target.result;
      if (!!result == false) {
        return;
      }

      if (goog.isDef(result.value)) {
        tx.result.push(result.value);
      }

      result['continue'](); // result.continue();
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
    };

  }, [table], ydn.db.IndexedDb.TransactionMode.READ_ONLY);
};

//
///**
// * Retrieve an object from store.
// * @param {ydn.db.Key} key
// * @return {!goog.async.Deferred} return object in deferred function.
// */
//ydn.db.IndexedDb.prototype.getByKey = function(key) {
//
//  if (!this.schema.hasStore(key.store_name)) {
//    throw Error('Store: ' + key.store_name + ' not exist.');
//  }
//
//  var me = this;
//
//  return this.doTransaction_(function(tx) {
//    var store = tx.objectStore(key.store_name);
//    var request = store.get(key.id);
//
//    request.onsuccess = function(event) {
//      tx.is_success = true;
//      if (ydn.db.IndexedDb.DEBUG) {
//        window.console.log(event);
//      }
//      // how to return empty result
//      tx.result = event.target.result;
//    };
//
//    request.onerror = function(event) {
//      if (ydn.db.IndexedDb.DEBUG) {
//        window.console.log(event);
//      }
//      me.logger.warning('Error retrieving ' + key.id + ' in ' + key.store_name);
//    };
//
//  }, [key.store_name], ydn.db.IndexedDb.TransactionMode.READ_ONLY);
//
//};


/**
 * Return object
 * @param {string|!ydn.db.Query|!ydn.db.Key} arg1 table name.
 * @param {(string|number)=} key object key to be retrieved, if not provided,
 * all entries in the store will return.
 * param {number=} start start number of entry.
 * param {number=} limit maximun number of entries.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.IndexedDb.prototype.get = function(arg1, key) {

  if (arg1 instanceof ydn.db.Query) {
    var df = new goog.async.Deferred();

    var fetch_df = this.fetch(arg1);
    fetch_df.addCallback(function(value) {
      df.callback(goog.isArray(value) ? value[0] : undefined);
    });
    fetch_df.addErrback(function(value) {
      df.errback(value);
    });

    return df;
  } else if (!goog.isDef(key)) {
    goog.asserts.assertString(arg1); // store name
    return this.getAll_(arg1);
  } else  {
    // single key
    var store_name = arg1;
    var id = key;
    if (arg1 instanceof ydn.db.Key) {
      store_name = arg1.store_name;
      id = arg1.id;
    }
    var me = this;
    return this.doTransaction_(function(tx) {
      me.executeGet_(tx, null, store_name, id);
    }, [store_name], ydn.db.IndexedDb.TransactionMode.READ_ONLY);
  }
};



/**
 * @param {IDBTransaction} tx
 * @param {!goog.async.Deferred} df
 * @param {!Array.<!ydn.db.Key>} keys query.
 * @param {number=} limit
 * @param {number=} offset
 * @private
 */
ydn.db.IndexedDb.prototype.executeFetchKeys_ = function(tx, df, keys, limit, offset) {
  var me = this;

  var n = keys.length;
  tx.result = [];
  offset = goog.isDef(offset) ? offset : 0;
  limit = goog.isDef(limit) ? limit : keys.length;
  for (var i = offset; i < limit; i++) {
    var key = keys[i];
    goog.asserts.assert(goog.isDef(key.id) && goog.isString(key.store_name),
        'Invalid key: ' + key);
    var store = tx.objectStore(key.store_name);
    var request = store.get(key.id);

    request.onsuccess = function(event) {
      tx.is_success = true;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result.push(event.target.result);
      if (df && tx.result.length == limit) {
        df.callback(df);
      }
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.is_success = false;
      tx.abort();
      df.errback(event);
    };
  }

};



/**
 * @param {IDBTransaction} tx
 * @param {!goog.async.Deferred} df
 * @param {!ydn.db.Query} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @private
 */
ydn.db.IndexedDb.prototype.executeFetch_ = function(tx, df, q, limit, offset) {
  var me = this;
  var store = this.schema.getStore(q.store_name);
  var is_reduce = goog.isFunction(q.reduce);

  var start = offset || 0;
  var end = goog.isDef(limit) ? start + limit : undefined;

  //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column +
  // ' in ' + table);
  var obj_store = tx.objectStore(store.name);

  var index = goog.isDefAndNotNull(q.index) ?
      obj_store.index(q.index) : null;

  //console.log('opening ' + q.op + ' cursor ' + value + ' ' + value_upper +
  // ' of ' + column + ' in ' + table);
  var request;
  if (goog.isDefAndNotNull(q.keyRange)) {
    if (goog.isDef(q.direction)) {
      var dir = /** @type {number} */ (q.direction); // new standard is string.
      request = index.openCursor(q.keyRange, dir);
    } else {
      request = index.openCursor(q.keyRange);
    }
  } else {
    if (index) {
      request = index.openCursor();
    } else {
      request = obj_store.openCursor();
    }
  }

  tx.is_success = true;
  var idx = -1; // iteration index
  if (!is_reduce) {
    tx.result = [];
  }

  request.onsuccess = function(event) {

    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([q, idx, event]);
    }
    /**
     * @type {IDBCursor}
     */
    var cursor = /** @type {IDBCursor} */ (event.target.result);
    //console.log(cursor);
    if (cursor) {

      var value = /** @type {!Object} */ cursor['value']; // should not necessary if externs are

      var to_continue = !goog.isFunction(q.continue) || q.continue(value);

      // do the filtering if requested.
      if (!goog.isFunction(q.filter) || q.filter(value)) {
        idx++;

        if (idx >= start) {
          if (goog.isFunction(q.map)) {
            value = q.map(value);
          }

          if (is_reduce) {
            tx.result = q.reduce(tx.result, value, idx);
          } else {
            tx.result.push(value);
          }
        }
      }

      if (to_continue && (!goog.isDef(end) || (idx+1) < end)) {
        //cursor.continue();
        cursor['continue'](); // Note: Must be quoted to avoid parse error.
      } else if (df) {
        df.callback(tx.result);
      }
    } else {
      me.logger.warning('no cursor');
      if (df) {
        df.callback(undefined);
      }
    }
  };

  request.onerror = function(event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([q, event]);
    }
    tx.is_success = false;
    tx.error = event;
    if (df) {
      df.errback(event);
    }
  };

};


/**
 * @param {!ydn.db.Query|!Array.<!ydn.db.Key>} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.fetch = function(q, limit, offset) {
  var self = this;
  var df = new goog.async.Deferred();

  if (goog.isArray(q)) { // list of keys
    var stores = [];
    for (var i = 0; i < q.length; i++) {
      /**
       * @type {ydn.db.Key}
       */
      var key = q[i];
      goog.asserts.assertInstanceof(key, ydn.db.Key);
      if (!goog.array.contains(stores, q[i].store_name)) {
        stores.push(q[i].store_name);
      }
    }
    this.doTransaction_(function(tx) {
      self.executeFetchKeys_(tx, null, q, limit, offset);
    }, stores, ydn.db.IndexedDb.TransactionMode.READ_ONLY, df);
  } else {
    this.doTransaction_(function(tx) {
      self.executeFetch_(tx, null, q, limit, offset);
    }, [q.store_name], ydn.db.IndexedDb.TransactionMode.READ_ONLY, df);
  }

  return df;
};


/**
 *
 * @param {string} table store name.
 * @param {string} id key.
 * @return {!goog.async.Deferred} deferred result.
 * @private
 */
ydn.db.IndexedDb.prototype.deleteItem_ = function(table, id) {
  var me = this;

  if (!this.schema.hasStore(table)) {
    throw Error(table + ' not exist in ' + this.dbname);
  }

  return this.doTransaction_(function(tx) {
    var store = tx.objectStore(table);
    var request = store['delete'](id);

    request.onsuccess = function(event) {
      tx.is_success = true;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result = true;
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.error = event;
    };
  }, [table], ydn.db.IndexedDb.TransactionMode.READ_WRITE);
};


/**
 *
 * @param {string} table store name.
 * @return {!goog.async.Deferred} deferred result.
 * @private
 */
ydn.db.IndexedDb.prototype.deleteStore_ = function(table) {
  var me = this;

  if (!this.schema.hasStore(table)) {
    throw Error(table + ' not exist in ' + this.dbname);
  }

  return this.doTransaction_(function(tx) {
    var request = tx.deleteObjectStore(table);

    request.onsuccess = function(event) {
      tx.is_success = true;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result = true;
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.error = event;
    };
  }, [table], ydn.db.IndexedDb.TransactionMode.READ_WRITE);
};


///**
// *
// * @param {IDBTransaction} tx
// * @param {goog.async.Deferred} df
// * @param {string=} opt_table delete the table as provided otherwise
// * delete all stores.
// * @param {string=} opt_key delete a specific row.
// * @private
// */
//ydn.db.IndexedDb.prototype.executeClear_ = function(tx, df, opt_table, opt_key) {
//
//};



/**
 * Remove a specific entry from a store or all.
 * @param {string=} opt_table delete the table as provided otherwise
 * delete all stores.
 * @param {(string|number)=} opt_key delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.IndexedDb.prototype.clear = function(opt_table, opt_key) {

  var store_names = goog.isDefAndNotNull(opt_table) ? [opt_table] :
      this.db_.objectStoreNames || this.schema.getStoreNames();
  var self = this;
  return this.doTransaction_(function(tx) {
    self.executeClear_(tx, null, opt_table, opt_key);
  }, store_names, ydn.db.IndexedDb.TransactionMode.READ_WRITE);

};


/**
 * Delete the database, store or an entry.
 *
 * @param {string=} opt_table delete a specific store.
 * @param {string=} opt_id delete a specific row.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.IndexedDb.prototype.remove = function(opt_table, opt_id) {
  /*
  * Note: I wish this method be named 'delete' but closure compiler complain
  * or sometimes problem with exporting 'delete' as method name.
  */

  if (goog.isDef(opt_table)) {
    if (goog.isDef(opt_id)) {
      return this.deleteItem_(opt_table, opt_id);
    } else {
      return this.deleteStore_(opt_table);
    }
  } else {
    if (goog.isFunction(ydn.db.IndexedDb.indexedDb.deleteDatabase)) {
      var df = new goog.async.Deferred();
      var req = ydn.db.IndexedDb.indexedDb.deleteDatabase(this.dbname);
      req.onsuccess = function(e) {
        df.addCallback(e);
      };
      req.onerror = function(e) {
        df.addErrback(e);
      };
      return df;
    } else {
      return this.clear();
    }
  }
};


/**
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.count = function(table) {

  var self = this;

  return this.doTransaction_(function(tx) {
    var store = tx.objectStore(table);
    var request = store.count();
    request.onsuccess = function(event) {
      tx.is_success = true;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result = event.target.result;
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.error = event;
    };

  }, [table], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};


/**
 * Print out list of key for debug use.
 * @param {string=} opt_table table name.
 * @return {!goog.async.Deferred} return as deferred function.
 */
ydn.db.IndexedDb.prototype.listKeys = function(opt_table) {
  var self = this;

  opt_table = opt_table || ydn.db.Storage.DEFAULT_TEXT_STORE;
  goog.asserts.assertObject(this.schema[opt_table], 'store ' + opt_table +
    ' not exists in ' + this.dbname);
  var column = this.schema[opt_table].keyPath;

  return this.doTransaction_(function(tx) {
    //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column +
    // ' in ' + table);
    var store = tx.objectStore(opt_table);
    var index = store.index(column);
    var boundKeyRange;
    var value_upper = '';

    //console.log('opening ' + q.op + ' cursor ' + value + ' ' + value_upper +
    // ' of ' + column + ' in ' + table);
    var request = index.openCursor();

    request.onsuccess = function(event) {
      tx.is_success = true;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      /**
       * @type {IDBCursor}
       */
      var cursor = /** @type {IDBCursor} */ (event.target.result);
      //console.log(cursor);
      if (cursor) {
        if (!tx.result) {
          tx.result = [];
        }
        tx.result.push(cursor['value'][column]); // should not necessary if
        // externs are properly updated.
        //cursor.continue();
        cursor['continue'](); // Note: Must be quoted to avoid parse error.
      }
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.error = event;
    };

  }, [opt_table], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};


/**
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.close = function () {

  var df = new goog.async.Deferred();
  var request = this.db.close();

  request.onsuccess = function (event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    df.callback(true);
  };
  request.onerror = function (event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    df.errback(event);
  };

  return df;
};




/**
 * Get object in the store in a transaction. This return requested object
 * immediately.
 *
 * This method must be {@link #runInTransaction}.
 * @param {IDBTransaction|SQLTransaction} tx
 * @param {string} store_name store name.
 * @param {string|number} id object key.
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.getInTransaction = function(tx, store_name, id) {
  if (!this.tx_) {
    throw new goog.debug.Error('Not in transaction');
  }
  var df = new goog.async.Deferred();
  this.executeGet_(this.tx_, df, store_name, id);
  return df;
};

/**
 * Get object in the store in a transaction. This return requested object
 * immediately.
 *
 * This method must be {@link #runInTransaction}.
 * @param {IDBTransaction|SQLTransaction} tx
 * @param {string} opt_table store name.
 * @param {string|number} opt_key object key.
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.clearInTransaction = function(tx, opt_table, opt_key) {
  if (!this.tx_) {
    throw new goog.debug.Error('Not in transaction');
  }
  var df = new goog.async.Deferred();
  this.executeClear_(this.tx_, df, opt_table, opt_key);
  return df;
};



/**
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.putInTransaction = function(tx, store_name, value) {
  if (!this.tx_) {
    throw new goog.debug.Error('Not in transaction');
  }
  var df = new goog.async.Deferred();
  this.executePut_(this.tx_, df, store_name, value);
  return df;
};


/**
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.fetchInTransaction = function(tx, q, limit, offset) {
  if (!this.tx_) {
    throw new goog.debug.Error('Not in transaction');
  }
  var df = new goog.async.Deferred();

  this.executeFetch_(this.tx_, df, q, limit, offset);

  return df;
};


/**
 *
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.run = function(trFn, scopes, mode, keys) {

  var df = new goog.async.Deferred();

  this.doTransaction_(function(tx) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([tx, trFn, scopes, mode, keys]);
    }

    // now execute transaction process
    trFn(tx);

  }, scopes, mode, df);


  return df;
};