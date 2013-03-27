/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.index.IOperator');
goog.require('ydn.db.index.req.IRequestExecutor');
goog.require('ydn.db.crud.IOperator');



/**
 * @extends {ydn.db.crud.IOperator}
 * @interface
 */
ydn.db.index.IOperator = function() {};

//
//
///**
// * @throws {ydn.db.ScopeError}
// * @param {function(!ydn.db.index.req.IRequestExecutor)} callback callback function
// * when request executor is ready.
// * @param {!Array.<string>} store_names store name involved in the transaction.
// * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
// */
//ydn.db.index.IOperator.prototype.exec = goog.abstractMethod;


