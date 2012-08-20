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
goog.require('goog.async.Deferred');


/**
 * @extends {ydn.db.Db}
 * @interface
 */
ydn.db.tr.Db = function() {};


/**
 * Get object in the store in a transaction. This return requested object
 * immediately.
 *
 * This method must be {@link #runInTransaction}.
 * @param {string} store store name.
 * @param {string|number} id object key.
 * @return {!goog.async.Deferred}
 */
ydn.db.tr.Db.prototype.getInTransaction = function(store, id) {};


/**
 * Put the object in the store in a transaction.
 *
 * This method must be {@link #runInTransaction}.
 * @param {string} store store name.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred}
 */
ydn.db.tr.Db.prototype.putInTransaction = function(store, value) {};



/**
 *
 * @param {Function} trFn function that invoke in the transaction.
 * @param {Array.<ydn.db.tr.Key> } keys list of keys involved in the transaction.
 */
ydn.db.tr.Db.prototype.runInTransaction = function(trFn, keys) {};


/**
 * @extends {ydn.db.Key}
 * @param {string} store
 * @param {(string|number)}id
 * @param {ydn.db.Key=} opt_parent
 * @constructor
 */
ydn.db.tr.Key = function(store, id, opt_parent) {
  goog.base(this, store, id, opt_parent);
};
goog.inherits(ydn.db.tr.Key, ydn.db.Key);


/**
 * Get object in the store in a transaction.
 * @override
 * @return {!goog.async.Deferred}
 */
ydn.db.tr.Key.prototype.get = function() {
  goog.asserts.assertObject(this.db, 'This must be runInTransaction');
  return this.db.getInTransaction(this.store_name, this.id);
};


/**
 * Get object in the store in a transaction.
 * @override
 * @param {!Object|!Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function. On error,
 * an {@code Error} object is return as received from the mechanism.
 */
ydn.db.tr.Key.prototype.put = function(value) {
  goog.asserts.assertObject(this.db, 'This must be runInTransaction');
  return this.db.putInTransaction(this.store_name, value);
};
