/**
 * @fileoverview Interface for query service.
 *
 * Use interface so that query, key and database can strongly typed
 * cross-talking.
 */


goog.provide('ydn.db.QueryService');
goog.provide('ydn.db.QueryServiceProvider');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Query');
goog.require('ydn.db.Key');




/**
 * @interface
 */
ydn.db.QueryService = function() {

};
//
//
///**
// * @param {!ydn.db.Query|!Array.<!ydn.db.Key>} q query.
// * @param {number=} limit
// * @param {number=} offset
// * @return {!goog.async.Deferred}
// */
//ydn.db.QueryService.prototype.fetch = function(q, limit, offset) {};
//


/**
 * Return object
 * @param {string|!ydn.db.Query|!ydn.db.Key} store table name.
 * @param {(string|number)=} id object key to be retrieved, if not provided,
 * all entries in the store will return.
 * param {number=} start start number of entry.
 * param {number=} limit maximun number of entries.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.QueryService.prototype.get = function(store, id) {

};


/**
 * @param {string} store table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.QueryService.prototype.put = function(store, value) {

};


/**
 * Remove a specific entry from a store or all.
 * @param {string=} opt_table delete the table as provided otherwise
 * delete all stores.
 * @param {(string|number)=} opt_key delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.QueryService.prototype.clear = function(opt_table, opt_key) {

};


/**
 *
 * @interface
 */
ydn.db.QueryServiceProvider = function() {};


/**
 * @return {boolean}
 */
ydn.db.QueryServiceProvider.prototype.isReady = function() {};


/**
 * @return {ydn.db.QueryService}
 */
ydn.db.QueryServiceProvider.prototype.getQueryService = function() {};

/**
 * @return {!goog.async.Deferred}
 */
ydn.db.QueryServiceProvider.prototype.getDeferredDb = function() {};