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
goog.require('ydn.db.DatabaseSchema');
goog.require('ydn.db.con.IDatabase');
goog.require('ydn.json');


/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema
 * @param {string} dbname name of database.
 * @param {ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @implements {ydn.db.con.IDatabase}
 * @constructor
 */
ydn.db.con.IndexedDb = function(dbname, schema) {

  this.dbname = dbname;

  this.idx_db_ = null;

  this.connect(schema);
};


/**
 * @protected
 * @param {ydn.db.DatabaseSchema=} schema
 */
ydn.db.con.IndexedDb.prototype.connect = function(schema) {

  /**
   * @type {ydn.db.con.IndexedDb}
   */
  var me = this;

  var version = schema.getVersion();

  // Currently in unstable stage, opening indexedDB has two incompatible call.
  // version could be number (new) or string (old).
  // In chrome, version is taken as description.
  me.logger.finer('Opening database: ' + this.dbname + ' ver: ' + version);

  /**
   * This open request return two format.
   * @type {IDBOpenDBRequest|IDBRequest}
   */
  var openRequest;
  if (schema.isAutoSchema()) {
    // auto schema do not have version
    openRequest = ydn.db.con.IndexedDb.indexedDb.open(this.dbname);
  } else {
    openRequest = ydn.db.con.IndexedDb.indexedDb.open(this.dbname,
    // casting is for old externs uncorrected defined as string
    // old version will think, version as description.
    /** @type {string} */ (schema.version));
  }


  if (ydn.db.con.IndexedDb.DEBUG) {
    window.console.log(openRequest);
  }

  openRequest.onsuccess = function(ev) {
    /**
     * @type {IDBDatabase}
     */
    var db = ev.target.result;
    var msg = 'Database: ' + db.name + ', ver: ' + db.version + ' opened.';
    me.logger.finer(msg);

    if (schema.isAutoSchema()) {
      // since there is no version, auto schema always need to validate
      /**
       * @param {ydn.db.DatabaseSchema} db_schema
       */
      var validator = function(db_schema) {
        var diff_msg = schema.difference(db_schema);
        if (diff_msg.length > 0) {
          me.logger.finer('Schema change require for difference in ' + diff_msg);

          var on_completed = function(t, e) {
            if (t == ydn.db.base.TransactionEventTypes.COMPLETE) {
              me.setDb(db);
            } else {
              me.logger.severe('Fail to update version on ' + db.name + ':' +
                db.version);
              me.setDb(null, e);
            }
          };
          me.idx_db_ = db; // ??
          me.doTransaction(function(tx) {
            me.changeSchema(db, tx, schema);
          }, [], ydn.db.base.TransactionMode.VERSION_CHANGE, on_completed);
        } else {
          me.setDb(db);
        }
      };
      me.getSchema(validator, undefined, db);

    } else if (schema.getVersion() > db.version) {
      // in old format, db.version will be a string. type coercion should work
      // here

      goog.asserts.assertFunction(db['serVersion'],
        'Expecting IDBDatabase in old format');
      var version = /** @type {*} */ (schema.getVersion());
      var ver_request = db.setVersion(/** @type {string} */ (version)); // for chrome

      ver_request.onfailure = function(e) {
        me.logger.warning('migrating from ' + db.version + ' to ' +
          schema.getVersion() + ' failed.');
        me.setDb(null, e);
      };
      ver_request.onsuccess = function(e) {
        me.changeSchema(db, ver_request['transaction'], schema, true);
      };
    } else {
      if (schema.getVersion() == db.version) {
        me.logger.finer('database version ' + db.version + ' ready to go');
      } else {
        // this will not happen according to IDB spec.
        me.logger.warning('connected database version ' + db.version +
          ' is higher than requested version.');
      }
      me.setDb(db);
    }
  };

  openRequest.onupgradeneeded = function(ev) {
    var db = ev.target.result;

    me.logger.finer('upgrade needed for version ' + db.version);

    me.changeSchema(db, openRequest['transaction'], schema);

  };

  openRequest.onerror = function(ev) {
    var msg = 'opening database ' + me.dbname + ':' + schema.version + ' failed.';
    if (ydn.db.con.IndexedDb.DEBUG) {
      window.console.log([ev, openRequest]);
    }
    me.logger.severe(msg);

    me.setDb(null, ev);
  };

  openRequest.onblocked = function(ev) {
    if (ydn.db.con.IndexedDb.DEBUG) {
      window.console.log([ev, openRequest]);
    }
    me.logger.severe('database ' + me.dbname + ' ' + schema.version +
      ' block, close other connections.');

    // should we reopen again after some time?

    me.setDb(null, ev);
  };

  openRequest.onversionchange = function(ev) {
    me.logger.fine('Version change request, so closing the database');

    if (me.db) {
      me.db.close();
    }
  };

  // extra checking whether, database is OK
  if (goog.DEBUG || ydn.db.con.IndexedDb.DEBUG) {
    var timer = new goog.Timer( ydn.db.con.IndexedDb.timeOut);
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
 * @inheritDoc
 */
ydn.db.con.IndexedDb.prototype.onConnected = null;



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
 * @final
 * @protected
 * @param {IDBDatabase} db database instance.
 * @param {Error=} e
 */
ydn.db.con.IndexedDb.prototype.setDb = function (db, e) {


  if (goog.isDef(e)) {
    this.logger.warning('Error received: ' + (e ? e.message : ''));
    this.idx_db_ = null;

  } else {
    goog.asserts.assertObject(db);
    this.idx_db_ = db;
    var me = this;
    this.idx_db_.onabort = function(e) {
      me.logger.finest(me + ': onabort - ' + e.message);
    };
    this.idx_db_.onerror = function(e) {
      if (ydn.db.con.IndexedDb.DEBUG) {
        window.console.log([this, e]);
      }
      me.logger.finest(me + ': onerror - ' + e.message);
    };
    this.idx_db_.onversionchange = function(e) {
      if (ydn.db.con.IndexedDb.DEBUG) {
        window.console.log([this, e]);
      }
      me.logger.finest(me + ': onversionchange - ' + e.message);
      delete me.idx_db_.onabort;
      delete me.idx_db_.onerror;
      delete me.idx_db_.onversionchange;
      me.idx_db_.close();
      me.idx_db_ = null;
    }
  }

  if (goog.isFunction(this.onConnected)) {
    this.onConnected(!!me.idx_db_, e);
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
 *
 * @param {function(ydn.db.DatabaseSchema)} callback
 * @param {IDBTransaction=} trans
 * @param {IDBDatabase=} db
 */
ydn.db.con.IndexedDb.prototype.getSchema = function(callback, trans, db) {
  db = db || this.idx_db_;
  var mode = ydn.db.base.TransactionMode.READ_ONLY;
  if (!goog.isDef(trans)) {
    var names = [];
    for (var i = db.objectStoreNames.length - 1; i >= 0; i--) {
      names[i] = db.objectStoreNames[i];
    }
    trans = db.transaction(names, /** @type {number} */ (mode));
  } else {
    db = trans.db;
  }

  /** @type {DOMStringList} */
  var objectStoreNames = /** @type {DOMStringList} */ (db.objectStoreNames);

  var schema = new ydn.db.DatabaseSchema(/** @type {number} */ (db.version));
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
      indexes[j] = new ydn.db.IndexSchema(index.keyPath, undefined,
        index.unique, index.multiEntry, index.name);
    }
    var store = new ydn.db.StoreSchema(objStore.name, objStore.keyPath,
      objStore.autoIncrement, undefined, indexes);
    schema.addStore(store);
  }

  callback(schema);
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
    // sniff schema from the database.
    schema = new ydn.db.DatabaseSchema(/** @type {number} */ (db.version));

    // Unlike SQLIte IndexedDB do not need to specified type and no info
    // available. It can be sniff by reading one fo the database.
    // this will be overkilled. We want sync sniffing.
    var type = undefined;

    for (var i = 0; i < objectStoreNames.length; i++) {
      var objStore = trans.objectStore(objectStoreNames[i]);
      var indexes = [];
      var n = objStore.indexNames.length;
      for (var j = 0; j < n; j++) {
        var index = objStore.index(objStore.indexNames[j]);
        indexes.push(new ydn.db.IndexSchema(index.keyPath, type,
          index.unique, index.multiEntry, index.name));
      }
      var store = new ydn.db.StoreSchema(objStore.name, objStore.keyPath,
        objStore.autoIncrement, type, indexes);
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
        if (store.autoIncrement != !!objStore.autoIncrement) {
          throw new ydn.error.ConstrainError('Different autoIncrement between schema and database: ' +
            store.autoIncrement + ' vs. ' + objStore.autoIncrement);
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

    // IE10 is picky on optional parameters of keyPath. If it is undefined, it must not be defined.
    var options = {"autoIncrement": store_schema.autoIncrement};
    if (goog.isDefAndNotNull(store_schema.keyPath)) {
      options['keyPath'] = store_schema.keyPath;
    }
    try {
      store = db.createObjectStore(store_schema.name, options);
    } catch (e) {
      if (e.name == 'InvalidAccessError') {
        throw new ydn.db.InvalidAccessError('creating store for ' + store_schema.name + ' of keyPath: ' +
          store_schema.keyPath + ' and autoIncrement: ' + store_schema.autoIncrement);
      } else if (e.name == 'ConstraintError') {
        // store already exist.
        throw new ydn.error.ConstrainError('creating store for ' + store_schema.name);
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
 * Migrate from current version to the given version.
 * @protected
 * @param {IDBDatabase} db database instance.
 * @param {IDBTransaction} trans
 * {ydn.db.DatabaseSchema} schema
 * @param {boolean=} is_caller_setversion call from set version;.
 */
ydn.db.con.IndexedDb.prototype.changeSchema = function(db, trans, schema, is_caller_setversion) {

  var me = this;
  var action = is_caller_setversion ? 'changing' : 'upgrading';
  this.logger.finer(action + ' version from ' + db.version + ' to ' +
    schema.getVersion());

  trans.oncomplete = function(e) {

    // by reopening the database, we make sure that we are not in
    // version change state since transaction cannot open during version
    // change state. this is most common mistake on using IndexedDB API.
    // db.close(); // cannot close connection. this cause InvalidStateError
    var reOpenRequest = ydn.db.con.IndexedDb.indexedDb.open(me.dbname);
    reOpenRequest.onsuccess = function(rev) {
      var db = rev.target.result;
      me.logger.finer(me + ':' + action + ' OK.');
      me.setDb(db);
    };

    reOpenRequest.onerror = function(e) {
      me.logger.finer(me + ':' + action + ' fail.');
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
  return goog.async.Deferred.succeed(true); // update_store_ is synchronous
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
 * @param {ydn.db.base.TransactionMode} mode mode.
 * @param {function(ydn.db.base.TransactionEventTypes, *)} completed_event_handler
 */
ydn.db.con.IndexedDb.prototype.doTransaction = function (fnc, scopes, mode, completed_event_handler) {


  var me = this;

  /**
   *
   * @param {!IDBTransaction} tx
   */
  var call_tx = function(tx) {

    tx.oncomplete = function (event) {
      completed_event_handler(ydn.db.base.TransactionEventTypes.COMPLETE, event);
    };

    tx.onerror = function (event) {
      completed_event_handler(ydn.db.base.TransactionEventTypes.ERROR, event);
    };

    tx.onabort = function (event) {
      completed_event_handler(ydn.db.base.TransactionEventTypes.ABORT, event);
    };

    fnc(tx);
  };

  if (mode === ydn.db.base.TransactionMode.VERSION_CHANGE) {
    var version = goog.isString(this.idx_db_.version) ?
      parseFloat(this.idx_db_.version) : this.idx_db_.version;
    var next_version = version + 1;
    if (goog.isFunction(this.idx_db_.setVersion)) {

      var setVrequest = this.idx_db_.setVersion(/** @type {string} */ (next_version));

      setVrequest.onfailure = function (e) {
        me.logger.warning('changing version from ' + me.idx_db_.version + ' to ' +
          next_version + ' failed.');
        completed_event_handler(ydn.db.base.TransactionEventTypes.ERROR, e);
      };
      setVrequest.onsuccess = function (e) {

        var tx = setVrequest['transaction'];

        call_tx(tx);
      };
    } else {
      // http://www.w3.org/TR/IndexedDB/#dfn-mode
      // "versionchange". This type of transaction can't be manually created,
      // but instead is created automatically when a upgradeneeded event is
      // fired.
      //this.idx_db_.close();
      var openRequest = ydn.db.con.IndexedDb.indexedDb.open(this.dbname);
      openRequest.onupgradeneeded = function(ev) {
        var db = ev.target.result;
        me.idx_db_ = db;
        //me.deferredIdxDb_ = new goog.async.Deferred();
        //me.deferredIdxDb_.callback(db);
        var tx = openRequest['transaction'];
        call_tx(tx);
      };
    }
  } else { // for READ_ONLY and READ_WRITE mode

    var tx = this.idx_db_.transaction(scopes, /** @type {number} */ (mode));
    call_tx(tx);
  }
};



/**
 * Close the connection.
 * @final
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
