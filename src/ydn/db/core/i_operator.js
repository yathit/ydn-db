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
 * Iterate keys by iterator.
 * @param {!ydn.db.Iterator} iterator
 * @return {!ydn.db.Request} result promise.
 */
ydn.db.core.IOperator.prototype.countOf = goog.abstractMethod;


/**
 * Iterate keys by iterator.
 * @param {!ydn.db.Iterator} iterator
 * @param {number=} arg2 limit.
 * @return {!ydn.db.Request} result promise.
 */
ydn.db.core.IOperator.prototype.keysOf = goog.abstractMethod;


/**
 * Iterate values by iterator.
 * @param {!ydn.db.Iterator} iterator iterator
 * @param {number=} arg2 limit.
 * @return {!ydn.db.Request} result promise.
 */
ydn.db.core.IOperator.prototype.valuesOf = goog.abstractMethod;




