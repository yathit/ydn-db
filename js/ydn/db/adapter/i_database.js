/**
 * @fileoverview Interface for core database service provider.
 */


goog.provide('ydn.db.adapter.IDatabase');
goog.require('goog.async.Deferred');


/**
 * @interface
 */
ydn.db.adapter.IDatabase = function() {};


/**
 * Close the connection.
 *
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.adapter.IDatabase.prototype.close = function() {};


/**
 * Return readable representation of storage mechanism. It should be all lower case and use in type checking.
 * @return {string}
 */
ydn.db.adapter.IDatabase.prototype.type = function() {};



/**
 * Perform transaction immediately and invoke transaction_callback with
 * the transaction object.
 * Database adaptor must invoke completed_event_handler
 * when the data is transaction completed.
 * Caller must not invoke this method until transaction completed event is fired.
 * @param {function((SQLTransaction|IDBTransaction|Object))||Function} transaction_callback callback function that invoke in the transaction with transaction instance.
 * @param {!Array.<string>} store_names list of store names involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'read_write'.
 * @param {function(ydn.db.TransactionMode, *)} completed_event_handler
 */
ydn.db.adapter.IDatabase.prototype.doTransaction = function(transaction_callback, store_names,
                                                            mode, completed_event_handler) {};


