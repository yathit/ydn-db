/**
 * @fileoverview Abstract join algorithm.
 *
 * User: kyawtun
 * Date: 10/11/12
 */

goog.provide('ydn.db.algo.AbstractSolver');
goog.require('goog.debug.Logger');
goog.require('ydn.db.Streamer');
goog.require('ydn.db');


/**
 *
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)=} out output receiver.
 * @param {number=} limit limit.
 * to algorithm input and output.
 * @constructor
 */
ydn.db.algo.AbstractSolver = function(out, limit) {
  if (goog.DEBUG && goog.isDefAndNotNull(out) && !('push' in out)) {
    throw new ydn.error.ArgumentException();
  }
  this.out = out || null;
  this.limit = limit;
  this.match_count = 0;
//  if (goog.isDefAndNotNull(adapter)) {
//    if (goog.DEBUG && !goog.isFunction(adapter)) {
//      throw new ydn.error.ArgumentException();
//    }
//    this.adapter = function(keys, values) {
//      adapter(keys, values);
//    }
//  }
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
 * Push the result if all keys match. Break the limit if the number of results
 * reach the limit.
 * @param {!Array} advance
 * @param {!Array} keys input values.
 * @param {!Array} values output values.
 * @param {*=} match_key match key.
 * @protected
 */
ydn.db.algo.AbstractSolver.prototype.pusher = function (advance, keys, values, match_key) {

  var matched = goog.isDefAndNotNull(match_key);
  if (!goog.isDef(match_key)) {
    match_key = values[0];
    matched =  goog.isDefAndNotNull(match_key);
    for (var i = 1; matched && i < values.length; i++) {
      if (!goog.isDefAndNotNull(values[i]) ||
        ydn.db.cmp(values[i], match_key) != 0) {
        matched = false;
      }
    }
  }

  if (matched) {
    this.match_count++;
    //console.log(['match key', match_key, JSON.stringify(keys)]);
    if (this.out) {
      this.out.push(match_key);
    }
    if (goog.isDef(this.limit) && this.match_count >= this.limit) {
      return [];
    }
  }

  return advance;
};


/**
 *
 * @param {!Array} input input values.
 * @param {!Array} output output values.
 * @return {!Array|!Object} next positions.
 */
ydn.db.algo.AbstractSolver.prototype.solver = function(input, output) {
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