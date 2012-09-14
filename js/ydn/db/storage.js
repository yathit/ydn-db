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
goog.require('ydn.db.RichStorage_');
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
 * @param {!ydn.db.DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * @param {!Object=} opt_options options.
 * @implements {ydn.db.io.QueryService}
 * @extends {ydn.db.tr.Storage}
 * @constructor *
 */
ydn.db.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);

  this.default_tx_queue_ = this.newTxInstance('base');
};
goog.inherits(ydn.db.Storage, ydn.db.tr.Storage);


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * @override
 */
ydn.db.Storage.prototype.initDatabase = function () {
  // handle version change
  if (goog.isDef(this.schema) &&
    (!goog.string.isEmpty(ydn.db.IStorage.DEFAULT_TEXT_STORE) &&
      !this.schema.hasStore(ydn.db.IStorage.DEFAULT_TEXT_STORE))) {
    this.schema.addStore(new ydn.db.StoreSchema(
      ydn.db.IStorage.DEFAULT_TEXT_STORE, 'id'));
  }
  goog.base(this, 'initDatabase');
};


/**
 * @override
 */
ydn.db.Storage.prototype.init = function() {

  goog.base(this, 'init');
};


ydn.db.Storage.prototype.default_tx_queue_ = null;


/**
 * @protected
 * @param {string} scope_name
 * @return {!ydn.db.tr.TxStorage}
 */
ydn.db.Storage.prototype.newTxInstance = function(scope_name) {
  return new ydn.db.TxStorage(this, this.ptx_no++, scope_name);
};



/**
 *
 * @param {string} secret
 * @param {number=} opt_expiration default expiration time in miliseconds.
 */
ydn.db.Storage.prototype.encrypt = function(secret, opt_expiration) {
  /**
   * @protected
   * @final
   * @type {ydn.db.RichStorage}
   */
  this.wrapper = new ydn.db.RichStorage(this, secret, opt_expiration);
};


/**
 *
 * @return {ydn.db.RichStorage}
 */
ydn.db.Storage.prototype.getWrapper = function() {
  return this.wrapper;
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



ydn.db.Storage.prototype.query = function(q, max, skip) {
  return this.default_tx_queue_.query(q, max, skip);
};



ydn.db.Storage.prototype.key = function(q, max, skip) {
  return this.default_tx_queue_.key(q, max, skip);
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
  var s = 'ydn.db.Storage:' + this.getName();
  if (goog.DEBUG) {
    return s + ':' + this.default_tx_queue_.getTxNo();
  }
  return s;
};



goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);
goog.exportProperty(goog.async.Deferred.prototype, 'success',
  goog.async.Deferred.prototype.addCallback);
goog.exportProperty(goog.async.Deferred.prototype, 'error',
  goog.async.Deferred.prototype.addErrback);

//goog.exportProperty(ydn.db.core.Storage.prototype, 'isReady',
//  ydn.db.core.Storage.prototype.isReady);
goog.exportProperty(ydn.db.core.Storage.prototype, 'type',
  ydn.db.core.Storage.prototype.type);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setSchema',
  ydn.db.core.Storage.prototype.setSchema);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setName',
  ydn.db.core.Storage.prototype.setName);
goog.exportProperty(ydn.db.core.Storage.prototype, 'getConfig',
  ydn.db.core.Storage.prototype.getConfig);
// ActiveQuery do not need fetch, it is confusing if fetch in db.
//goog.exportProperty(ydn.db.core.Storage.prototype, 'fetch',
//  ydn.db.core.Storage.prototype.fetch);
goog.exportProperty(ydn.db.core.Storage.prototype, 'transaction',
  ydn.db.core.Storage.prototype.transaction);
goog.exportProperty(ydn.db.core.Storage.prototype, 'close',
  ydn.db.core.Storage.prototype.close);
// for hacker


//goog.exportProperty(ydn.db.Storage.prototype, 'query',
//  ydn.db.Storage.prototype.query);
//goog.exportProperty(ydn.db.Storage.prototype, 'key',
//  ydn.db.Storage.prototype.key);
goog.exportProperty(ydn.db.Storage.prototype, 'encrypt',
  ydn.db.Storage.prototype.encrypt);

//goog.exportProperty(ydn.db.io.Query.prototype, 'fetch',
//  ydn.db.io.Query.prototype.fetch);
//goog.exportProperty(ydn.db.io.Query.prototype, 'get',
//  ydn.db.io.Query.prototype.get);

goog.exportProperty(ydn.db.Query.prototype, 'select',
    ydn.db.Query.prototype.select);
goog.exportProperty(ydn.db.Query.prototype, 'where',
  ydn.db.Query.prototype.where);
goog.exportProperty(ydn.db.Query.prototype, 'sum',
    ydn.db.Query.prototype.sum);
goog.exportProperty(ydn.db.Query.prototype, 'count',
    ydn.db.Query.prototype.count);
goog.exportProperty(ydn.db.Query.prototype, 'average',
    ydn.db.Query.prototype.average);

//goog.exportProperty(ydn.db.ActiveKey.prototype, 'clear',
//  ydn.db.ActiveKey.prototype.clear);

goog.exportProperty(ydn.db.KeyRange, 'bound',
  ydn.db.KeyRange.bound);
goog.exportProperty(ydn.db.KeyRange, 'upperBound',
  ydn.db.KeyRange.upperBound);
goog.exportProperty(ydn.db.KeyRange, 'lowerBound',
  ydn.db.KeyRange.lowerBound);
goog.exportProperty(ydn.db.KeyRange, 'only',
  ydn.db.KeyRange.only);

goog.exportSymbol('ydn.async', ydn.async);
goog.exportProperty(ydn.async, 'dfl', ydn.async.dfl);

goog.exportSymbol('ydn.db.Key', ydn.db.Key);
goog.exportProperty(ydn.db.Key.prototype, 'parent', ydn.db.Key.prototype.parent);
