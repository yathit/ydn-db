/**
 * @fileoverview Interface for database service provider.
 */


goog.provide('ydn.db.con.IStorage');
goog.require('goog.async.Deferred');


/**
 * @interface
 */
ydn.db.con.IStorage = function() {};


/**
 * Close the connection.
 */
ydn.db.con.IStorage.prototype.close = goog.abstractMethod;


/**
 * Return readable representation of storage mechanism. It should be all lower
 * case and use in type checking.
 * @return {string} database type connected.
 */
ydn.db.con.IStorage.prototype.type = goog.abstractMethod;


/**
 * Run a transaction.
 * @export
 * @param {function((!IDBTransaction|!SQLTransaction|Object))|!Function} trFn
 * function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TransactionEventTypes, *)=}
  * completed_event_handler handler for completed event.
 */
ydn.db.con.IStorage.prototype.transaction = goog.abstractMethod;


