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

goog.provide('ydn.db.MemoryService');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.Timer');
goog.require('ydn.db.Key');
goog.require('ydn.db.CoreService');


/**
 * @implements {ydn.db.CoreService}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @param {Object=} opt_localStorage
 * @constructor
 */
ydn.db.MemoryService = function(dbname, schema, opt_localStorage) {

  /**
   * @final
   * @type {Object}
   * @private
   */
  this.cache_ = opt_localStorage || ydn.db.MemoryService.getFakeLocalStorage();

  /**
   * @final
   * @type {string}
   */
  this.dbname = dbname;

  /**
   * @protected
   * @final
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = schema; // we always use the last schema.

};


/**
 *
 * @return {Object} return memory store object.
 */
ydn.db.MemoryService.getFakeLocalStorage = function() {

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
ydn.db.MemoryService.isSupported = function() {
  return true;
};


ydn.db.MemoryService.prototype.getDb_ = function() {
  return this.cache_;
};


/**
 *
 */
ydn.db.MemoryService.prototype.getDbInstance = function() {
  return this.cache_ || null;
};


/**
 * @protected
 * @param {string} old_version old version.
 */
ydn.db.MemoryService.prototype.migrate = function(old_version) {

};


/**
 * Column name of key, if keyPath is not specified.
 * @const {string}
 */
ydn.db.MemoryService.DEFAULT_KEY_PATH = '_id_';


/**
 * @protected
 * @param {ydn.db.StoreSchema} store table name.
 * @param {!Object} value object having key in keyPath field.
 * @return {string|number} canonical key name.
 */
ydn.db.MemoryService.prototype.extractKey = function (store, value) {
  var key;
  // we don't need to check, because this function is not used by user.
  goog.asserts.assertObject(value, 'id or object must be defined.');
  if (goog.isDef(store.keyPath)) {
    key = store.getKey(value);
  }
  if (!goog.isDefAndNotNull(key)) {
    key = store.generateKey();
  }
  return key;
};


/**
 * @protected
 * @param {string|number} id id.
 * @param {ydn.db.StoreSchema|string} store table name.
 * @return {string} canonical key name.
 */
ydn.db.MemoryService.prototype.getKey = function(id, store) {
  var store_name = store instanceof ydn.db.StoreSchema ? store.name : store;
  return '_database_' + this.dbname + '-' + store_name + '-' + id;
};


/**
 *
 * @define {boolean} use sync result.
 */
ydn.db.MemoryService.SYNC = false;


/**
 * @protected
 * @param {*} value
 * @return {!goog.async.Deferred} return callback with given value in async.
 */
ydn.db.MemoryService.succeed = function(value) {

  var df = new goog.async.Deferred();

  if (ydn.db.MemoryService.SYNC) {
    df.callback(value);
  } else {
    goog.Timer.callOnce(function() {
      df.callback(value);
    }, 0);
  }

  return df;
};



/**
 * @return {string}
 */
ydn.db.MemoryService.prototype.type = function() {
  return 'memory';
};


/**
 * @inheritDoc
 */
ydn.db.MemoryService.prototype.close = function () {
  return ydn.db.MemoryService.succeed(true);
};


/**
 * @final
 */
ydn.db.MemoryService.prototype.transaction = function(trFn, scopes, mode) {
  trFn(this.cache_);
};