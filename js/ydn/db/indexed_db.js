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
goog.require('ydn.db.Db');
goog.require('ydn.db.Query');
goog.require('ydn.json');


/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema defination
 * @implements {ydn.db.Db}
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
  self.logger.finer('Trying to open ' + this.dbname + ' ' +
    this.schema.version);
  var openRequest = ydn.db.IndexedDb.indexedDb.open(this.dbname,
    /** @type {string} */ (this.schema.version)); // for old externs

  openRequest.onsuccess = function(ev) {
    self.logger.finer(self.dbname + ' ' + self.schema.version + ' OK.');
    var db = ev.target.result;
    var old_version = db.version;
    if (goog.isFunction(db.setVersion) && goog.isDef(self.schema.version) &&
      self.schema.version > old_version) { // for chrome
      self.logger.finer('initializing database from ' + db.version + ' to ' +
        self.schema.version);

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
      self.logger.finer('database version ' + db.version + 'ready to go');
      self.setDb(db);
    }
  };

  openRequest.onupgradeneeded = function(ev) {
    var db = ev.target.result;
    self.logger.finer('upgrading version ' + db.version);

    var old_version = undefined; // don't know.
    self.migrate(db);

    var reOpenRequest = ydn.db.IndexedDb.indexedDb.open(self.dbname);
    reOpenRequest.onsuccess = function(rev) {
      db = ev.target.result;
      self.logger.finer('Database: ' + self.dbname + ' upgraded.');
      self.setDb(db);
    };
  };

  openRequest.onerror = function(ev) {
    self.logger.severe('opening database ' + dbname + ' failed.');
    self.db = null;
  };

  openRequest.onversionchange = function(ev) {
    self.logger.fine('Version change request, so closing the database');
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
 *
 * @type {function(new:IDBKeyRange)} The IDBKeyRange interface of the IndexedDB
 * API represents a continuous interval over some data type that is used for
 * keys.
 */
ydn.db.IndexedDb.IDBKeyRange = goog.global.IDBKeyRange ||
  goog.global.webkitIDBKeyRange;


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

    for (var i = 0; i < table.indexes.length; i++) {
      var index = table.indexes[i];
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
 * @param {Array.<string>} scopes list of stores involved in the transaction.
 * @param {number|string} mode mode.
 * @param {goog.async.Deferred=} opt_df output deferred function to be used.
 * @return {!goog.async.Deferred} d result in deferred function.
 */
ydn.db.IndexedDb.prototype.doTransaction = function(fnc, scopes, mode, opt_df)
{
  var self = this;
  opt_df = opt_df || new goog.async.Deferred();

  if (this.is_ready) {
    this.is_ready = false;

    /**
     *
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
          self.is_ready = true;
          self.runTxQueue();
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
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.put = function(table, value) {
  var me = this;

  if (!this.schema.hasStore(table)) {
    throw Error(table + ' not exist in ' + this.dbname);
  }

  return this.doTransaction(function(tx) {
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
        };
        request.onerror = function(event) {
          if (ydn.db.IndexedDb.DEBUG) {
            window.console.log(event);
          }
          tx.error = event;
          has_error = true;
          tx.abort();
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
      };
      request.onerror = function(event) {
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log(event);
        }
        tx.error = event;
      };
    }

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

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(table);

    // Get everything in the store;
    var keyRange = ydn.db.IndexedDb.IDBKeyRange.lowerBound(0);
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
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.get = function(table, key) {

  if (!goog.isDef(key)) {
    return this.getAll_(table);
  }

  if (!this.schema.hasStore(table)) {
    throw Error('Store: ' + table + ' not exist.');
  }

  var me = this;

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(table);
    var request = store.get(key);

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
      me.logger.warning('Error retriving ' + key + ' in ' + table);
    };

  }, [table], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};


/**
 * Fetch result of a query
 * @param {!ydn.db.Query} q query.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.IndexedDb.prototype.list = function(q) {
  var self = this;

  var value = q.value;
  var store = this.schema.getStore(q.store);
  var column = q.field || store.keyPath;

  return this.doTransaction(function(tx) {
    //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column +
    // ' in ' + table);
    var obj_store = tx.objectStore(store);
    var index = obj_store.index(column);
    var boundKeyRange;
    var value_upper = '';
    if (q.op == ydn.db.Query.Op.START_WITH) {
      value_upper = value.substring(0, value.length - 1) + String.fromCharCode(
        value.charCodeAt(value.length - 1) + 1);
      boundKeyRange = ydn.db.IndexedDb.IDBKeyRange.bound(value, value_upper,
        false, true);
    } else {
      boundKeyRange = ydn.db.IndexedDb.IDBKeyRange.only(value);
    }
    //console.log('opening ' + q.op + ' cursor ' + value + ' ' + value_upper +
    // ' of ' + column + ' in ' + table);
    var request = index.openCursor(boundKeyRange);

    tx.result = [];

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
        tx.result.push(cursor['value']); // should not necessary if externs are
        // properly updated.

        if (!goog.isDef(q.limit) || tx.result.length < q.limit) {
          //cursor.continue();
          cursor['continue'](); // Note: Must be quoted to avoid parse error.
        }
      }
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.error = event;
    };

  }, [store.name], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

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



/**
 * @inheritDoc
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