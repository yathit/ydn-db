/**
 * @fileoverview Abstract join algorithm.
 *
 * User: kyawtun
 * Date: 10/11/12
 */

goog.provide('ydn.db.algo.AbstractSolver');


/**
 *
 * @constructor
 */
ydn.db.algo.AbstractSolver = function() {

};


/**
 * Invoke before beginning of the iteration process.
 *
 * @param {!Array} iterators list of iterators feed to the scanner.
 * @param {!Array} streamers list of filter feed to the scanner.
 */
ydn.db.algo.AbstractSolver.prototype.begin = function(iterators, streamers){

};


/**
 *
 * @param {!Array} keys input values.
 * @param {!Array} values output values.
 * @return {!Array} next positions.
 */
ydn.db.algo.AbstractSolver.prototype.adapter = function(keys, values) {
  return this.solver(keys, values, []);
};


/**
 *
 * @param {!Array} input input values.
 * @param {!Array} output output values.
 * @param {!Array} constrain constrain results.
 * @return {!Array} next positions.
 */
ydn.db.algo.AbstractSolver.prototype.solver = function(input, output, constrain) {
  return [];
};


/**
 * Invoke at the end of the iteration process.
 */
ydn.db.algo.AbstractSolver.prototype.finish = function() {

};