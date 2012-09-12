/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.ITxStorage');
goog.require('ydn.db.core.IStorage');
goog.require('ydn.db.tr.Mutex');


/**
 * @interface
 */
ydn.db.tr.ITxStorage = function() {};




/**
 * @return {IDBTransaction|SQLTransaction|Object}
 */
ydn.db.tr.ITxStorage.getTx = function() {};


/**
 * Get transaction series number.
 * @return {number}
 */
ydn.db.tr.ITxStorage.prototype.getTxNo = function() {};

/**
 * Add a transaction complete (also error and abort) event. The listener will
 * be invoked after receiving one of these three events and before executing
 * next transaction. However, it is recommended that listener is not used
 * for transaction logistic tracking, which should, in fact, be tracked request
 * level. Use this listener to release resource for robustness. Any error on
 * the listener will be swallowed.
 * @final
 * @param {function(string=, *=)} fn first argument is either 'complete',
 * 'error', or 'abort' and second argument is event.
 */
ydn.db.tr.ITxStorage.prototype.setCompletedListener = function(fn) {};


/**
 * Going out of scope
 */
ydn.db.tr.ITxStorage.prototype.out = function() {};



