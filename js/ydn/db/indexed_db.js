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
goog.require('ydn.db.Db');
goog.require('ydn.db.Query');
goog.require('ydn.json');



/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema defination
 * @implements {ydn.db.Db}
 * @param {string} dbname name of database.
 * @param {Object=} opt_schema table schema contain table name and keyPath.
 * @param {string=} opt_version version.
 * @constructor
 */
ydn.db.IndexedDb = function(dbname, opt_schema, opt_version) {
  var self = this;
  this.dbname = dbname;
  this.schema = opt_schema || {};
  this.schema[ydn.db.Db.DEFAULT_TEXT_STORE] = {keyPath: 'key'};
  this.version = opt_version || '1';

  var indexedDb = goog.global.indexedDB || goog.global.mozIndexedDB ||
      goog.global.webkitIndexedDB || goog.global.moz_indexedDB;

  self.logger.finer('Trying to open ' + this.dbname + ' ' + this.version);

  // currently in unstable stage, opening indexedDB has two incompatible call.
  // in chrome, if version is provide, it does not work, while other browser
  // require version.
  var is_set_version_supported = goog.isFunction(indexedDb.setVersion);
  var version = is_set_version_supported ? undefined : this.version;
  var openRequest = indexedDb.open(this.dbname, this.version);

  openRequest.onsuccess = function(ev) {
    self.logger.finer(self.dbname + ' ' + this.version + ' OK.');
    var db = ev.target.result;
    if (self.version != db.version) { // for chrome
      self.logger.finer('initializing database from ' + db.version + ' to ' +
          self.version);
      goog.asserts.assert(is_set_version_supported);

      var setVrequest = db.setVersion(self.version); // for chrome

      setVrequest.onfailure = function(e) {
        self.logger.warning('setting up database ' + db.dbname + ' fail.');
        self.setDb(null);
      };
      setVrequest.onsuccess = function(e) {
        self.initObjectStores(db);
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

    self.initObjectStores(db);

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
 * @return {boolean} return indexedDB support on run time.
 */
ydn.db.IndexedDb.isSupported = function() {
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
 * @protected
 * @param {IDBDatabase} db database instance.
 */
ydn.db.IndexedDb.prototype.initObjectStores = function(db) {
  for (var tableName in this.schema) {
    var keyPath = this.schema[tableName]['keyPath'];
    goog.asserts.assertString(keyPath, 'keyPath required in ' + tableName);
    this.logger.finest('Creating Object Store for ' + tableName +
        ' with keyPath: ' + keyPath);

    /**
     * @preserveTry
     */
    try {
      var store = db.createObjectStore(tableName, {
        keyPath: keyPath, autoIncrement: false});
      if (this.schema[tableName]['index']) {
        for (var i = 0; i < this.schema[tableName]['index'].length; i++) {
          var index = this.schema[tableName]['index'][i];
          goog.asserts.assertString(index['name'], 'name required.');
          goog.asserts.assertString(index['field'], 'field required.');
          goog.asserts.assertBoolean(index['unique'], 'unique required.');
          store.createIndex(index['name'], index['field'], {
            unique: index['unique'] });
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
 * @define {boolean} trun on debug flag to dump object.
 */
ydn.db.IndexedDb.DEBUG = false;


/**
 * Run the first transaction task in the queue. DB must be ready to do the
 * transaction.
 * @protected
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
 * When DB is ready, fnc will be call with a fresh transaction object. Fnc must
 * put the result to 'result' field of the transaction object on success. If
 * 'result' field is not set, it is assumed
 * as failed.
 * @protected
 * @param {Function} fnc transaction function.
 * @param {Array.<string>} scopes list of tabes involved in the transaction.
 * @param {number|string} mode mode.
 * @param {goog.async.Deferred=} opt_df output deferred function to be used.
 * @return {!goog.async.Deferred} d result in deferred function.
 */
ydn.db.IndexedDb.prototype.doTransaction = function(fnc, scopes, mode, opt_df) {
  var self = this;
  opt_df = opt_df || new goog.async.Deferred();

  if (this.is_ready) {
    this.is_ready = false;

    /**
     *
     * @type {IDBTransaction}
     */
    var tx = this.db.transaction(scopes, /** @type {number} */ (mode));
    goog.events.listen(/** @type {EventTarget} */ (tx),
        [ydn.db.IndexedDb.EventTypes.COMPLETE,
          ydn.db.IndexedDb.EventTypes.ABORT, ydn.db.IndexedDb.EventTypes.ERROR],
        function(event) {

          if (goog.isDef(tx.result)) {
            opt_df.callback(tx.result);
          } else {
            opt_df.errback(undefined);
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
ydn.db.IndexedDb.prototype.setItem = function(key, value) {

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
  }, [ydn.db.Db.DEFAULT_TEXT_STORE],
  ydn.db.IndexedDb.TransactionMode.READ_WRITE);

};


/**
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.put = function(table, value) {
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
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.getItem = function(key) {
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

  }, [ydn.db.Db.DEFAULT_TEXT_STORE],
  ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};


/**
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.get = function(table, key) {
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
 * @inheritDoc
 */
ydn.db.IndexedDb.prototype.fetch = function(q) {
  var self = this;

  var value = q.value;
  var column = q.field;
  var table = q.table || ydn.db.Db.DEFAULT_TEXT_STORE;
  if (!column) {
    goog.asserts.assertObject(this.schema[table], 'store ' + table +
        ' not exists in ' + this.dbname);
    column = this.schema[q.table].keyPath;
  }

  return this.doTransaction(function(tx) {
    //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column +
    // ' in ' + table);
    var store = tx.objectStore(table);
    var index = store.index(column);
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
        tx.result.push(cursor['value']); // should not necessary if externs are
        // properly updated.
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
 * @inheritDoc
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
 * @param {string=} opt_table table name.
 * @return {!goog.async.Deferred} d result in deferred function.
 */
ydn.db.IndexedDb.prototype.clearStore = function(opt_table) {
  var self = this;
  opt_table = opt_table || ydn.db.Db.DEFAULT_TEXT_STORE;

  return this.doTransaction(function(tx) {
    var store = tx.objectStore(opt_table);
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
  }, [opt_table], ydn.db.IndexedDb.TransactionMode.READ_WRITE);

};


/**
 * @inheritDoc
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
 * Print out list of key for debug use.
 * @param {string=} opt_table table name.
 * @return {!goog.async.Deferred} return as deferred function.
 */
ydn.db.IndexedDb.prototype.list = function(opt_table) {
  var self = this;

  opt_table = opt_table || ydn.db.Db.DEFAULT_TEXT_STORE;
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
    };

  }, [opt_table], ydn.db.IndexedDb.TransactionMode.READ_ONLY);

};




