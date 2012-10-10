/**
 * @fileoverview Interface for query service.
 *
 * Use interface so that query, key and database can strongly typed
 * cross-talking.
 */


goog.provide('ydn.db.io.QueryService');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Cursor');
goog.require('ydn.db.Key');
goog.require('ydn.db.io.CrudService');




/**
 * @interface
 * @extends {ydn.db.io.CrudService}
 */
ydn.db.io.QueryService = function() {

};


/**
* @param {!ydn.db.Cursor|!ydn.db.Query} q the query.
* @param {number=} max maximum number of records to be fetched.
* @param {number=} skip skip the number of success records received.
* @return {!goog.async.Deferred} return result as list.
*/
ydn.db.io.QueryService.prototype.fetch = function(q, max, skip) {};




/**
 * @param {!ydn.db.Cursor} q the cursor.
 * @param {Array.<string>} scope list of store names.
 * @param {boolean=} written open as readwrite operation. default is readonly.
 * @param {boolean=} resumed resume previous cursor position.
 * @return {!goog.async.Deferred}
 */
ydn.db.io.QueryService.prototype.open = function(q, scope, written, resumed) {};





