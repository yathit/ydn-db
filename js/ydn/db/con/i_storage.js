/**
 * @fileoverview Interface for core database service provider.
 */


goog.provide('ydn.db.con.IStorage');
goog.require('goog.async.Deferred');


/**
 * @interface
 */
ydn.db.con.IStorage = function() {};


/**
 * Close the connection.
 *
 */
ydn.db.con.IStorage.prototype.close = function() {};


/**
 * Return readable representation of storage mechanism. It should be all lower case and use in type checking.
 * @return {string}
 */
ydn.db.con.IStorage.prototype.type = function() {};


/**
 * Run a transaction.
 * @export
 * @param {function((!IDBTransaction|!SQLTransaction|Object))|!Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TransactionEventTypes, *)=} completed_event_handler
 */
ydn.db.con.IStorage.prototype.transaction = function (trFn, store_names, mode, completed_event_handler) {};


