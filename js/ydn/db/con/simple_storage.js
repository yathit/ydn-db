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
 * @fileoverview Data store in memory.
 */

// TODO: in memory indexing.

goog.provide('ydn.db.con.SimpleStorage');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Key');
goog.require('ydn.db.con.IDatabase');
goog.require('ydn.db.req.InMemoryStorage');


/**
 * @implements {ydn.db.con.IDatabase}
 * @param {Object=} opt_localStorage storage provider.
 * @constructor
 */
ydn.db.con.SimpleStorage = function(opt_localStorage) {

  /**
   * @final
   * @type {!Object}
   * @private
   */
  this.cache_ = opt_localStorage || new ydn.db.req.InMemoryStorage();

};


/**
 * @const
 * @type {string}
 */
ydn.db.con.SimpleStorage.TYPE = 'memory';


/**
 * @deprecated
 * @return {!Object} return memory store object.
 */
ydn.db.con.SimpleStorage.getInMemoryStorage = function() {

  var memoryStorage = {};
  memoryStorage.setItem = function(key, value) {
    memoryStorage[key] = value;
  };
  memoryStorage.getItem = function(key) {
    return memoryStorage[key] || null; // window.localStorage return null
    // if the key don't exist.
  };
  memoryStorage.removeItem = function(key) {
    delete memoryStorage[key];
  };
  memoryStorage.clear = function() {
    for (var key in memoryStorage) {
      if (memoryStorage.hasOwnProperty(key)) {
        delete memoryStorage[key];
      }
    }
  };
  return memoryStorage;
};


/**
 *
 * @return {boolean} true if memory is supported.
 */
ydn.db.con.SimpleStorage.isSupported = function() {
  return true;
};


/**
 * Storage key namespace.
 * @const
 * @type {string}  Storage key namespace.
 */
ydn.db.con.SimpleStorage.NAMESPACE = 'ydn.db';


/**
 *
 * @const
 * @type {string} seperator.
 */
ydn.db.con.SimpleStorage.SEP = '^|';


/**
 * Make key.
 * @param {...} args string tokens to join.
 * @return {string} string join by separator.
 */
ydn.db.con.SimpleStorage.prototype.key = function(args) {
  return ydn.db.con.SimpleStorage.NAMESPACE + ydn.db.con.SimpleStorage.SEP +
    this.dbname + ydn.db.con.SimpleStorage.SEP +
    Array.prototype.join.call(arguments, ydn.db.con.SimpleStorage.SEP)
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.connect = function(dbname, schema) {

  /**
   * @final
   * @type {string}
   */
  this.dbname = dbname;

  /**
   * @protected
   * @final
   * @type {!ydn.db.schema.Database}
   */
  this.schema = schema;


  var db_key = this.key();
  var db_value = this.cache_.getItem(db_key);
  var stores = this.schema.getStoreNames();
  var ex_stores = stores;
  var db_obj = {'Stores': stores};

  // save stores.
  this.cache_.setItem(db_key, ydn.json.stringify(db_obj));
//  if (!db_value) {
//    this.cache_.setItem(db_key, ydn.json.stringify(db_obj));
//  } else {
//    var ex_db_obj = ydn.json.parse(db_value);
//    ex_stores = goog.object.getValueByKeys(ex_db_obj, ['Stores']);
//    if (!ydn.object.equals(stores, ex_stores)) {
//      this.cache_.setItem(db_key, ydn.json.stringify(db_obj));
//    }
//  }

  // create or delete stores
  for (var i = 0, n = this.schema.count(); i < n; i++) {
    var store = this.schema.store(i);
    var store_key = this.key(store);

    var diff = false;
    var store_obj = ydn.json.parse(this.cache_.getItem(store_key)) || {
      'name': store.getName()
    };
    if (store.getAutoIncrement() != store_obj['autoIncrement']) {
      store_obj['autoIncrement'] = store.getAutoIncrement();
      diff = true;
    }
    if (store.getKeyPath() != store_obj['keyPath']) {
      store_obj['keyPath'] = store.getKeyPath();
      diff = true;
    }
    if (!goog.isDef(store_obj['autoIncrementNo'])) {
      store_obj['autoIncrementNo'] = 1;
      diff = true;
    }
    if (diff) {
      this.cache_.setItem(store_key, ydn.json.stringify(store_obj));
    }
  }

  return goog.async.Deferred.succeed(true);
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.isReady = function() {
  return !!this.dbname && !!this.schema;
};



/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.getDbInstance = function() {
  return this.cache_ || null;
};




/**
 * Column name of key, if keyPath is not specified.
 * @const {string}
 */
ydn.db.con.SimpleStorage.DEFAULT_KEY_PATH = '_id_';



/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.type = function() {
  return 'memory';
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.close = function() {

};


/**
 *
 * @return {!Object}
 */
ydn.db.con.SimpleStorage.prototype.getCache = function() {
  return this.cache_;
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.doTransaction = function(trFn, scopes, mode,
                                                            oncompleted) {
  trFn(this.cache_);
  oncompleted(ydn.db.base.TransactionEventTypes.COMPLETE, {});
};



/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.getSchema = function(callback) {
  var stores = [];
  var db_value = this.cache_.getItem(this.key());
  var store_names = db_value['Stores'];
  for (var i = 0; i < store_names.length; i++) {
    var store_obj = this.cache_.getItem(this.key(store_names[i]));
    stores[i] = new ydn.db.schema.Store(store_names[i],
      store_obj['keyPath'], store_obj['autoIncrement']);
  }
  var schema = new ydn.db.schema.Database(this.dbname, stores);
  callback(schema);
};
