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
 * @fileoverview Union of multi query.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.algo.MultiQuery');
goog.require('ydn.db.algo.AbstractSolver');



/**
 * Union of multi query.
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)} out output receiver.
 * @param {number=} opt_limit limit.
 * @constructor
 * @extends {ydn.db.algo.AbstractSolver}
 */
ydn.db.algo.MultiQuery = function(out, opt_limit) {
  goog.base(this, out, opt_limit);
};
goog.inherits(ydn.db.algo.MultiQuery, ydn.db.algo.AbstractSolver);


/**
 * @define {boolean} debug flag.
 */
ydn.db.algo.MultiQuery.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.algo.MultiQuery.prototype.begin = function(iterators, callback) {
  return false;
};


/**
 * @inheritDoc
 */
ydn.db.algo.MultiQuery.prototype.solver = function(keys, values) {

  // initialize advancement array
  var advancement = [];


};
