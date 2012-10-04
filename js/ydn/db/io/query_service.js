/**
 * @fileoverview Interface for query service.
 *
 * Use interface so that query, key and database can strongly typed
 * cross-talking.
 */


goog.provide('ydn.db.io.QueryService');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Query');
goog.require('ydn.db.Key');
goog.require('ydn.db.io.CrudService');




/**
 * @interface
 * @extends {ydn.db.io.CrudService}
 */
ydn.db.io.QueryService = function() {

};


/**
* @param {!ydn.db.Query} q query.
* @param {number=} max
* @param {number=} skip
* @return {!goog.async.Deferred}
*/
ydn.db.io.QueryService.prototype.fetch = function(q, max, skip) {};





