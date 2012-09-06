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
goog.require('ydn.db.ActiveKey');
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
 * @param {IDBTransaction|SQLTransaction} tx
 * @param {string} store store name.
 * @param {string|number} id object key.
 * @return {!goog.async.Deferred}
 */
ydn.db.tr.Db.prototype.getInTransaction = function(tx, store, id) {};


/**
 * Get object in the store in a transaction. This return requested object
 * immediately.
 *
 * This method must be {@link #runInTransaction}.
 * @param {IDBTransaction|SQLTransaction} tx
 * @param {string} store store name.
 * @param {string|number} id object key.
 * @return {!goog.async.Deferred}
 */
ydn.db.tr.Db.prototype.clearInTransaction = function(tx, store, id) {};


/**
 * Put the object in the store in a transaction.
 *
 * This method must be {@link #runInTransaction}.
 * @param {IDBTransaction|SQLTransaction} tx
 * @param {string} store store name.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred}
 */
ydn.db.tr.Db.prototype.putInTransaction = function(tx, store, value) {};



/**
 *
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} scopes list of store names involved in the
 * transaction.
 * @param {number|string} mode mode, default to 'read_write'.
 * @param {!Array.<!ydn.db.tr.Key>} keys list of keys involved in the
 * transaction.
 * @return {!goog.async.Deferred} d result in deferred function.
 */
ydn.db.tr.Db.prototype.transaction = function(trFn, scopes, mode, keys) {};


/**
 * @extends {ydn.db.ActiveKey}
 * @param {!ydn.db.QueryServiceProvider} dbp
 * @param {string} store
 * @param {(string|number)}id
 * @param {ydn.db.Key=} opt_parent
 * @constructor
 */
ydn.db.tr.Key = function(dbp, store, id, opt_parent) {
  goog.base(this, dbp, store, id, opt_parent);


  /**
   * Inject the transaction instance during transaction.
   * @protected
   * @type {IDBTransaction|SQLTransaction}
   */
  this.tx;

};
goog.inherits(ydn.db.tr.Key, ydn.db.ActiveKey);


/**
 *
 * @param {IDBTransaction|SQLTransaction|null} tx
 */
ydn.db.tr.Key.prototype.setTx = function(tx) {
  this.tx = tx;
  if (this.parent) {
    this.parent.setTx(tx);
  }
};


/**
 * Get object in the store in a transaction.
 * @override
 * @return {!goog.async.Deferred}
 */
ydn.db.tr.Key.prototype.get = function() {
  goog.asserts.assertObject(this.tx, this + ' must be runInTransaction');
  return this.dbp.getDb().getInTransaction(this.tx, this.store_name, this.id);
};


/**
 * Get object in the store in a transaction.
 * @override
 * @param {!Object|!Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function. On error,
 * an {@code Error} object is return as received from the mechanism.
 */
ydn.db.tr.Key.prototype.put = function(value) {
  goog.asserts.assertObject(this.tx, this + ' must be runInTransaction');
  return this.dbp.getDb().putInTransaction(this.tx, this.store_name, value);
};

/**
 * Clear object in the store in a transaction.
 * @override
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.tr.Key.prototype.clear = function() {
  goog.asserts.assertObject(this.tx, this + ' must be runInTransaction');
  return this.dbp.getDb().clearInTransaction(this.tx, this.store_name, this.id);
};
