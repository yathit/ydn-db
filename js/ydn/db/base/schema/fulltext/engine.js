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
 * @fileoverview Interface for full text serach engine.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.schema.fulltext.Engine');
goog.provide('ydn.db.schema.fulltext.ResultSet');
goog.require('ydn.db.schema.fulltext.Entry');



/**
 * @interface
 */
ydn.db.schema.fulltext.ResultSet = function() {};


/**
 * Next database lookup.
 * @param {function(string, string, ydn.db.KeyRange,
 * ydn.db.schema.fulltext.Entry)} cb callback for next query.
 */
ydn.db.schema.fulltext.ResultSet.prototype.nextLookup = function(cb) {};


/**
 * Return result from lookup.
 * @param {ydn.db.schema.fulltext.Entry} query
 * @param {Array} results
 */
ydn.db.schema.fulltext.ResultSet.prototype.addResult =
    function(query, results) {};



/**
 * @interface
 */
ydn.db.schema.fulltext.Engine = function() {};


/**
 * Free text query.
 * @param {string} catalog_name
 * @param {string} query
 * @param {number=} opt_limit
 * @param {number=} opt_threshold
 * @return {ydn.db.text.ResultSet}
 */
ydn.db.schema.fulltext.Engine.prototype.query = function(catalog_name, query,
   opt_limit, opt_threshold) {};


/**
 * Analyze an indexing value.
 * @param {string} store_name the store name in which document belong.
 * @param {IDBKey} key primary of the document.
 * @param {!Object} obj the document to be indexed.
 * @return {Array.<ydn.db.text.QueryEntry>} score for each token.
 */
ydn.db.schema.fulltext.Engine.prototype.analyze = function(
    store_name, key, obj) {};
