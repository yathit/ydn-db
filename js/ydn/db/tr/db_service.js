/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.DbService');
goog.require('ydn.db.DbService');
goog.require('ydn.db.tr.Mutex');


/**
 * @extends {ydn.db.DbService}
 * @interface
 */
ydn.db.tr.DbService = function() {};


/**
 *
 * @param {function(ydn.db.tr.Mutex)|Function} trFn callback function that invoke in the transaction with transaction instance.
 * @param {!Array.<string>} storeNames list of store names involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'read_write'.
 * @override
 */
ydn.db.tr.DbService.prototype.doTransaction = function(trFn, storeNames, mode) {};


/**
 * Obtain active consumable transaction object.
 * @return {ydn.db.tr.Mutex} transaction object if active and available.
 */
ydn.db.tr.DbService.prototype.getActiveTx = function() {};

