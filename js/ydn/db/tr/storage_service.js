/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.StorageService');
goog.require('ydn.db.CoreService');
goog.require('ydn.db.tr.Mutex');


/**
 * @extends {ydn.db.CoreService}
 * @interface
 */
ydn.db.tr.StorageService = function() {};

/**
 * Run a transaction.
 * @override
 * @param {function(!ydn.db.tr.StorageService)} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} mode mode, default to 'readonly'.
 * @param {...} opt_args
 */
ydn.db.tr.StorageService.prototype.transaction = function (trFn, store_names, mode, opt_args) {};


/**
 * Obtain active consumable transaction object.
 * @return {ydn.db.tr.Mutex} transaction object if active and available.
 */
ydn.db.tr.StorageService.prototype.getActiveTx = function() {};





