// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Abstract join algorithm.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.algo.AbstractSolver');
goog.require('goog.debug.Logger');
goog.require('ydn.db');
goog.require('ydn.db.Streamer');



/**
 *
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)=} out output receiver.
 * @param {number=} opt_limit limit.
 * to algorithm input and output.
 * @constructor
 */
ydn.db.algo.AbstractSolver = function(out, opt_limit) {
  if (goog.DEBUG && goog.isDefAndNotNull(out) && !('push' in out)) {
    throw new ydn.error.ArgumentException('output receiver object must have ' +
        '"push" method.');
  }
  this.out = out || null;
  this.limit = opt_limit;
  this.match_count = 0;
  /**
   * @protected
   * @type {boolean}
   */
  this.is_reverse = false;
};


/**
 * Return list of iterators for scanning for managed solver.
 * @return {Array.<!ydn.db.Iterator>} iterators.
 */
ydn.db.algo.AbstractSolver.prototype.getIterators = function() {
  return null;
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.algo.AbstractSolver.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.algo.AbstractSolver');


/**
 * Invoke before beginning of the iteration process.
 *
 * @param {!Array} iterators list of iterators feed to the scanner.
 * @param {!Function} callback on finish callback function.
 * @return {boolean}
 */
ydn.db.algo.AbstractSolver.prototype.begin = function(iterators, callback) {
  this.is_reverse = iterators[0].isReversed();
  if (goog.DEBUG) {
    for (var i = 0; i < iterators.length; i++) {
      if (!(iterators[i] instanceof ydn.db.Iterator)) {
        throw new ydn.debug.error.TypeError('item at iterators ' + i +
            ' is not an iterator.');
      }
      if (i > 0) {
        if (this.is_reverse != iterators[i].isReversed()) {
          var r = this.is_reverse ? 'be reverse' : 'not be reverse';
          throw new ydn.debug.error.TypeError('iterator at ' + i +
              ' must ' + r);
        }
      }
    }
  }
  var s = '{';
  for (var i = 0; i < iterators.length; i++) {
    if (i > 0) {
      s += ', '
    }
    s += iterators.toString();
  }
  s += '}';
  if (this.is_reverse) {
    s += ' reverse';
  }
  this.logger.fine(this + ' begin ' + s);
  return false;
};


/**
 * Push the result if all keys match. Break the limit if the number of results
 * reach the limit.
 * @param {!Array} advance
 * @param {!Array} keys input values.
 * @param {!Array} values output values.
 * @param {*=} opt_match_key match key.
 * @return {!Object} cursor advancement array.
 * @protected
 */
ydn.db.algo.AbstractSolver.prototype.pusher = function(advance, keys, values,
                                                       opt_match_key) {

  var matched = goog.isDefAndNotNull(opt_match_key);
  if (!goog.isDef(opt_match_key)) {
    opt_match_key = values[0];
    matched = goog.isDefAndNotNull(opt_match_key);
    for (var i = 1; matched && i < values.length; i++) {
      if (!goog.isDefAndNotNull(values[i]) ||
          ydn.db.cmp(values[i], opt_match_key) != 0) {
        matched = false;
      }
    }
  }

  if (matched) {
    this.match_count++;
    //console.log(['match key', match_key, JSON.stringify(keys)]);
    if (this.out) {
      this.out.push(opt_match_key);
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
 * @return {boolean} true to wait.
 */
ydn.db.algo.AbstractSolver.prototype.finish = function(callback) {
  return false;
};
