/**
 * @fileoverview Abstract join algorithm.
 *
 * User: kyawtun
 * Date: 10/11/12
 */

goog.provide('ydn.db.algo.AbstractSolver');
goog.require('goog.debug.Logger');
goog.require('ydn.db.Streamer');


/**
 *
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)=} out output receiver.
 * @param {(function(!Array, !Array): !Array)=} adapter transform scan result
 * to algorithm input and output.
 * @constructor
 */
ydn.db.algo.AbstractSolver = function(out, adapter) {
  if (goog.DEBUG && goog.isDefAndNotNull(out) && !('push' in out)) {
    throw new ydn.error.ArgumentException();
  }
  this.out = out || null;
  if (goog.isDefAndNotNull(adapter)) {
    if (goog.DEBUG && !goog.isFunction(adapter)) {
      throw new ydn.error.ArgumentException();
    }
    this.adapter = adapter;
  }
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.algo.AbstractSolver.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.algo.AbstractSolver');


/**
 *
 * @protected
 * @type {!Array|!{push: Function}|!ydn.db.Streamer|null}
 */
ydn.db.algo.AbstractSolver.prototype.out = null;


/**
 * Invoke before beginning of the iteration process.
 *
 * @param {!Array} iterators list of iterators feed to the scanner.
 * @param {!Function} callback on finish callback function.
 * @return {boolean}
 */
ydn.db.algo.AbstractSolver.prototype.begin = function(iterators, callback){
  return false;
};


/**
 *
 * @param {!Array} keys input values.
 * @param {!Array} values output values.
 * @return {!Array} next positions.
 */
ydn.db.algo.AbstractSolver.prototype.adapter = function(keys, values) {
  if (this.out && goog.isDefAndNotNull(keys[0])) {
    var key = keys[0];
    for (var i = 1; i < keys.length; i++) {
      if (keys[i] != key) {
        key = null;
        break;
      }      
    }
    if (!goog.isNull(key)) {
      this.out.push(key);
    }
  }
  return this.solver(keys, values, []);
};


/**
 *
 * @param {!Array} input input values.
 * @param {!Array} output output values.
 * @param {!Array} constrain constrain results.
 * @return {!Array} next positions.
 * @protected
 */
ydn.db.algo.AbstractSolver.prototype.solver = function(input, output, constrain) {
  return [];
};


/**
 * Invoke at the end of the iteration process.
 * @param {!Function} callback on finish callback function.
 * @return {boolean} true to wait
 */
ydn.db.algo.AbstractSolver.prototype.finish = function(callback) {
  return false;
};