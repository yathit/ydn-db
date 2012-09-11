/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.Service');
goog.require('ydn.db.CoreService');


/**
 * @extends {ydn.db.CoreService}
 * @constructor
 */
ydn.db.tr.Service = function() {};


/**
 *
 * @param {function(ydn.db.tr.Mutex)} trFn callback function that invoke in the transaction with transaction instance.
 * @param {!Array.<string>} storeNames list of store names involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'read_write'.
 */
ydn.db.CoreService.prototype.doTxTransaction = function(trFn, storeNames, mode) {};





/**
 * @return {!IDBTransaction|!SQLTransaction|Object}
 */
ydn.db.tr.Service.getTx = function() {};


/**
 * Get number of transaction count.
 * @return {number}
 */
ydn.db.tr.Service.prototype.getTxCount = function() {};


/**
 * @param {function(string=, *=)} fn
 */
ydn.db.tr.Service.prototype.addCompletedListener = function(fn) {};


/**
 * Transaction function is out of scope.
 */
ydn.db.tr.Service.prototype.out = function() {};



