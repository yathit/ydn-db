/**
 * @license Copyright 2012 YDN Authors. All Rights Reserved.
 */
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
 * @fileoverview Provide thread safe database operations.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Storage');
goog.require('goog.userAgent.product');
goog.require('ydn.async');
goog.require('ydn.object');
if (ydn.db.ENABLE_ENCRYPTION) {
  goog.require('ydn.db.RichStorage_');
}
goog.require('ydn.db.tr.Storage');
goog.require('ydn.db.TxStorage');
goog.require('ydn.db.IStorage');
goog.require('ydn.db.io.Query');
goog.require('ydn.db.io.Key');
goog.require('ydn.db.io.QueryService');
goog.require('ydn.db.io.QueryServiceProvider');


/**
 * Create a suitable storage mechanism from indexdb, to websql to
 * localStorage.
 *
 * If database name and schema are provided, this will immediately initialize
 * the database and ready to use. However if any of these two are missing,
 * the database is not initialize until they are set by calling
 * {@link #setName} and {@link #setSchema}.
 * @see goog.db Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {(!ydn.db.DatabaseSchema|!DatabaseSchema)=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * @param {!StorageOptions=} opt_options options.
 * @implements {ydn.db.io.QueryService}
 * @extends {ydn.db.tr.Storage}
 * @constructor *
 */
ydn.db.Storage = function (opt_dbname, opt_schema, opt_options) {

  goog.base(this, opt_dbname, opt_schema, opt_options);

  this.default_tx_queue_ = this.newTxInstance('base');

};
goog.inherits(ydn.db.Storage, ydn.db.tr.Storage);

//
///**
// * Initialize suitable database if {@code dbname} and {@code schema} are set,
// * starting in the following order of preference.
// * @override
// */
//ydn.db.Storage.prototype.initDatabase = function () {
//  // handle version change
//  if (goog.isDef(this.schema) &&
//    (ydn.db.ENABLE_DEFAULT_TEXT_STORE &&
//      !this.schema.hasStore(ydn.db.StoreSchema.DEFAULT_TEXT_STORE))) {
//    this.schema.addStore(new ydn.db.StoreSchema(
//      ydn.db.StoreSchema.DEFAULT_TEXT_STORE, 'id'));
//  }
//  goog.base(this, 'initDatabase');
//};


/**
 * @override
 */
ydn.db.Storage.prototype.init = function() {

  goog.base(this, 'init');

};


/**
 * @protected
 * @param {string} scope_name
 * @return {!ydn.db.tr.TxStorage}
 */
ydn.db.Storage.prototype.newTxInstance = function(scope_name) {
  return new ydn.db.TxStorage(this, this.ptx_no++, scope_name, this.schema);
};


/**
 *
 * @param {string} secret
 * @param {number=} opt_expiration default expiration time in miliseconds.
 */
ydn.db.Storage.prototype.encrypt = function(secret, opt_expiration) {
  if (ydn.db.ENABLE_ENCRYPTION) {
    /**
     * @protected
     * @final
     * @type {ydn.db.RichStorage}
     */
    this.wrapper = new ydn.db.RichStorage(this, secret, opt_expiration);
  }
};


/**
 *
 * @return {ydn.db.RichStorage}
 */
ydn.db.Storage.prototype.getWrapper = function() {
  return this.wrapper || null;
};


/**
 *
 * @return {number}
 */
ydn.db.Storage.prototype.getTxNo = function() {
  return this.default_tx_queue_.getTxNo();
};


/**
 *
 * @param {string} store_name
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Storage.prototype.count = function(store_name) {
  return this.default_tx_queue_.count(store_name);
};


/**
 * Return object
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(string|number|!Array.<string>)=} arg2 object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Storage.prototype.get = function (arg1, arg2) {
  return this.default_tx_queue_.get(arg1, arg2);
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.put = function(store, value, opt_key) {
  return this.default_tx_queue_.put(store, value, opt_key);
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.clear = function(arg1, arg2) {
  return this.default_tx_queue_.clear(arg1, arg2);
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.fetch = function(q, max, skip) {
  return this.default_tx_queue_.fetch(q, max, skip);
};


ydn.db.Storage.prototype.query = function(store, index, direction, keyRange, upper, lowerOpen, upperOpen) {
  return this.default_tx_queue_.query(store, index, direction, keyRange, upper, lowerOpen, upperOpen);
};


ydn.db.Storage.prototype.key = function(store_or_json_or_value, id, opt_parent) {
  return this.default_tx_queue_.key(store_or_json_or_value, id, opt_parent);
};

/**
 * Retrieve a value from default key-value store.
 *
 * Note: This will not raise error to get non-existing object.
 * @export
 * @param {string} key The key to get.
 * @return {!goog.async.Deferred} return resulting object in deferred function.
 * If not found, {@code undefined} is return.
 */
ydn.db.Storage.prototype.getItem = function(key) {
  return this.default_tx_queue_.getItem(key);
};


/**
 * Store a value to default key-value store.
 * @export
 * @param {string} key The key to set.
 * @param {string} value The value to save.
 * @param {number=} opt_expiration The number of miliseconds since epoch
 *     (as in goog.now()) when the value is to expire. If the expiration
 *     time is not provided, the value will persist as long as possible.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Storage.prototype.setItem = function(key, value, opt_expiration) {
  return this.default_tx_queue_.setItem(key, value, opt_expiration);
};


/**
 * Remove an item to default key-value store.
 * @export
 * @param {string} id item id to be remove.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Storage.prototype.removeItem = function(id) {
  return this.default_tx_queue_.removeItem(id);
};


/** @override */
ydn.db.Storage.prototype.toString = function() {
  var s = 'Storage:' + this.getName();
  if (goog.DEBUG) {
    return s + ':' + this.default_tx_queue_.getTxNo();
  }
  return s;
};

