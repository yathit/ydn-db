/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.IStorage');
goog.require('ydn.db.tr.Mutex');


/**
 * @interface
 */
ydn.db.tr.IStorage = function() {};


/**
 *
 * @return {string}
 */
ydn.db.tr.IStorage.prototype.type = goog.abstractMethod;



/**
 * Run a new transaction.
 * @param {function(!ydn.db.tr.IStorage)} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TransactionEventTypes, *)=} oncompleted
 * @param {...} opt_args
 */
ydn.db.tr.IStorage.prototype.run = goog.abstractMethod;


/**
 * @return {IDBTransaction|SQLTransaction|Object}
 */
ydn.db.tr.IStorage.getTx = function() {};


/**
 * Get transaction count.
 * @return {number}
 */
ydn.db.tr.IStorage.prototype.getTxNo = function() {};


/**
 * Get transaction queue number.
 * @return {number}
 */
ydn.db.tr.IStorage.prototype.getQueueNo = function() {};


