/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.core.IOperator');
goog.require('ydn.db.crud.IOperator');



/**
 * @extends {ydn.db.crud.IOperator}
 * @interface
 */
ydn.db.core.IOperator = function() {};


/**
 *
 * @param {!ydn.db.Iterator} iterator
 * @param {?function(*): (*|undefined)} callback
 * @return {!goog.async.Deferred} deferred.
 */
ydn.db.core.IOperator.prototype.map = goog.abstractMethod;


