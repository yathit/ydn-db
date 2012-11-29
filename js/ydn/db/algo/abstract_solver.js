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
 *
 * @param {!Array} keys input values.
 * @param {!Array} values output values.
 * @return {!Array} next positions.
 */
ydn.db.algo.AbstractSolver.prototype.adapter = function (keys, values) {

  var has_key = goog.isDefAndNotNull(keys[0]);
  var match_key = keys[0];
  for (var i = 1; i < keys.length; i++) {
    if (goog.isDefAndNotNull(keys[i])) {
      has_key = true;
      if (goog.isDefAndNotNull(match_key) && ydn.db.cmp(keys[i], match_key) != 0) {
        match_key = null;
        break;
      }
    } else {
      match_key = null;
    }
  }
  if (goog.isDefAndNotNull(match_key)) {
    this.match_count++;
    //console.log(['match key', match_key, JSON.stringify(keys)]);
    if (this.out) {
      this.out.push(match_key);
    }
    if (goog.isDef(this.limit) && this.match_count >= this.limit) {
      return [];
    }
  }

  if (has_key) {
    return this.solver(keys, values, []);
  } else {
    return [];
  }
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