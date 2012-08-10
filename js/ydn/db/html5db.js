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
 * @fileoverview HTML5 localStorage implemented as deferred async pattern.
 */

goog.provide('ydn.db.Html5Db');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');


/**
 * @implements {ydn.db.Db}
 * @param {string} dbname dtabase name.
 * @param {Array.<!ydn.db.DatabaseSchema>} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.Html5Db = function(dbname, schemas) {
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
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.Html5Db.isSupported = function() {
  return !!window.localStorage;
};


/**
 * @protected
 * @param {string} old_version old version.
 */
ydn.db.Html5Db.prototype.migrate = function(old_version) {

};


/**
 * @protected
 * @param {string} id id.
 * @param {string} store_name table name.
 * @return {string} canonical key name.
 */
ydn.db.Html5Db.prototype.getKey = function(id, store_name) {
  return '_database_' + this.dbname + '-' + store_name + '-' + id;
};


/**
 * @inheritDoc
 */
ydn.db.Html5Db.prototype.put = function(table, value) {
  var store = this.schema.getStore(table);
  goog.asserts.assertObject(store);
  var key, value_str;
  if (goog.isObject(value)) {
    key = store.getKey(value);
    goog.asserts.assertString(key);
    key = this.getKey(key, table);
    value_str = ydn.json.stringify(value);
    window.localStorage.setItem(key, value_str);
  } else if (goog.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      key = store.getKey(value[i]);
      goog.asserts.assertString(key);
      key = this.getKey(key, table);
      value_str = ydn.json.stringify(value);
      window.localStorage.setItem(key, value_str);
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
ydn.db.Html5Db.prototype.get = function(table, opt_key) {

  var store = this.schema.getStore(table);
  goog.asserts.assertObject(store);

  if (goog.isDef(opt_key)) {
    var value = window.localStorage.getItem(this.getKey(opt_key, table));
    if (!goog.isNull(value)) {
      value = ydn.json.parse(/** @type {string} */ (value));
    } else {
      value = undefined; // localStorage return null for not existing value
    }
    return goog.async.Deferred.succeed(value);
  } else {
    var arr = [];
    for (var item in window.localStorage) {
      if (goog.string.startsWith(item, '_database_' + this.dbname + '-' +
          table)) {
        var value = window.localStorage[item];
        arr.push(ydn.json.parse(
            /** @type {string} */ (value)));
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
ydn.db.Html5Db.prototype.clear = function(opt_table) {
  var tables_to_clear = goog.isDef(opt_table) ?
    [opt_table] : this.schema.listStores();

  for (var key in window.localStorage) {
    for (var table, i = 0; table = tables_to_clear[i]; i++) {
      if (goog.string.startsWith(key, '_database_' + this.dbname + '-' + table))
      {
        delete window.localStorage[key];
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
ydn.db.Html5Db.prototype.remove = function(opt_table, opt_id) {
  if (goog.isDef(opt_id) && goog.isDef(opt_table)) {
    var key = this.getKey(opt_id, opt_table);
    delete window.localStorage[key];
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
ydn.db.Html5Db.prototype.count = function(opt_table) {
  var d = new goog.async.Deferred();
  opt_table = opt_table || ydn.db.Storage.DEFAULT_TEXT_STORE;
  var n = 0;
  for (var key in window.localStorage) {
    if (goog.string.startsWith(key, '_database_' + this.dbname)) {
      n++;
    }
  }
  d.callback(n);
  return d;
};


/**
 * @inheritDoc
 */
ydn.db.Html5Db.prototype.fetch = function(q) {
  return goog.async.Deferred.fail(true);
};
