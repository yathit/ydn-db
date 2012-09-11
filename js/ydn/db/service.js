/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.Service');
goog.require('ydn.db.CoreService');
goog.require('ydn.db.tr.Mutex');


/**
 * @extends {ydn.db.CoreService}
 * @interface
 */
ydn.db.Service = function() {};


/**
 * Run a new transaction.
 * @override
 * @param {function(!ydn.db.Service)} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} mode mode, default to 'readonly'.
 * @param {...} opt_args
 */
ydn.db.Service.prototype.transaction = function (trFn, store_names, mode, opt_args) {};



/**
 * Run transaction in existing or creating new.
 * @protected
 * @param {function(!ydn.db.Service)} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} mode mode, default to 'readonly'.
 * @param {...} opt_args
 */
ydn.db.Service.prototype.joinTransaction = function (trFn, store_names, mode, opt_args) {};





