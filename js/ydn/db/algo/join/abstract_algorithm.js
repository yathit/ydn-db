/**
 * @fileoverview Abstract join algorithm.
 *
 * User: kyawtun
 * Date: 10/11/12
 */

goog.provide('ydn.db.algo.join.AbstractAlgorithm');


/**
 *
 * @constructor
 */
ydn.db.algo.join.AbstractAlgorithm = function() {

};


/**
 * Invoke before beginning of the iteration process.
 *
 * @param {!Array} iterators list of iterators feed to the scanner.
 * @param {Array} filters list of filter feed to the scanner.
 */
ydn.db.algo.join.AbstractAlgorithm.prototype.begin = goog.abstractMethod;


/**
 *
 * @param {!Array} keys list of keys.
 * @param {Array} index_keys respective index keys.
 * @param {Array} values respective cursor values.
 * @param {!Array.<boolean}} filters filter results.
 * @return {Array} next positions.
 */
ydn.db.algo.join.AbstractAlgorithm.prototype.process = goog.abstractMethod;


/**
 * Invoke at the end of the iteration process.
 */
ydn.db.algo.join.AbstractAlgorithm.prototype.finish = goog.abstractMethod;