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
  var self = this;
  this.dbname = dbname;

  /**
   * @protected
   * @final
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = schema;

  // Currently in unstable stage, opening indexedDB has two incompatible call.
  // version could be number of string.
  // In chrome, version is taken as description.
  var msg = 'Trying to open database:' + this.dbname + ' ver: ' + this.schema.version;
  self.logger.finer(msg);
  if (ydn.db.IndexedDb.DEBUG) {
    window.console.log(msg)
  }

  /**
   * This open request return two format.
   * @type {IDBOpenDBRequest|IDBRequest}
   */
  var openRequest = ydn.db.IndexedDb.indexedDb.open(this.dbname,
    /** @type {string} */ (this.schema.version)); // for old externs

  openRequest.onsuccess = function(ev) {
    var msg = self.dbname + ' ver: ' + self.schema.version + ' OK.';
    self.logger.finer(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg);
    }
    var db = ev.target.result;
    var old_version = db.version;
    if (goog.isDef(self.schema.version) &&
      self.schema.version > old_version) { // for chrome
      msg = 'initializing database from ' + db.version + ' to ' +
        self.schema.version;
      self.logger.finer(msg);
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(msg)
      }

      var setVrequest = db.setVersion(self.schema.version); // for chrome

      setVrequest.onfailure = function(e) {
        self.logger.warning('migrating from ' + db.version + ' to ' +
          self.schema.version + ' failed.');
        self.setDb(null);
      };
      setVrequest.onsuccess = function(e) {
        self.migrate(db);
        self.logger.finer('Migrated to version ' + db.version + '.');
        var reOpenRequest = ydn.db.IndexedDb.indexedDb.open(self.dbname);
        // have to reopen for new schema
        reOpenRequest.onsuccess = function(rev) {
          db = ev.target.result;
          self.logger.finer('version ' + db.version + ' ready.');
          self.setDb(db);
        };
      };
    } else {
      msg = 'database version ' + db.version + 'ready to go';
      self.logger.finer(msg);
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(msg);
      }
      self.setDb(db);
    }
  };

  openRequest.onupgradeneeded = function(ev) {
    var db = ev.target.result;
    var msg = 'upgrading version ' + db.version;
    self.logger.finer(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg);
    }

    self.migrate(db);

    var reOpenRequest = ydn.db.IndexedDb.indexedDb.open(self.dbname);
    reOpenRequest.onsuccess = function(rev) {
      db = ev.target.result;
      self.logger.finer('Database: ' + self.dbname + ' upgraded.');
      self.setDb(db);
    };
  };

  openRequest.onerror = function(ev) {
    var msg = 'opening database ' + dbname + ' failed.';
    self.logger.severe(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg)
    }
    self.db = null;
  };

  openRequest.onblocked = function(ev) {
    var msg = 'database ' + dbname + ' block, close other connections.';
    self.logger.severe(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg)
    }
    self.db = null;
  };

  openRequest.onversionchange = function(ev) {
    var msg = 'Version change request, so closing the database';
    self.logger.fine(msg);
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log(msg);
    }
    if (self.db) {
      self.db.close();
    }
  }
};


/**
 *
 * @define {boolean} trun on debug flag to dump object.
 */
ydn.db.IndexedDb.DEBUG = false;


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
 */
ydn.db.IndexedDb.prototype.migrate = function(db) {

  // create store that we don't have previously

  for (var table, i = 0; table = this.schema.stores[i]; i++) {
    this.logger.finest('Creating Object Store for ' + table.name +
      ' keyPath: ' + table.keyPath);

    if (this.hasStore_(db, table.name)) {
      continue; // already have the store. TODO: update indexes
    }

    var store = db.createObjectStore(table.name,
        {keyPath: table.keyPath, autoIncrement: table.autoIncrement});

    for (var j = 0; j < table.indexes.length; j++) {
      var index = table.indexes[j];
      goog.asserts.assertString(index.name, 'name required.');
      goog.asserts.assertBoolean(index.unique, 'unique required.');
      store.createIndex(index.name, index.name, {unique:index.unique});
    }

    this.logger.finest('Created store: ' + store.name + ' keyPath: ' +
        store.keyPath);

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
      this.doTransaction(task.fnc, task.scopes, task.mode, task.d);
    }
  }
};


