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
 */

goog.provide('ydn.db.IndexedDb');
goog.require('goog.Timer');
goog.require('goog.async.DeferredList');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db.Db');
goog.require('ydn.db.Query');
goog.require('ydn.json');



/**
 * @see ydn.db.Storage for schema defination
 * @implements {ydn.db.Db}
 * @param {string} dbname
 * @param {Object=} schema table schema contain table name and keyPath.
 * @param {string=} version
 * @constructor
 */
ydn.db.IndexedDb = function(dbname, schema, version) {
  var self = this;
  this.dbname = dbname;
  this.schema = schema || {};
  this.schema[ydn.db.Db.DEFAULT_TEXT_STORE] = {keyPath: 'key'};
  this.version = version || '1';

  var indexedDb = goog.global.indexedDB || goog.global.mozIndexedDB ||
      goog.global.webkitIndexedDB || goog.global.moz_indexedDB;

  self.logger.finer('Trying to open ' + this.dbname + ' ' + this.version);
  var openRequest = indexedDb.open(this.dbname, this.version);

  openRequest.onsuccess = function(ev) {
    self.logger.finer(self.dbname + ' ' + this.version + ' OK.');
    var db = ev.target.result;
    if (self.version != db.version) {
      self.logger.finer('initializing database from ' + db.version + ' to ' + self.version);
      var setVrequest = db.setVersion(self.version); // for chrome

      setVrequest.onfailure = function(e) {
        self.logger.warning('setting up database ' + db.dbname + ' fail.');
        self.setDb(null);
      };
      setVrequest.onsuccess = function(e) {
        self.createObjectStore(db);
        self.logger.finer('changing to version ' + db.version + ' ready.');
        var reOpenRequest = indexedDb.open(self.dbname);
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

    self.createObjectStore(db);

    var reOpenRequest = indexedDb.open(self.dbname);
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
  openRequest.onversionchange = function() {
    self.logger.fine('Version change request, so closing the database');
    if (self.db) {
      self.db.close();
    }
  }
};


/**
 *
 * @return {boolean}
 */
ydn.db.IndexedDb.isSupportedIndexedDb = function() {
  var indexedDb = goog.global.indexedDB || goog.global.mozIndexedDB ||
      goog.global.webkitIndexedDB || goog.global.moz_indexedDB;
  return !!indexedDb;
};


/**
 * The three possible transaction modes.
 * @see http://www.w3.org/TR/IndexedDB/#idl-def-IDBTransaction
 * @enum {string}
 */
ydn.db.IndexedDb.TransactionMode = {
  READ_ONLY: 'readonly',
  READ_WRITE: 'readwrite',
  VERSION_CHANGE: 'versionchange'
};


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

ydn.db.IndexedDb.IDBKeyRange = goog.global.IDBKeyRange || goog.global.webkitIDBKeyRange;


/**
 * @private
 * @final
 * @type {goog.debug.Logger}
 */
ydn.db.IndexedDb.prototype.logger = goog.debug.Logger.getLogger('ydn.db.IndexedDb');


/**
 * @private
 * @param {IDBDatabase} db
 */
ydn.db.IndexedDb.prototype.setDb = function(db) {
  /**
   * @private
   * @type {IDBDatabase}
   */
  this.db = db;

  this.is_ready = true;
  if (this.txQueue) {
    this.runTxQueue();
  }

};


/**
 * @private
 * @param {IDBDatabase} db
 */
ydn.db.IndexedDb.prototype.createObjectStore = function(db) {
  for (var tableName in this.schema) {
    var keyPath = this.schema[tableName]['keyPath'];
    goog.asserts.assertString(keyPath, 'keyPath required in ' + tableName);
    this.logger.finest('Creating Object Store for ' + tableName + ' with keyPath: ' + keyPath);

    /**
     * @preserveTry
     */
    try {
      var store = db.createObjectStore(tableName, {keyPath: keyPath, autoIncrement: false});
      if (this.schema[tableName]['index']) {
        for (var i = 0; i < this.schema[tableName]['index'].length; i++) {
          var index = this.schema[tableName]['index'][i];
          goog.asserts.assertString(index['name'], 'name required.');
          goog.asserts.assertString(index['field'], 'field required.');
          goog.asserts.assertBoolean(index['unique'], 'unique required.');
          store.createIndex(index['name'], index['field'], { unique: index['unique'] });
        }
      }
      //store.createIndex(keyPath, keyPath, { unique: true });
    } catch (e) { // e if e instanceof IDBDatabaseException
      // in Firefox, exception raise if the database already exist.
      this.logger.warning(e.message);
    }
  }
};


/**
 *
 * @define {boolean}
 */
ydn.db.IndexedDb.DEBUG = false;


/**
 * Run the first transaction task in the queue. DB must be ready to do the transaction.
 * @private
 */
ydn.db.IndexedDb.prototype.runTxQueue = function() {

  if (!this.db) {
    return;
  }

  var task = this.txQueue.shift();
  if (task) {
    this.doTransaction(task.fnc, task.scopes, task.mode, task.d);
  }
};


/**
 * When DB is ready, fnc will be call with a fresh transaction object. Fnc must put the result to
 * 'result' field of the transaction object on success. If 'result' field is not set, it is assumed
 * as failed.
 * @private
 * @param {Function} fnc
 * @param {Array.<string>} scopes
 * @param {number|string} mode
 * @param {goog.async.Deferred=} d
 * @return {!goog.async.Deferred} d.
 */
ydn.db.IndexedDb.prototype.doTransaction = function(fnc, scopes, mode, d) {
  var self = this;
  d = d || new goog.async.Deferred();

  if (this.is_ready) {
    this.is_ready = false;

    /**
     *
     * @type {IDBTransaction}
     */
    var tx = this.db.transaction(scopes, /** @type {number} */ (mode));
    goog.events.listen(/** @type {EventTarget} */ (tx),
        [ydn.db.IndexedDb.EventTypes.COMPLETE, ydn.db.IndexedDb.EventTypes.ABORT, ydn.db.IndexedDb.EventTypes.ERROR],
        function(event) {

          if (goog.isDef(tx.result)) {
            d.callback(tx.result);
          } else {
            d.errback(undefined);
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

    this.txQueue.push({fnc: fnc, scopes: scopes, mode: mode, d: d});
  }
  return d;
};


/**
 * @param {string} key
 * @param {string} value
 * @return {!goog.async.Deferred} d.
 */
ydn.db.IndexedDb.prototype.put = function(key, value) {

  var self = this;

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(ydn.db.Db.DEFAULT_TEXT_STORE);
    var request = store.put({'key': key, 'value': value});

    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result = true;
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
    };
  }, [ydn.db.Db.DEFAULT_TEXT_STORE], ydn.db.IndexedDb.TransactionMode.READ_WRITE);

};


/**
 *
 * @param {Object|Array} value
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.IndexedDb.prototype.putObject = function(table, value) {
  var self = this;

  if (goog.DEBUG && !goog.isDef(this.schema[table])) {
    throw Error(table + ' not exist.');
  }

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(table);
    var request;
    if (goog.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        request = store.put(value[i]);
      }
    } else {
      request = store.put(value);
    }

    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result = true;
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
    };
  }, [table], ydn.db.IndexedDb.TransactionMode.READ_WRITE);
};


/**
 *
 * @param {string} key
 * @return {!goog.async.Deferred} d.
 */
ydn.db.IndexedDb.prototype.get = function(key) {
  var self = this;

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(ydn.db.Db.DEFAULT_TEXT_STORE);
    var request = store.get(key);

    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      if (event.target.result) {
        tx.result = event.target.result['value'];
      }

    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
    };

  }, [ydn.db.Db.DEFAULT_TEXT_STORE], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};


/**
 * Return object
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.getObject = function(table, key) {
  var self = this;

  if (goog.DEBUG && !goog.isDef(this.schema[table])) {
    throw Error(table + ' not exist.');
  }

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(table);
    var request = store.get(key);

    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result = event.target.result;
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
    };

  }, [table], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};


/**
 * Return object
 * @param {ydn.db.Query} q
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.fetch = function(q) {
  var self = this;

  var value = q.value;
  var column = q.field;
  var table = q.table || ydn.db.Db.DEFAULT_TEXT_STORE;
  if (!column) {
    goog.asserts.assertObject(this.schema[table], 'store ' + table + ' not exists in ' + this.dbname);
    column = this.schema[q.table].keyPath;
  }

  return this.doTransaction(function(tx) {
    //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column + ' in ' + table);
    var store = tx.objectStore(table);
    var index = store.index(column);
    var boundKeyRange;
    var value_upper = '';
    if (q.op == ydn.db.Query.Op.START_WITH) {
      value_upper = value.substring(0, value.length - 1) + String.fromCharCode(value.charCodeAt(value.length - 1) + 1);
      boundKeyRange = ydn.db.IndexedDb.IDBKeyRange.bound(value, value_upper, false, true);
    } else {
      boundKeyRange = ydn.db.IndexedDb.IDBKeyRange.only(value);
    }
    //console.log('opening ' + q.op + ' cursor ' + value + ' ' + value_upper + ' of ' + column + ' in ' + table);
    var request = index.openCursor(boundKeyRange);

    request.onsuccess = function(event) {
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
        tx.result.push(cursor['value']); // should not necessary if externs are properly updated.
        //cursor.continue();
        cursor['continue'](); // Note: Must be quoted to avoid parse error.
      }
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
    };

  }, [table], ydn.db.IndexedDb.TransactionMode.READ_WRITE);

};


/**
 * Deletes the store.
 * @param {string=} table
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.clear = function(table) {

  if (table) {
    return this.clearStore(table);
  } else {
    var dfs = [];
    for (var store in this.schema) {
      dfs.push(this.clearStore(store));
    }
    return ydn.async.reduceAllTrue(new goog.async.DeferredList(dfs));
  }
};


/**
 * Deletes given store.
 * @param {string} table
 * @return {!goog.async.Deferred}
 */
ydn.db.IndexedDb.prototype.clearStore = function(table) {
  var self = this;
  table = table || ydn.db.Db.DEFAULT_TEXT_STORE;

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(table);
    var request = store.clear();
    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result = true;
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
    };
  }, [table], ydn.db.IndexedDb.TransactionMode.READ_WRITE);

};


