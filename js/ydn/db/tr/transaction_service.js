/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.TransactionService');
goog.require('ydn.db.CoreService');


/**
 * @extends {ydn.db.CoreService}
 * @constructor
 */
ydn.db.TransactionService = function() {};


/**
 *
 * @param {function(ydn.db.TransactionMutex)} trFn callback function that invoke in the transaction with transaction instance.
 * @param {!Array.<string>} storeNames list of store names involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'read_write'.
 */
ydn.db.CoreService.prototype.doTxTransaction = function(trFn, storeNames, mode) {};





/**
 * @return {!IDBTransaction|!SQLTransaction|Object}
 */
ydn.db.TransactionService.getTx = function() {};


/**
 * Get number of transaction count.
 * @return {number}
 */
ydn.db.TransactionService.prototype.getTxCount = function() {};


/**
 * @param {function(string=, *=)} fn
 */
ydn.db.TransactionService.prototype.addCompletedListener = function(fn) {};


/**
 * Transaction function is out of scope.
 */
ydn.db.TransactionService.prototype.out = function() {};