/**
 * When DB is ready, fnc will be call with a fresh transaction object. Fnc must
 * put the result to 'result' field of the transaction object on success. If
 * 'result' field is not set, it is assumed
 * as failed.
 * @protected
 * @param {Function} fnc transaction function.
 * @param {!Array.<string>} scopes list of stores involved in the
 * transaction.
 * @param {number|string} mode mode.
 * @param {goog.async.Deferred=} opt_df output deferred function to be used.
 * @return {!goog.async.Deferred} d result in deferred function.
 */
ydn.db.IndexedDb.prototype.doTransaction = function(fnc, scopes, mode, opt_df)
{
  var me = this;
  opt_df = opt_df || new goog.async.Deferred();

  if (this.is_ready) {
    this.is_ready = false;

    /**
     * @protected
     * @type {IDBTransaction}
     */
    var tx = this.db_.transaction(scopes, /** @type {number} */ (mode));
    goog.events.listen(/** @type {EventTarget} */ (tx),
      [ydn.db.IndexedDb.EventTypes.COMPLETE,
        ydn.db.IndexedDb.EventTypes.ABORT, ydn.db.IndexedDb.EventTypes.ERROR],
      function(event) {

        if (goog.isDef(tx.is_success)) {
          opt_df.callback(tx.result);
        } else {
          opt_df.errback(tx.error);
        }

        goog.Timer.callOnce(function() {
          me.is_ready = true;
          me.runTxQueue();
        });
      });

    fnc(tx);

  } else {

    if (!this.txQueue) {
      /**
       * Transaction queue
       * @type {Array.<{fnc: Function, scopes: Array.<string>,
       * mode: IDBTransaction, d: goog.async.Deferred}>}
       */
      this.txQueue = [];
    }

    this.txQueue.push({fnc: fnc, scopes: scopes, mode: mode, d: opt_df});
  }
  return opt_df;
};


/**
 *
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
 * @param {string} table table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.IndexedDb.prototype.put = function(table, value) {
  var me = this;

  if (!this.schema.hasStore(table)) {
    throw Error(table + ' not exist in ' + this.dbname);
  }

  return this.doTransaction(function(tx) {
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

  return this.doTransaction(function(tx) {
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


/**
 * Retrieve an object from store.
 * @param {ydn.db.Key} key
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.IndexedDb.prototype.getByKey = function(key) {

  if (!this.schema.hasStore(key.store_name)) {
    throw Error('Store: ' + key.store_name + ' not exist.');
  }

  var me = this;

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(key.store_name);
    var request = store.get(key.id);

    request.onsuccess = function(event) {
      tx.is_success = true;
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      // how to return empty result
      tx.result = event.target.result;
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      me.logger.warning('Error retrieving ' + key.id + ' in ' + key.store_name);
    };

  }, [key.store_name], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};


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
  } else if (arg1 instanceof ydn.db.Key) {
    return this.getByKey(arg1);
  } else if (!goog.isDef(key)) {
    goog.asserts.assertString(arg1); // store name
    return this.getAll_(arg1);
  } else {
    return this.getByKey(new ydn.db.Key(arg1, key));
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
  var store = this.schema.getStore(q.store);
  var is_reduce = goog.isFunction(q.reduce);

  //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column +
  // ' in ' + table);
  var obj_store = tx.objectStore(store.name);
  var index = obj_store.index(q.index);

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
    request = index.openCursor();
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

        if (goog.isFunction(q.map)) {
          value = q.map(value);
        }

        if (is_reduce) {
          tx.result = q.reduce(tx.result, value, idx);
        } else {
          tx.result.push(value);
        }
      }

      if (to_continue && (!goog.isDef(limit) || idx < limit)) {
        //cursor.continue();
        cursor['continue'](); // Note: Must be quoted to avoid parse error.
      } else if (df) {
        df.callback(tx.result);
      }
    } else {
      me.logger.warning('no cursor');
      df.callback(undefined);
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
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.fetch = function(q, limit, offset) {
  var self = this;
  var df = new goog.async.Deferred();

  this.doTransaction(function(tx) {
    self.executeFetch_(tx, df, q, limit, offset);
  }, [q.store], ydn.db.IndexedDb.TransactionMode.READ_ONLY, df);

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

  return this.doTransaction(function(tx) {
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

  return this.doTransaction(function(tx) {
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

  if (!goog.isDef(opt_table)) {
    return this.clearAll_();
  }

  var self = this;

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(opt_table);
    var request;
    if (goog.isDef(opt_key)) {
      request = store['delete'](opt_key);
    } else {
      request = store.clear();
    }
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
  }, [opt_table], ydn.db.IndexedDb.TransactionMode.READ_WRITE);

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
      return this.clearAll_();
    }
  }
};


/**
 *
 * @return {!goog.async.Deferred} clear all stores.
 * @private
 */