/**
 * Get number of items stored.
 * @param {string=} table
 * @return {!goog.async.Deferred} d.
 */
ydn.db.IndexedDb.prototype.getCount = function(table) {

  table = table || ydn.db.Db.DEFAULT_TEXT_STORE;
  var self = this;

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(table);
    var request = store.count();
    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      tx.result = event.target.result;
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
    };

  }, [table], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};


/**
 * Print out list of key. Debug use
 * @param {string=} table
 * @return {!goog.async.Deferred} d.
 */
ydn.db.IndexedDb.prototype.list = function(table) {
  var self = this;

  table = table || ydn.db.Db.DEFAULT_TEXT_STORE;
  goog.asserts.assertObject(this.schema[table], 'store ' + table + ' not exists in ' + this.dbname);
  var column = this.schema[table].keyPath;

  return this.doTransaction(function(tx) {
    //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column + ' in ' + table);
    var store = tx.objectStore(table);
    var index = store.index(column);
    var boundKeyRange;
    var value_upper = '';

    //console.log('opening ' + q.op + ' cursor ' + value + ' ' + value_upper + ' of ' + column + ' in ' + table);
    var request = index.openCursor();

    request.onsuccess = function(event) {
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
        tx.result.push(cursor['value'][column]); // should not necessary if externs are properly updated.
        //cursor.continue();
        cursor['continue'](); // Note: Must be quoted to avoid parse error.
      }
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
    };

  }, [table], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};




