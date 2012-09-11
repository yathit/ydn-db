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

goog.provide('ydn.db.adapter.SimpleStorage');
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
ydn.db.adapter.SimpleStorage = function(dbname, schema, opt_localStorage) {

  /**
   * @final
   * @type {!Object}
   * @protected // should be private ?
   */
  this.cache_ = opt_localStorage || ydn.db.adapter.SimpleStorage.getFakeLocalStorage();

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
 * @const
 * @type {string}
 */
ydn.db.adapter.SimpleStorage.TYPE = 'memory';


/**
 *
 * @return {!Object} return memory store object.
 */
ydn.db.adapter.SimpleStorage.getFakeLocalStorage = function() {

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
ydn.db.adapter.SimpleStorage.isSupported = function() {
  return true;
};


ydn.db.adapter.SimpleStorage.prototype.getDb_ = function() {
  return this.cache_;
};


/**
 *
 */
ydn.db.adapter.SimpleStorage.prototype.getDbInstance = function() {
  return this.cache_ || null;
};


/**
 * @protected
 * @param {string} old_version old version.
 */
ydn.db.adapter.SimpleStorage.prototype.migrate = function(old_version) {

};


/**
 * Column name of key, if keyPath is not specified.
 * @const {string}
 */
ydn.db.adapter.SimpleStorage.DEFAULT_KEY_PATH = '_id_';




/**
 * @final
 * @protected
 * @param {string} store_name table name.
 * @param {!Object} value object having key in keyPath field.
 * @return {string|number} canonical key name.
 */
ydn.db.adapter.SimpleStorage.prototype.extractKey = function (store_name, value) {
  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store, 'store: ' + store_name + ' not found.');
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
 * @final
 * @protected
 * @param {string|number} id id.
 * @param {ydn.db.StoreSchema|string} store table name.
 * @return {string} canonical key name.
 */
ydn.db.adapter.SimpleStorage.prototype.getKey = function(id, store) {
  var store_name = store instanceof ydn.db.StoreSchema ? store.name : store;
  return '_database_' + this.dbname + '-' + store_name + '-' + id;
};


/**
 *
 * @define {boolean} use sync result.
 */
ydn.db.adapter.SimpleStorage.SYNC = false;


/**
 * @protected
 * @param {*} value
 * @return {!goog.async.Deferred} return callback with given value in async.
 */
ydn.db.adapter.SimpleStorage.succeed = function(value) {

  var df = new goog.async.Deferred();

  if (ydn.db.adapter.SimpleStorage.SYNC) {
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
ydn.db.adapter.SimpleStorage.prototype.type = function() {
  return 'memory';
};


/**
 * @inheritDoc
 */
ydn.db.adapter.SimpleStorage.prototype.close = function () {
  return ydn.db.adapter.SimpleStorage.succeed(true);
};




/**
 * @final
 */
ydn.db.adapter.SimpleStorage.prototype.doTransaction = function(trFn, scopes, mode) {
  trFn(this.cache_);
};



/**
 * @protected
 * @final
 * @param {string} store_name table name.
 * @param {(string|number)} id id.
 * @return {string} canonical key name.
 */
ydn.db.adapter.SimpleStorage.prototype.makeKey = function(store_name, id) {
  return '_database_' + this.dbname + '-' + store_name + '-' + id;
};



/**
 *
 * @param {string} store_name or key
 * @param {(string|number)} id
 * @return {*}
 * @protected
 * @final
 */
ydn.db.adapter.SimpleStorage.prototype.getItemInternal = function(store_name, id) {
  var key = this.makeKey(store_name, id);
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
 * @param {*} value
 * @param {string} store_name_or_key
 * @param {(string|number)=} id
 * @protected
 * @final
 */
ydn.db.adapter.SimpleStorage.prototype.setItemInternal = function(value, store_name_or_key, id) {
  var key = goog.isDef(id) ? this.makeKey(store_name_or_key, id) : store_name_or_key;
  this.cache_.setItem(key, value);
};


/**
 *
 * @param {string} store_name_or_key
 * @param {(string|number)=} id
 * @protected
 * @final
 */
ydn.db.adapter.SimpleStorage.prototype.removeItemInternal = function(store_name_or_key, id) {
  var key = goog.isDef(id) ? this.makeKey(store_name_or_key, id) : store_name_or_key;
  this.cache_.removeItem(key);
};