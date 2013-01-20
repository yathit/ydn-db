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
 * @param {ydn.db.base.TransactionMode=} mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TransactionEventTypes, *)=} oncompleted event
 * handler on completed.
 * @param {...} opt_args optional arguments to post-pend to callback function.
 */
ydn.db.tr.IStorage.prototype.run = goog.abstractMethod;


/**
 * @return {IDBTransaction|SQLTransaction|Object} get transaction object.
 */
ydn.db.tr.IStorage.getTx = goog.abstractMethod;


/**
 * Get transaction count.
 * @return {number} transaction series number.
 */
ydn.db.tr.IStorage.prototype.getTxNo = goog.abstractMethod;




