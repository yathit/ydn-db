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
 * @fileoverview Interface for transactional database.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.tr.Db');
goog.provide('ydn.db.tr.Key');
goog.require('ydn.db.Db');
goog.require('ydn.db.Key');


/**
 * @extends {ydn.db.Db}
 * @constructor
 */
ydn.db.tr.Db = function() {};


/**
 * Get object in the store in a transaction. This return requested object
 * immediately.
 *
 * This method must be {@link #runInTransaction}.
 * @param {string} store store name.
 * @param {string|number} id object key.
 * @return {function(Object)} callback return object in the callback,
 * null if not found. Transaction will abort on error.
 */
ydn.db.tr.Db.prototype.getInTransaction = function(store, id, callback) {};


/**
 * Put the object in the store in a transaction.
 *
 * This method must be {@link #runInTransaction}.
 * @param {string} store store name.
 * @param {!Object} value object to put.
 * @param {function(boolean)} opt_callback return true after successful put.
 */
ydn.db.tr.Db.prototype.putInTransaction = function(store, value, opt_callback)
{};



/**
 *
 * @param {Function} trFn function that invoke in the transaction.
 * @param {Array.<ydn.db.tr.Key> } keys list of keys involved in the transaction.
 */
ydn.db.tr.Db.prototype.runInTransaction = function(trFn, keys) {};


/**
 * @extends {ydn.db.Key}
 * @constructor
 */
ydn.db.tr.Key = function(var_args) {
  goog.base(this, arguments);

  /**
   * Database instance injected during transaction.
   * @type {ydn.db.tr.Db}
   */
  this.db;
};


/**
 * Get object in the store in a transaction.
 * @return {Object}
 */
ydn.db.tr.Key.prototype.get = function(callback) {
  goog.asserts.assertObject(this.db, 'This must be runInTransaction');
  this.db.getInTransaction(this.store_name, this.id, callback);
};


/**
 * Get object in the store in a transaction.
 * @param {Object} value
 */
ydn.db.tr.Key.prototype.put = function(value) {
  goog.asserts.assertObject(this.db, 'This must be runInTransaction');
  this.db.putInTransaction(this.store_name, value);
};
