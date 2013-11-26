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
 * @fileoverview Conjunction query, or query with multiple AND iterators.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.query.ConjQuery');
goog.require('ydn.db.algo.SortedMerge');
goog.require('ydn.db.core.Storage');



/**
 * Conjunction query.
 * @param {ydn.db.core.DbOperator} db
 * @param {ydn.db.schema.Database} schema
 * @param {ydn.db.base.QueryMethod} type query type.
 * @param {!Array.<!ydn.db.Iterator>} iters
 * @param {boolean=} opt_join_key By default reference values of iterators are
 * joined. Set true to join on keys.
 * @constructor
 * @extends {ydn.db.query.Base}
 * @struct
 */
ydn.db.query.ConjQuery = function(db, schema, type, iters, opt_join_key) {
  goog.base(this, db, schema, type);
  /**
   * @final
   * @protected
   * @type {ydn.db.core.DbOperator}
   */
  this.db = db;
  /**
   * @final
   * @protected
   * @type {ydn.db.schema.Database}
   */
  this.schema = schema;
  /**
   * @final
   * @protected
   * @type {ydn.db.base.QueryMethod}
   */
  this.type = type || ydn.db.base.QueryMethod.NONE;
  /**
   * @final
   * @protected
   * @type {!Array.<!ydn.db.Iterator>}
   */
  this.iters = iters;
  /**
   * @final
   * @type {boolean}
   */
  this.key_join = !!opt_join_key;
};
goog.inherits(ydn.db.query.ConjQuery, ydn.db.query.Base);


/**
 * @define {boolean} debug flag.
 */
ydn.db.query.ConjQuery.DEBUG = false;


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {function(this: T, !ydn.db.core.req.ICursor)} cb
 * @param {T=} opt_scope
 * @return {!ydn.db.Request}
 * @template T
 */
ydn.db.query.ConjQuery.prototype.open = function(cb, opt_scope) {
  var req;
  var out = {
    'push': function(key) {

    }
  };
  var solver = this.key_join ? new ydn.db.algo.ZigzagMerge(out) :
      new ydn.db.algo.SortedMerge(out);
  req = this.db.scan(solver, this.iters,
      ydn.db.base.TransactionMode.READ_WRITE);
  return req;
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {number} limit
 * @return {!ydn.db.Request}
 */
ydn.db.query.ConjQuery.prototype.list = function(limit) {
  // console.log(this.iterator.getState(), this.iterator.getKey());
  var out = this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ? [] :
      new ydn.db.Streamer();

  var solver = this.key_join ?
      new ydn.db.algo.ZigzagMerge(out) :
      new ydn.db.algo.SortedMerge(out);
  var req = this.db.scan(solver, this.iters,
      ydn.db.base.TransactionMode.READ_WRITE);
  return req.addCallback(function() {
    if (this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY) {
      return out;
    } else {
      return out.done(); // wait for data collection to finished.
    }
  }, this);
};



