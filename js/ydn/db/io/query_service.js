/**
 * @fileoverview Interface for query service.
 *
 * Use interface so that query, key and database can strongly typed
 * cross-talking.
 */


goog.provide('ydn.db.io.QueryService');
goog.provide('ydn.db.io.QueryServiceProvider');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Query');
goog.require('ydn.db.Key');




/**
 * @interface
 */
ydn.db.tr.QueryService = function() {

};


/**
* @param {!ydn.db.Query} q query.
* @param {number=} limit
* @param {number=} offset
* @return {!goog.async.Deferred}
*/
ydn.db.tr.QueryService.prototype.fetch = function(q, limit, offset) {};



/**
 * Return object
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} store table name.
 * @param {(string|number|!Array.<string>)=} id object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.tr.QueryService.prototype.get = function(store, id) {

};


/**
 * @param {string} store table name.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {(string|number)=}  opt_key
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.tr.QueryService.prototype.put = function(store, value, opt_key) {

};


/**
 * Remove a specific entry from a store or all.
 * @param {string=} opt_table delete the table as provided otherwise
 * delete all stores.
 * @param {(string|number)=} opt_key delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.tr.QueryService.prototype.clear = function(opt_table, opt_key) {

};


/**
 *
 * @interface
 */
ydn.db.io.QueryServiceProvider = function() {};


/**
 * @param {function(!ydn.db.tr.QueryService)} callback
 */
ydn.db.io.QueryServiceProvider.prototype.isReady = function(callback) {};

