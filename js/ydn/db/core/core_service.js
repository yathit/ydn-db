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
 * Return native database. This is only use externally for hacking.
 * @return {*}
 */
ydn.db.CoreService.prototype.getDbInstance = function() {};

//
///**
// * Return active transaction.
// * @return {SQLTransaction|IDBTransaction|Object} If not in transaction, this return null.
// */
//ydn.db.CoreService.prototype.getTx = function() {};
//

/**
 *
 * @param {function(ydn.db.TransactionMutex)} trFn callback function that invoke in the transaction with transaction instance.
 * @param {!Array.<string>} storeNames list of store names involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'read_write'.
 */
ydn.db.CoreService.prototype.doTransaction = function(trFn, storeNames, mode) {};


