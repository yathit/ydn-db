/**
 * @fileoverview Interface for core database service provider.
 */


goog.provide('ydn.db.conn.IDatabase');
goog.require('goog.async.Deferred');


/**
 * @interface
 */
ydn.db.conn.IDatabase = function() {};


/**
 * Close the connection.
 */
ydn.db.conn.IDatabase.prototype.close = function() {};


/**
 * Return readable representation of storage mechanism. It should be all lower case and use in type checking.
 * @return {string}
 */
ydn.db.conn.IDatabase.prototype.type = function() {};


/**
 * @return {boolean}
 */
ydn.db.conn.IDatabase.prototype.isReady = function() {};


/**
 * @param {function(ydn.db.conn.IDatabase)} callback
 * @param {function(Error)} errback
 */
ydn.db.conn.IDatabase.prototype.onReady = function(callback, errback) {};



/**
 * @return {*}
 */
ydn.db.conn.IDatabase.prototype.getDbInstance = function() {};



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
 * @param {function(ydn.db.TransactionEventTypes, *)} completed_event_handler
 */
ydn.db.conn.IDatabase.prototype.doTransaction = goog.abstractMethod;


/**
 *
 * @param {(SQLTransaction|IDBTransaction|Object)} tx active transaction on version change mode.
 * @param {ydn.db.StoreSchema} store_schema
 */
ydn.db.conn.IDatabase.prototype.addStoreSchema = goog.abstractMethod;
