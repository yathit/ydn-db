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
  trFn(this);
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



/**
 * Extract inline key from the object, out-of-line key as provided or generate
 * from the store key generator.
 * @final
 * @protected
 * @param {ydn.db.schema.Store} store table name.
 * @param {!Object} value object having key in keyPath field.
 * @return {string} key as seen by user.
 */
ydn.db.con.SimpleStorage.prototype.extractKey = function(store, value, opt_key) {

  var key;

  if (goog.isDefAndNotNull(store.keyPath)) {
    key = store.getKeyValue(value);
  } else if (goog.isDef(opt_key)) {
    key = opt_key;
  } else if (store.getAutoIncrement()) {
    var store_key = this.makeKey(store);
    var store_obj = ydn.json.parse(this.cache_.getItem(store_key));
    store_obj['autoIncrementNo']++;
    key = store_obj['autoIncrementNo'];
    this.cache_.setItem(store_key, ydn.json.stringify(store_obj));
  } else {
    throw Error('No key provided.');
  }

  return key;
};


/**
 * Use store name and id to form a key to use in setting key to storage.
 * @protected
 * @final
 * @param {ydn.db.schema.Store} store table name.
 * @param {(string|number|Date|!Array)=} id id.
 * @return {string} canonical key name.
 */
ydn.db.con.SimpleStorage.prototype.makeKey = function(store, id) {
  var parts = [ydn.db.con.SimpleStorage.NAMESPACE, this.dbname, + store.name];
  if (goog.isDef(id)) {
    parts.push(ydn.db.utils.encodeKey(id));
  }
  return parts.join(ydn.db.con.SimpleStorage.SEP);
};


/**
 *
 * @param {!ydn.db.schema.Store|string} store_name store schema or name.
 * @param {(string|number|Date|!Array)} id id.
 * @return {*} the value obtained.
 * @final
 */
ydn.db.con.SimpleStorage.prototype.getItemInternal = function(store_name, id) {
  var store = store_name instanceof ydn.db.schema.Store ?
      store_name : this.schema.getStore(store_name);
  var key = this.makeKey(store, id);
  var value = this.cache_.getItem(key);
  if (!goog.isNull(value)) {
    value = ydn.json.parse(/** @type {string} */ (value));
  } else {
    value = undefined; // localStorage return null for not existing value
  }
  return value;
};


/**
 *
 * @param {!Object} value the value.
 * @param {string} store_name store name.
 * @param {*=} id optional out-of-line key.
 * @return {string} key key as seen by user.
 * @final
 */
ydn.db.con.SimpleStorage.prototype.setItemInternal = function(
    value, store_name, id) {
  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(value);
  var obj_id = this.extractKey(store, value, id);
  var key = this.makeKey(store, obj_id);
  var str = ydn.json.stringify(value);
  if (ydn.db.req.SimpleStore.DEBUG) {
    window.console.log(['setItemInternal', obj_id, key, str]);
  }
  this.cache_.setItem(key, str);
  return obj_id;
};


/**
 *
 * @param {string} store_name store name or key.
 * @param {(!Array|string|number)} id  id.
 * @final
 */
ydn.db.con.SimpleStorage.prototype.removeItemInternal = function(
    store_name, id){
  var store = this.schema.getStore(store_name);
  var key = this.makeKey(store, id);
  this.cache_.removeItem(key);
};



/**
 * @final
 * @protected
 * @param {string|number} id id.
 * @param {ydn.db.schema.Store|string} store table name.
 * @return {string} canonical key name.
 */
ydn.db.con.SimpleStorage.prototype.getKeyValue = function(id, store) {
  var store_name = store instanceof ydn.db.schema.Store ? store.name : store;
  return '_database_' + this.dbname + '-' + store_name + '-' + id;
};

