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
goog.provide('ydn.db.schema.fulltext.ScoreEntry');



/**
 * @interface
 */
ydn.db.schema.fulltext.ScoreEntry = function() {};



/**
 * @interface
 */
ydn.db.schema.fulltext.ResultSet = function() {};


/**
 * Get next lookup.
 * @param {function(string, string, (IDBKey|ydn.db.KeyRange),
 * ydn.db.schema.fulltext.ScoreEntry)} cb callback for next query.
 */
ydn.db.schema.fulltext.ResultSet.prototype.nextLookup = function(cb) {};


/**
 * Return result from lookup.
 * @param {ydn.db.schema.fulltext.ScoreEntry} query
 * @param {Array} results
 */
ydn.db.schema.fulltext.ResultSet.prototype.addResult =
    function(query, results) {};



/**
 * @interface
 */
ydn.db.schema.fulltext.Engine = function() {};


/**
 * @param {string} text text to be prase and scored.
 * @param {ydn.db.schema.FullTextSource} source
 * @return {Array.<ydn.db.schema.fulltext.ScoreEntry>} scores for each unique token.
 */
ydn.db.schema.fulltext.Engine.prototype.score = function(text, source) {};


/**
 * Rank search result.
 * @param {!ydn.db.Request} req
 * @param {ydn.db.schema.fulltext.ResultSet} result
 * @return {!ydn.db.Request}
 */
ydn.db.schema.fulltext.Engine.prototype.rank = function(req, result) {};
