/**
 * @fileoverview Interface for core database service provider.
 */


goog.provide('ydn.db.DbService');
goog.require('goog.async.Deferred');


/**
 * @interface
 */
ydn.db.DbService = function() {};


/**
 * Close the connection.
 *
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.DbService.prototype.close = function() {};


/**
 * Return readable representation of storage mechanism. It should be all lower case and use in type checking.
 * @return {string}
 */
ydn.db.DbService.prototype.type = function() {};



/**
 *
 * @param {function((SQLTransaction|IDBTransaction|Object))} trFn callback function that invoke in the transaction with transaction instance.
 * @param {!Array.<string>} storeNames list of store names involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'read_write'.
 */
ydn.db.DbService.prototype.doTransaction = function(trFn, storeNames, mode) {};


