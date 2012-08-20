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
goog.require('goog.async.Deferred');
goog.require('ydn.db.DatabaseSchema');
goog.require('ydn.db.Query');
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
 * @interface
 */
ydn.db.Db = function() {};


/**
 * @param {string} store table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.Db.prototype.put = function(store, value) {

};


/**
 * Return object
 * @param {string|!ydn.db.Query|!ydn.db.Key} store table name.
 * @param {(string|number)=} id object key to be retrieved, if not provided,
 * all entries in the store will return.
 * param {number=} start start number of entry.
 * param {number=} limit maximun number of entries.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Db.prototype.get = function(store, id) {

};

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
 * Remove a specific entry from a store or all.
 * @param {string=} opt_table delete the table as provided otherwise
 * delete all stores.
 * @param {string=} opt_key delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.clear = function(opt_table, opt_key) {

};


/**
 * Fetch result of a query
 * @param {!ydn.db.Query} q query.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.fetch = function(q) {

};


/**
 * Close the connection.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.close = function() {

};


