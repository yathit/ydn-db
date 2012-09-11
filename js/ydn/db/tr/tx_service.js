/**
 * @fileoverview Interface for core database service during transaction.
 *
 */


goog.provide('ydn.db.tr.TxService');
goog.require('ydn.db.CoreService');
goog.require('ydn.db.tr.Mutex');


/**
 * @interface
 */
ydn.db.tr.TxService = function() {};



/**
 * @return {!IDBTransaction|!SQLTransaction|Object}
 */
ydn.db.tr.TxService.getTx = function() {};


/**
 * Get number of transaction count.
 * @return {number}
 */
ydn.db.tr.TxService.prototype.getTxCount = function() {};


/**
 * @param {function(string=, *=)} fn
 */
ydn.db.tr.TxService.prototype.addCompletedListener = function(fn) {};


/**
 * Transaction function is out of scope.
 */
ydn.db.tr.TxService.prototype.out = function() {};



