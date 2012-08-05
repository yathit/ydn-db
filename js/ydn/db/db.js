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
goog.require('ydn.db.Query');



/**
 * @interface
 */
ydn.db.Db = function() {};


/**
 * @define {string} default key-value (store) table name.
 */
ydn.db.Db.DEFAULT_TEXT_STORE = 'default_text_store';


/**
 *
 *
 * @param {string} key key.
 * @param {string} value value.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Db.prototype.setItem = function(key, value) {

};


/**
 * @see put
 * @param {string} table table name.
 * @param {Object|Array} value object to put.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Db.prototype.putObject = function(table, value) {

};


/**
 * Return string
 * @param {string} key key.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Db.prototype.getItem = function(key) {

};


/**
 * Return object
 * @param {string} table table name.
 * @param {string} key key.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Db.prototype.getObject = function(table, key) {

};


/**
 * Get number of items stored.
 * @param {string=} opt_table table name, default to
 * {@link ydn.db.Db.DEFAULT_TEXT_STORE}.
 * @return {!goog.async.Deferred} return number of items in deferred function.
 */
ydn.db.Db.prototype.getCount = function(opt_table) {

};


/**
 * Delete a store (table) or all.
 * @param {string=} opt_table delete a specific table. if not specified delete
 * all tables.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.clear = function(opt_table) {

};


/**
 * Fetch result of a query
 * @param {ydn.db.Query} q query.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.fetch = function(q) {

};
