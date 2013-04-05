/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.index.IOperator');
goog.require('ydn.db.crud.IOperator');



/**
 * @extends {ydn.db.crud.IOperator}
 * @interface
 */
ydn.db.index.IOperator = function() {};


/**
 *
 * @param {!ydn.db.Iterator} iterator
 * @param {?function(*): (*|undefined)} callback
 * @return {!goog.async.Deferred} deferred.
 */
ydn.db.index.IOperator.prototype.map = goog.abstractMethod;


