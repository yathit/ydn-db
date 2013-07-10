/**
 * @fileoverview Interface for transactional database service.
 *
 */


goog.provide('ydn.db.tr.IStorage');
goog.require('ydn.db.tr.Mutex');



/**
 * @interface
 */
ydn.db.tr.IStorage = function() {};


/**
 * Run a new transaction.
 * @param {function(!ydn.db.tr.IStorage)} trFn function that invoke in the
 * transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.StandardTransactionMode=} opt_mode mode, default to
 * 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_oncompleted event
 * handler on completed.
 * @param {...} args optional arguments to post-pend to callback function.
 */
ydn.db.tr.IStorage.prototype.run = goog.abstractMethod;






