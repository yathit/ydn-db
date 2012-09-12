/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.IDatabase');
goog.require('ydn.db.adapter.IDatabase');
goog.require('ydn.db.tr.Mutex');


/**
 * @extends {ydn.db.adapter.IDatabase}
 * @interface
 */
ydn.db.tr.IDatabase = function() {};


/**
 *
 * @param {function(ydn.db.tr.Mutex)|Function} trFn callback function that invoke in the transaction with transaction instance.
 * @param {!Array.<string>} storeNames list of store names involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'read_write'.
 * @override
 */
ydn.db.tr.IDatabase.prototype.doTransaction = function(trFn, storeNames, mode) {};


/**
 * Obtain active consumable transaction object.
 * @return {ydn.db.tr.Mutex} transaction object if active and available.
 */
ydn.db.tr.IDatabase.prototype.getActiveTx = function() {};

