/**
 * @fileoverview Interface for query service.
 */


goog.provide('ydn.db.QueryService');
goog.provide('ydn.db.QueryServiceProvider');
goog.require('goog.async.Deferred');
goog.require('goog.async.Deferred');


/**
 * @interface
 */
ydn.db.QueryService = function() {

};


/**
 * @param {!ydn.db.Query} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @return {!goog.async.Deferred}
 */
ydn.db.QueryService.prototype.fetch = function(q, limit, offset) {};


/**
 * @param {string|!ydn.db.Query|!ydn.db.Key} q query.
 * @param {(string|number)=} id
 * @return {!goog.async.Deferred}
 */
ydn.db.QueryService.prototype.get = function(q, id) {};

/**
 * @param {string} store table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.QueryService.prototype.put = function(store, value) {

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
ydn.db.QueryServiceProvider.prototype.getDb = function() {};

/**
 * @return {!goog.async.Deferred}
 */
ydn.db.QueryServiceProvider.prototype.getDeferredDb = function() {};