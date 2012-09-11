/**
 * @fileoverview Interface for core database service provider.
 */


goog.provide('ydn.db.CoreService');
goog.require('goog.async.Deferred');


/**
 * @interface
 */
ydn.db.CoreService = function() {};


/**
 * Close the connection.
 *
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.CoreService.prototype.close = function() {};


/**
 * Return readable representation of storage mechanism. It should be all lower case and use in type checking.
 * @return {string}
 */
ydn.db.CoreService.prototype.type = function() {};


/**
 * Run a transaction.
 * @export
 * @param {function((!IDBTransaction|!SQLTransaction|Object))|!Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} mode mode, default to 'readonly'.
 */
ydn.db.CoreService.prototype.transaction = function (trFn, store_names, mode) {};


