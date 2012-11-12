/**
 * @fileoverview Abstract join algorithm.
 *
 * User: kyawtun
 * Date: 10/11/12
 */

goog.provide('ydn.db.algo.join.AbstractSolver');


/**
 *
 * @constructor
 */
ydn.db.algo.join.AbstractSolver = function() {

};


/**
 * Invoke before beginning of the iteration process.
 *
 * @param {!Array} iterators list of iterators feed to the scanner.
 * @param {!Array} streamers list of filter feed to the scanner.
 */
ydn.db.algo.join.AbstractSolver.prototype.begin = function(iterators, streamers){

};


/**
 *
 * @param {!Array} input input values.
 * @param {!Array} output output values.
 * @param {!Array} constrain constrain results.
 * @return {!Array} next positions.
 */
ydn.db.algo.join.AbstractSolver.prototype.process = function(input, output, constrain) {
  return [];
};


/**
 * Invoke at the end of the iteration process.
 */
ydn.db.algo.join.AbstractSolver.prototype.finish = function() {

};