ydn.db.IndexedDb.prototype.clearAll_ = function() {
  var dfs = [];
  for (var i = 0; i < this.schema.stores.length; i++) {
    dfs.push(this.clear(this.schema.stores[i].name));
  }
  return ydn.async.reduceAllTrue(new goog.async.DeferredList(dfs));
};




/**
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.count = function(table) {

  var self = this;

  return this.doTransaction(function(tx) {
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

  return this.doTransaction(function(tx) {
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
 * inheritDoc
 */
ydn.db.IndexedDb.prototype.getInTransaction = function(tx, store_name, id) {
  var me = this;
  var df = new goog.async.Deferred();

  var store = tx.objectStore(store_name);
  var request = store.get(id);

  request.onsuccess = function(event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    // how to return empty result
    df.callback(event.target.result);
  };

  request.onerror = function(event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    me.logger.warning('Error retrieving ' + id + ' in ' + store_name + ' ' +
      event.message);
    tx.abort();
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
 * @param {string} opt_table store name.
 * @param {string|number} opt_key object key.
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.clearInTransaction = function(tx, opt_table, opt_key) {

  var df = new goog.async.Deferred();

  var store = tx.objectStore(opt_table);
  var request;
  if (goog.isDef(opt_key)) {
    request = store['delete'](opt_key);
  } else {
    request = store.clear();
  }
  request.onsuccess = function(event) {
    tx.is_success = true;
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([tx, opt_table, opt_key, event]);
    }
    df.callback(true)
  };
  request.onerror = function(event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([tx, opt_table, opt_key, event]);
    }
    df.errback(event);
  };

  return df;
};


/**
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.putInTransaction = function(tx, store_name, value) {

  var df = new goog.async.Deferred();

  delete tx.result;
  delete tx.is_success;
  this.executePut_(/** @type {IDBTransaction} */ (tx), df, store_name, value);

  return df;
};


/**
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.fetchInTransaction = function(tx, q, limit, offset) {

  var df = new goog.async.Deferred();

  delete tx.result;
  delete tx.is_success;
  this.executeFetch_(/** @type {IDBTransaction} */ (tx), df, q, limit, offset);

  return df;
};


/**
 *
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.runInTransaction = function(trFn, scopes, mode, keys) {

  var df = new goog.async.Deferred();

  this.doTransaction(function(tx) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([tx, trFn, scopes, mode, keys]);
    }

    for (var key, i = 0; key = keys[i]; i++) {
      key.setTx(tx); // inject transaction object.
    }

    // now execute transaction process
    trFn(tx);

  }, scopes, mode, df);

  df.addBoth(function() {
    // clean up tx.
    for (var key, i = 0; key = keys[i]; i++) {
      key.setTx(null);
    }
  });

  return df;
};