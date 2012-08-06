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
 * Store field data type following Web Sql definition.
 * @see http://www.sqlite.org/lang_expr.html
 * @enum {string}
 */
ydn.db.Db.DataType = {
  TEXT: 'TEXT',
  NUMERIC: 'REAL',
  INTEGER: 'INTEGER'
};


/**
 * Table schema following IndexedDB definition. In WebSql, a table is created
 * with the indexeded field. Non-indexed value are stored in stringified string.
 * @typedef {{name: string, type: ydn.db.Db.DataType, unique: boolean}}
 */
ydn.db.Db.IndexSchema;


/**
 * Table schema following IndexedDB definition.
 * @typedef {{name: string, keyPath: string, indexes: Array.<ydn.db.Db.IndexSchema>}}
 */
ydn.db.Db.TableSchema;


/**
 * @typedef {Array.<ydn.db.Db.TableSchema>}
 */
ydn.db.Db.DatabaseSchema;


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
