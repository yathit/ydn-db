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
goog.require('goog.async.Deferred');



/**
 * @implements {ydn.db.Db}
 * @param {string} dbname dtabase name.
 * @param {Array.<!ydn.db.DatabaseSchema>} schemas table schema contain table name and keyPath.
 * @constructor
 */
ydn.db.Html5Db = function(dbname, schemas) {

  this.dbname = dbname;
  this.schema = schemas[schemas.length - 1];


  for (var table in this.schema) {
    if (!goog.isDef(window.localStorage[table])) {
      window.localStorage[table] = {};
    }
  }

};


/**
 *
 * @return {boolean} true if localStorage is supported
 */
ydn.db.Html5Db.isSupported = function() {
  return !!window.localStorage;
};


/**
 * @protected
 * @param {string} id id.
 * @param {string=} opt_table table name.
 * @return {string}
 */
ydn.db.Html5Db.prototype.getKey = function(id, opt_table) {
  opt_table = opt_table || ydn.db.Storage.DEFAULT_TEXT_STORE;
  return '_database_' + this.dbname + '-' + opt_table + '-' + id;
};


/**
 *
 */
ydn.db.Html5Db.prototype.setItem = function(key, value) {
  window.localStorage.setItem(this.getKey(key), value);
  return goog.async.Deferred.succeed(true);
};


/**
 * @see put
 * @param {string} table table name.
 * @param {Object|Array} value object to put.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Html5Db.prototype.put = function(table, value) {
  var key = this.getKey(value[this.schema[table].keyPath], table);
  var value_str = ydn.json.stringify(value);
  window.localStorage.setItem(key, value_str);
  return goog.async.Deferred.succeed(true);
};


/**
 *
 */
ydn.db.Html5Db.prototype.getItem = function(key) {
  var value = window.localStorage.getItem(this.getKey(key));
  return goog.async.Deferred.succeed(value);
};


/**
 * @inheritDoc
 */
ydn.db.Html5Db.prototype.get = function(table, key) {

  var value = window.localStorage.getItem(this.getKey(key, table));
  return goog.async.Deferred.succeed(ydn.json.parse(
      /** @type {string} */ (value)));
};


/**
 * Delete a store (table) or all.
 * @param {string=} opt_table delete a specific table. if not specified delete
 * all tables.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Html5Db.prototype.clear = function(opt_table) {
  var tables_to_clear = goog.isDef(opt_table) ?
      goog.object.create(opt_table) : this.schema;

  for (var key in window.localStorage) {
    for (var table in tables_to_clear) {
      if (goog.string.startsWith(key, '_database_' + this.dbname + '-' + table)) {
        delete window.localStorage[key];
      }
    }
  }
  return goog.async.Deferred.succeed(true);
};


/**
 * Get number of items stored.
 * @param {string=} opt_table table name, default to
 * {@link ydn.db.Storage.DEFAULT_TEXT_STORE}.
 * @return {!goog.async.Deferred} return number of items in deferred function.
 */
ydn.db.Html5Db.prototype.getCount = function(opt_table) {
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
