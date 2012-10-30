/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.core.IStorage');
goog.require('ydn.db.req.RequestExecutor');



/**
 * @extends {ydn.db.tr.IStorage}
 * @interface
 */
ydn.db.core.IStorage = function() {};



/**
 * @throws {ydn.db.ScopeError}
 * @param {function(!ydn.db.req.RequestExecutor)} callback
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 */
ydn.db.core.IStorage.prototype.exec = goog.abstractMethod;



