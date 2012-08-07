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
goog.require('ydn.db.DatabaseSchema');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Query');



/**
 * @interface
 * @param {string} dbname name of database.
 * @param {ydn.db.DatabaseSchema} schema table schema contain table name and keyPath.
 */
ydn.db.Db = function(dbname, schema) {};


/**
 * @see put
 * @param {string} table table name.
 * @param {Object|Array} value object to put.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Db.prototype.put = function(table, value) {

};


/**
 * Return object
 * @param {string} table table name.
 * @param {string} key key.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Db.prototype.get = function(table, key) {

};


/**
 * Get number of items stored.
 * @param {string=} opt_table table name, default to
 * {@link ydn.db.Storage.DEFAULT_TEXT_STORE}.
 * @return {!goog.async.Deferred} return number of items in deferred function.
 */
ydn.db.Db.prototype.getCount = function(opt_table) {

};


/**
 * Remove all data in a store (table).
 * @param {string} opt_table delete a specific table.
 * all tables.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.clear = function(opt_table) {

};


/**
 * Delete the database.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.delete = function() {

};


/**
 * Fetch result of a query
 * @param {ydn.db.Query} q query.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.fetch = function(q) {

};

