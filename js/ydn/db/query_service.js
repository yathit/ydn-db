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
 * @param {!ydn.db.Query} q query.
 * @return {!goog.async.Deferred}
 */
ydn.db.QueryService.prototype.get = function(q) {};


/**
 *
 * @interface
 */
ydn.db.QueryServiceProvider = function() {};


/**
 * @return {ydn.db.QueryService}
 */
ydn.db.QueryServiceProvider.prototype.getDb = function() {};