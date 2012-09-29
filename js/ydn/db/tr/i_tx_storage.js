/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.ITxStorage');
goog.require('ydn.db.tr.Mutex');


/**
 * @interface
 */
ydn.db.tr.ITxStorage = function() {};


/**
 *
 * @return {string}
 */
ydn.db.tr.ITxStorage.prototype.type = goog.abstractMethod;



/**
 * Run a new transaction.
 * @param {function(!ydn.db.tr.ITxStorage)} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} mode mode, default to 'readonly'.
 * @param {function(ydn.db.TransactionEventTypes, *)=} oncompleted
 * @param {...} opt_args
 */
ydn.db.tr.ITxStorage.prototype.run = goog.abstractMethod;


/**
 * @return {IDBTransaction|SQLTransaction|Object}
 */
ydn.db.tr.ITxStorage.getTx = function() {};


/**
 * Get transaction count.
 * @return {number}
 */
ydn.db.tr.ITxStorage.prototype.getTxNo = function() {};


/**
 * Get transaction queue number.
 * @return {number}
 */
ydn.db.tr.ITxStorage.prototype.getQueueNo = function() {};


