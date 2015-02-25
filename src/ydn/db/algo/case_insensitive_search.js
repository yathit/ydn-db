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
 * @fileoverview String case insensitive search.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.algo.CaseInsensitiveSearch');
goog.require('ydn.db.algo.AbstractSolver');



/**
 * String case insensitive search.
 * @param {string} q the search term.
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)} out output receiver.
 * @param {number=} opt_limit limit.
 * @constructor
 * @extends {ydn.db.algo.AbstractSolver}
 */
ydn.db.algo.CaseInsensitiveSearch = function(q, out, opt_limit) {
  goog.base(this, out, opt_limit);
  /**
   * @final
   * @protected
   * @type {string} the search term.
   */
  this.q = q;
  /**
   * @protected
   * @type {string} the result.
   */
  this.result = '';
  /**
   * @protected
   * @type {string} currently char the cursor is marching.
   */
  this.target = '';
  /**
   * @type {boolean}
   * @private
   */
  this.is_key_iter_ = false;
};
goog.inherits(ydn.db.algo.CaseInsensitiveSearch, ydn.db.algo.AbstractSolver);


/**
 * @define {boolean} debug flag.
 */
ydn.db.algo.CaseInsensitiveSearch.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.algo.CaseInsensitiveSearch.prototype.begin = function(iterators, callback) {
  this.is_key_iter_ = iterators[0].isKeyIterator();
  return false;
};


/**
 * @inheritDoc
 */
ydn.db.algo.CaseInsensitiveSearch.prototype.solver = function(keys, values) {

  var n = this.current.length;
  if (n >= this.q.length) {
    return [];
  }
  var target = this.q.substr(0, n);

  var key = this.is_key_iter_ ? keys[0] : values[0];

  if (n == 0) {

  }

  return [];
};
