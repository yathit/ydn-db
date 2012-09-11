/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.Service');
goog.require('ydn.db.DbService');
goog.require('ydn.db.tr.Mutex');


/**
 * @extends {ydn.db.DbService}
 * @interface
 */
ydn.db.tr.Service = function() {};


/**
 *
 * @param {function(ydn.db.tr.Mutex)} trFn callback function that invoke in the transaction with transaction instance.
 * @param {!Array.<string>} storeNames list of store names involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'read_write'.
 */
ydn.db.tr.Service.prototype.doTxTransaction = function(trFn, storeNames, mode) {};




