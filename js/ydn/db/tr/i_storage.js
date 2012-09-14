/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.IStorage');
goog.require('ydn.db.core.IStorage');
goog.require('ydn.db.tr.Mutex');


/**
 * @extends {ydn.db.core.IStorage}
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
 * @override
 * @param {function(!ydn.db.tr.IStorage)} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} mode mode, default to 'readonly'.
 * @param {function(ydn.db.TransactionEventTypes, *)=} oncompleted
 * @param {...} opt_args
 */
ydn.db.tr.IStorage.prototype.transaction = goog.abstractMethod;









