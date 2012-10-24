/**
 * @fileoverview Interface for core database service provider.
 */


goog.provide('ydn.db.con.IDatabase');
goog.require('goog.async.Deferred');


/**
 * @interface
 */
ydn.db.con.IDatabase = function() {};


/**
 * Close the connection.
 */
ydn.db.con.IDatabase.prototype.close = function() {};


/**
 * Return readable representation of storage mechanism. It should be all lower case and use in type checking.
 * @return {string}
 */
ydn.db.con.IDatabase.prototype.type = function() {};


/**
 * @return {boolean}
 */
ydn.db.con.IDatabase.prototype.isReady = function() {};


/**
 * @param {string} name database name.
 * @param {!ydn.db.schema.Database} schema dtabase schema.
 * @param {function(Error=)} callback on success or no error.
 */
ydn.db.con.IDatabase.prototype.connect = function(name, schema, callback) {};



/**
 * @return {*}
 */
ydn.db.con.IDatabase.prototype.getDbInstance = function() {};



/**
 * Perform transaction immediately and invoke transaction_callback with
 * the transaction object.
 * Database adaptor must invoke completed_event_handler
 * when the data is transaction completed.
 * Caller must not invoke this method until transaction completed event is fired.
 * @param {function((SQLTransaction|IDBTransaction|Object))||Function} transaction_callback callback function that invoke in the transaction with transaction instance.
 * @param {Array.<string>} store_names list of store names involved in the
 * transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'read_write'.
 * @param {function(ydn.db.base.TransactionEventTypes, *)} completed_event_handler
 */
ydn.db.con.IDatabase.prototype.doTransaction = goog.abstractMethod;



/**
 *
 * @param {function(ydn.db.schema.Database)} callback
 * @param {(SQLTransaction|IDBTransaction|Object)=} trans
 * @param {(IDBDatabase|Database)=} db
 */
ydn.db.con.IDatabase.prototype.getSchema = goog.abstractMethod;
