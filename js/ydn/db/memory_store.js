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

goog.provide('ydn.db.MemoryStore');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');


/**
 * @implements {ydn.db.Db}
 * @param {string} dbname dtabase name.
 * @param {Array.<!ydn.db.DatabaseSchema>} schemas table schema contain table
 * name and keyPath.
 * @param {Object=} opt_localStorage
 * @constructor
 */
ydn.db.MemoryStore = function(dbname, schemas, opt_localStorage) {

  /**
   * @final
   * @type {Object}
   * @private
   */
  this.cache_ = opt_localStorage || ydn.db.MemoryStore.getFakeLocalStorage();

  this.dbname = dbname;
  /**
   * @final
   * @protected
   * @type {Array.<!ydn.db.DatabaseSchema>}
   */
  this.schemas = schemas;

  this.schema = schemas[schemas.length - 1]; // we always use the last schema.

};


/**
 *
 * @return {Object} return memory store object.
 */
ydn.db.MemoryStore.getFakeLocalStorage = function() {

  var localStorage = {};
  localStorage.setItem = function(key, value) {
    localStorage[key] = value;
  };
  localStorage.getItem = function(key) {
    return localStorage[key] || null; // window.localStorage return null
    // if the key don't exist.
  };
  localStorage.clear = function() {
    for (var key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        delete localStorage[key];
      }
    }
  };
  return localStorage;
};


/**
 *
 * @return {boolean} true if memory is supported.
 */
ydn.db.MemoryStore.isSupported = function() {
  return true;
};


/**
 * @protected
 * @param {string} old_version old version.
 */
ydn.db.MemoryStore.prototype.migrate = function(old_version) {

};


/**
 * @protected
 * @param {string} id id.
 * @param {string} store_name table name.
 * @return {string} canonical key name.
 */
ydn.db.MemoryStore.prototype.getKey = function(id, store_name) {
  return '_database_' + this.dbname + '-' + store_name + '-' + id;
};


/**
 * @inheritDoc
 */
ydn.db.MemoryStore.prototype.put = function(table, value) {
  var store = this.schema.getStore(table);
  goog.asserts.assertObject(store);
  var key, value_str;
  if (goog.isObject(value)) {
    key = store.getKey(value);
    goog.asserts.assertString(key);
    key = this.getKey(key, table);
    value_str = ydn.json.stringify(value);
    this.cache_.setItem(key, value_str);
  } else if (goog.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      key = store.getKey(value[i]);
      goog.asserts.assertString(key);
      key = this.getKey(key, table);
      value_str = ydn.json.stringify(value);
      this.cache_.setItem(key, value_str);
    }
  } else {
    throw Error('Not object: ' + value);
  }
  return goog.async.Deferred.succeed(true);
};


/**
 * Return object
 * @param {string} table table name.
 * @param {string=} opt_key object key to be retrieved, if not provided, all
 * entries in the store will return.
 * param {number=} start start number of entry.
 * param {number=} limit maximun number of entries.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.MemoryStore.prototype.get = function(table, opt_key) {

  var store = this.schema.getStore(table);
  goog.asserts.assertObject(store);

  if (goog.isDef(opt_key)) {
    var value = this.cache_.getItem(this.getKey(opt_key, table));
    if (!goog.isNull(value)) {
      value = ydn.json.parse(/** @type {string} */ (value));
    } else {
      value = undefined; // localStorage return null for not existing value
    }
    return goog.async.Deferred.succeed(value);
  } else {
    var arr = [];
    for (var item in this.cache_) {
      if (this.cache_.hasOwnProperty(item)) {
        if (goog.string.startsWith(item, '_database_' + this.dbname + '-' +
            table)) {
          var value = this.cache_[item];
          arr.push(ydn.json.parse(
              /** @type {string} */ (value)));
        }
      }
    }
    return goog.async.Deferred.succeed(arr);
  }
};


/**
 * Remove all data in a store (table).
 * @param {string=} opt_table delete a specific table.
 * all tables.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.MemoryStore.prototype.clear = function(opt_table) {
  var tables_to_clear = goog.isDef(opt_table) ?
      [opt_table] : this.schema.listStores();

  for (var key in this.cache_) {
    if (this.cache_.hasOwnProperty(key)) {
      for (var table, i = 0; table = tables_to_clear[i]; i++) {
        if (goog.string.startsWith(key, '_database_' + this.dbname + '-' + table))
        {
          delete this.cache_[key];
        }
      }
    }
  }
  return goog.async.Deferred.succeed(true);
};


/**
 * Delete the database, store or an entry.
 * @param {string=} opt_table delete a specific store.
 * @param {string=} opt_id delete a specific row.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.MemoryStore.prototype.remove = function(opt_table, opt_id) {
  if (goog.isDef(opt_id) && goog.isDef(opt_table)) {
    var key = this.getKey(opt_id, opt_table);
    delete this.cache_[key];
    return goog.async.Deferred.succeed(true);
  } else {
    return this.clear(opt_table);
  }
};


/**
 * Get number of items stored.
 * @param {string=} opt_table table name, default to
 * {@link ydn.db.Storage.DEFAULT_TEXT_STORE}.
 * @return {!goog.async.Deferred} return number of items in deferred function.
 */
ydn.db.MemoryStore.prototype.count = function(opt_table) {
  var d = new goog.async.Deferred();
  opt_table = opt_table || ydn.db.Storage.DEFAULT_TEXT_STORE;
  var n = 0;
  for (var key in this.cache_) {
    if (this.cache_.hasOwnProperty(key)) {
      if (goog.string.startsWith(key, '_database_' + this.dbname)) {
        n++;
      }
    }
  }
  d.callback(n);
  return d;
};


/**
 * @inheritDoc
 */
ydn.db.MemoryStore.prototype.fetch = function(q) {
  return goog.async.Deferred.fail(true);
};
