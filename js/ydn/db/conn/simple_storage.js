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

goog.provide('ydn.db.con.SimpleStorage');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.Timer');
goog.require('ydn.db.Key');
goog.require('ydn.db.con.IDatabase');


/**
 * @implements {ydn.db.con.IDatabase}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema=} schema table schema contain table
 * name and keyPath.
 * @param {Object=} opt_localStorage
 * @constructor
 */
ydn.db.con.SimpleStorage = function(dbname, schema, opt_localStorage) {

  /**
   * @final
   * @type {!Object}
   * @protected // should be private ?
   */
  this.cache_ = opt_localStorage || ydn.db.con.SimpleStorage.getFakeLocalStorage();

  /**
   * @final
   * @type {string}
   */
  this.dbname = dbname;

  /**
   * @protected
   * @final
   * @type {!ydn.db.DatabaseSchema|undefined}
   */
  this.schema = schema; // we always use the last schema.

};


/**
 * @const
 * @type {string}
 */
ydn.db.con.SimpleStorage.TYPE = 'memory';


/**
 *
 * @return {!Object} return memory store object.
 */
ydn.db.con.SimpleStorage.getFakeLocalStorage = function() {

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
ydn.db.con.SimpleStorage.isSupported = function() {
  return true;
};


ydn.db.con.SimpleStorage.prototype.getDb_ = function() {
  return this.cache_;
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.isReady = function() {
  return true;
};

/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.onReady = function(cb, eb) {
  cb(this);
};


/**
 *
 */
ydn.db.con.SimpleStorage.prototype.getDbInstance = function() {
  return this.cache_ || null;
};


/**
 * @protected
 * @param {string} old_version old version.
 */
ydn.db.con.SimpleStorage.prototype.doVersionChange = function(old_version) {

};


/**
 * Column name of key, if keyPath is not specified.
 * @const {string}
 */
ydn.db.con.SimpleStorage.DEFAULT_KEY_PATH = '_id_';



/**
 * @return {string}
 */
ydn.db.con.SimpleStorage.prototype.type = function() {
  return 'memory';
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.close = function () {

};




/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.doTransaction = function(trFn, scopes, mode, oncompleted) {
  trFn(this.cache_);
  oncompleted(ydn.db.base.TransactionEventTypes.COMPLETE, {});
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.addStoreSchema = function(tx, store_schema) {
  return goog.async.Deferred.succeed(true);
};

