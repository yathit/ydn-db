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
 * @fileoverview Interface for database.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db');
goog.provide('ydn.db.Db');
goog.provide('ydn.db.Db.Transaction');
goog.require('goog.async.Deferred');
goog.require('ydn.db.DatabaseSchema');
goog.require('ydn.db.Query');
goog.require('ydn.db.QueryService');
goog.require('ydn.db.Key');



/**
 * Column name of key, if keyPath is not specified.
 * @const {string}
 */
ydn.db.DEFAULT_KEY_COLUMN = '_id_';


/**
 * Non-indexed field are store in this default field. There is always a column
 * in each table.
 * @const {string}
 */
ydn.db.DEFAULT_BLOB_COLUMN = '_default_';



/**
 * @extends {ydn.db.QueryService}
 * @interface
 */
ydn.db.Db = function() {};




//
///**
// * Retrieve an object from store.
// * @param {ydn.db.Key} key
// * @return {!goog.async.Deferred} return object in deferred function.
// */
//ydn.db.Db.prototype.getByKey = function(key) {
//
//};


/**
 * Get number of items stored.
 * @param {string=} opt_table table name, if not provided, count all entries.
 * @return {!goog.async.Deferred} return number of items in deferred function.
 */
ydn.db.Db.prototype.count = function(opt_table) {

};


/**
 * Close the connection.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.close = function() {

};




/**
 * Provide transaction object to subclass and keep a result.
 * This also serve as mutex on transaction.
 * @constructor
 */
ydn.db.Db.Transaction = function() {
  /**
   * @protected
   * @type {IDBTransaction|SQLTransaction}
   */
  this.transaction_ = null;

  /**
   * @protected
   * @type {*}
   */
  this.result_ = undefined;

  /**
   * @protected
   * @type {boolean}
   */
  this.has_error_ = false;
};


/**
 * Start a new transaction.
 * @protected
 * @param {!IDBTransaction|!SQLTransaction} tx the transaction object.
 */
ydn.db.Db.Transaction.prototype.up = function(tx) {

  this.transaction_ = tx;

  this.result_ = undefined;

  this.has_error_ = false;
};


/**
 * @protected
 */
ydn.db.Db.Transaction.prototype.down = function() {
  this.transaction_ = null;
};


/**
 * @return {boolean}
 */
ydn.db.Db.Transaction.prototype.isActive = function() {
  return !!this.transaction_;
};


/**
 * Push a result.
 * @param {*} result
 */
ydn.db.Db.Transaction.prototype.set = function(result) {
  this.result_ = result;
};

/**
 * Get a result.
 * @return {*} last result
 */
ydn.db.Db.Transaction.prototype.get = function() {
  return this.result_;
};



/**
 * Add an item to the last result. The last result must be array.
 * @param {*} item
 */
ydn.db.Db.Transaction.prototype.add = function(item) {
  if (!goog.isDef(this.result_)) {
    this.result_ = [];
  }
  goog.asserts.assertArray(this.result_);
  this.result_.push(item);
};


ydn.db.Db.Transaction.prototype.setError = function() {
  this.has_error_ = true;
};


/**
 *
 * @return {boolean}
 */
ydn.db.Db.Transaction.prototype.isSuccess = function() {
  return !this.has_error_;
};

/**
 *
 * @return {boolean}
 */
ydn.db.Db.Transaction.prototype.hasError = function() {
  return this.has_error_;
};