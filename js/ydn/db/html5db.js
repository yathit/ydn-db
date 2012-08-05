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
goog.require('goog.storage.CollectableStorage');
goog.require('goog.storage.mechanism.mechanismfactory');



/**
 * @implements {ydn.db.Db}
 * @param {string} dbname dtabase name.
 * @param {Object=} opt_schema table schema contain table name and keyPath.
 * @param {string=} opt_version version, default to '1'.
 * @constructor
 */
ydn.db.Html5Db = function(dbname, opt_schema, opt_version) {
  this.version = opt_version || '1';
  dbname = dbname;
  this.dbname = dbname;
  this.schema = opt_schema || {};
  this.schema[ydn.db.Db.DEFAULT_TEXT_STORE] = {'keyPath': 'id'};

  /**
   *
   * @type {Object.<goog.storage.mechanism.IterableMechanism>}
   */
  this.mechanisms = {};
  /**
   *
   * @type {Object.<goog.storage.CollectableStorage>}
   */
  this.stores = {};
  this.is_ready = true;
  for (var tablename in this.schema) {
    if (this.schema.hasOwnProperty(tablename)) {
      var store_name = this.getStoreName(tablename);
      if (tablename == ydn.db.Db.DEFAULT_TEXT_STORE) {
        this.default_store = store_name;
      }
      this.mechanisms[store_name] =
          goog.storage.mechanism.mechanismfactory.create(store_name);
      if (this.mechanisms[store_name] instanceof
          goog.storage.mechanism.IterableMechanism) {
        this.stores[store_name] = new goog.storage.CollectableStorage(
            this.mechanisms[store_name]);
      } else {
        this.is_ready = false;
      }
    }
  }

};


/**
 *
 * @return {boolean} return true if ready.
 */
ydn.db.Html5Db.prototype.isReady = function() {
  return this.is_ready;
};


/**
 * localStorage do not have concept of database.
 * @protected
 * @param {string} table table name.
 * @return {string} table name in global scope of localStorage.
 */
ydn.db.Html5Db.prototype.getStoreName = function(table) {
  //return this.dbname + '_v' + this.version + '_' + table;
  return this.dbname + '_' + table;
};


/**
 * @inheritDoc
 */
ydn.db.Html5Db.prototype.put = function(key, value) {
  this.stores[this.default_store].set(key, value);
  return goog.async.Deferred.succeed(true);
};


/**
 * @see put
 * @param {string} table table name.
 * @param {Object|Array} value object to put.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Html5Db.prototype.putObject = function(table, value) {
  var key = value[this.schema[table].keyPath];
  var value_str = ydn.json.stringify(value);
  this.stores[this.getStoreName(table)].set(key, value_str);
  return goog.async.Deferred.succeed(true);
};


/**
 * @inheritDoc
 */
ydn.db.Html5Db.prototype.get = function(key) {
  var value = this.stores[this.default_store].get(key);
  return goog.async.Deferred.succeed(value);
};


/**
 * @inheritDoc
 */
ydn.db.Html5Db.prototype.getObject = function(table, key) {
  goog.asserts.assertObject(this.stores[this.getStoreName(table)], 'table: ' +
      table + ' not existed in ' + this.dbname);
  var value = this.stores[this.getStoreName(table)].get(key);
  return goog.async.Deferred.succeed(ydn.json.parse(
      /** @type {string} */ (value)));
};


/**
 * @inheritDoc
 */
ydn.db.Html5Db.prototype.clear = function() {
  for (var table in this.mechanisms) {
    this.mechanisms[table].clear();
  }
  return goog.async.Deferred.succeed(true);
};


/**
 * Get number of items stored.
 * @param {string=} opt_table table name, default to
 * {@link ydn.db.Db.DEFAULT_TEXT_STORE}.
 * @return {!goog.async.Deferred} return number of items in deferred function.
 */
ydn.db.Html5Db.prototype.getCount = function(opt_table) {
  var d = new goog.async.Deferred();
  opt_table = opt_table || ydn.db.Db.DEFAULT_TEXT_STORE;
  d.callback(this.mechanisms[this.getStoreName(opt_table)].getCount());
  return d;
};


/**
 * @inheritDoc
 */
ydn.db.Html5Db.prototype.fetch = function(q) {
  return goog.async.Deferred.fail(true);
};
