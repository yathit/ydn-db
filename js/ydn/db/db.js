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

goog.provide('ydn.db.Db');
goog.require('goog.async.Deferred');
goog.require('ydn.db.DatabaseSchema');
goog.require('ydn.db.Query');



/**
 * @interface
 */
ydn.db.Db = function() {};


/**
 * @see put
 * @param {string} table table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Db.prototype.put = function(table, value) {

};


/**
 * Return object
 * @param {string} table table name.
 * @param {string=} key object key to be retrieved, if not provided, all entries
 * in the store will return.
 * param {number=} start start number of entry.
 * param {number=} limit maximun number of entries.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Db.prototype.get = function(table, key) {

};


/**
 * Get number of items stored.
 * @param {string=} opt_table table name, if not provided, count all entries.
 * @return {!goog.async.Deferred} return number of items in deferred function.
 */
ydn.db.Db.prototype.count = function(opt_table) {

};


/**
 * Remove all data in the store (table).
 * @param {string=} opt_table delete the table as provided otherwise
 * delete all stores.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.clear = function(opt_table) {

};


/**
 * Delete the database, store or an entry.
 *
 * Note: I wish this method be named 'delete' but closure compiler complain
 * or sometimes problem with exporting 'delete' as method name.
 * @param {string=} opt_store delete a specific store.
 * @param {string=} opt_id delete a specific row.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.remove = function(opt_store, opt_id) {

};


/**
 * Fetch result of a query
 * @param {ydn.db.Query} q query.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.fetch = function(q) {

};

