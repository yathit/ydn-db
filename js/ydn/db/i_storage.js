/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.IStorage');
goog.require('ydn.db.req.RequestExecutor');
goog.require('ydn.db.tr.IStorage');



/**
 * @extends {ydn.db.tr.IStorage}
 * @interface
 */
ydn.db.IStorage = function() {};



/**
 * @throws {ydn.db.ScopeError}
 * @param {function(!ydn.db.req.RequestExecutor)} callback callback function
 * when request executor is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 */
ydn.db.IStorage.prototype.exec = goog.abstractMethod;



