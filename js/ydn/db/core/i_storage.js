/**
 * @fileoverview Interface for core database service provider.
 */


goog.provide('ydn.db.core.IStorage');
goog.require('goog.async.Deferred');


/**
 * @interface
 */
ydn.db.core.IStorage = function() {};


/**
 * Close the connection.
 *
 */
ydn.db.core.IStorage.prototype.close = function() {};


/**
 * Return readable representation of storage mechanism. It should be all lower case and use in type checking.
 * @return {string}
 */
ydn.db.core.IStorage.prototype.type = function() {};


/**
 * Run a transaction.
 * @export
 * @param {function((!IDBTransaction|!SQLTransaction|Object))|!Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} mode mode, default to 'readonly'.
 * @param {function(ydn.db.TransactionEventTypes, *)=} completed_event_handler
 */
ydn.db.core.IStorage.prototype.transaction = function (trFn, store_names, mode, completed_event_handler) {};


