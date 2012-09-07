/**
 * @fileoverview Interface for database provider.
 */


goog.provide('ydn.db.Db');
goog.require('ydn.db.Query');
goog.require('ydn.db.QueryService');
goog.require('ydn.db.Key');



/**
 * @interface
 */
ydn.db.Db = function() {};





/**
 * Close the connection.
 *
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.Db.prototype.close = function() {

};


/**
 *
 * @return {string}
 */
ydn.db.Db.prototype.type = function() {
};

/**
 *
 * @return {*}
 */
ydn.db.Db.prototype.getDbInstance = function() {
};
