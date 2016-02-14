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
 * <pre>
 *   var iters = [ydn.db.IndexIterator.where('Task', 'IndexA', '=', 1),
 *     ydn.db.IndexIterator.where('Task', 'IndexB', '=', 1)];
 *   var result = [];
 *   var limit = 10;
 *   var multi = new ydn.db.algo.MultiQuery(result, limit);
 *   db.scan(multi, iters). done(function(x) {
 *      db.values('Task', result).done(...)
 *   });
 * </pre>
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
  var advancement = ydn.db.algo.AbstractSolver.lowestAdvance(keys);
  var lowest = -1;
  for (var i = 0; i < advancement.length; i++) {
    if (goog.isDefAndNotNull(advancement[i])) {
      lowest = i;
      break;
    }
  }
  return this.pusher({'advance': advancement}, keys, values, values[lowest], keys[lowest]);
};
