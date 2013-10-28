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
 * @fileoverview Query with multiple AND iterators.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.query.Restricted');
goog.require('ydn.db.core.Storage');
goog.require('ydn.db.algo.SortedMerge');



/**
 * Query directly execute on raw cursor.
 * @param {ydn.db.core.DbOperator} db
 * @param {ydn.db.schema.Database} schema
 * @constructor
 * @struct
 */
ydn.db.query.Restricted = function(db, schema) {
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
};


/**
 * @define {boolean} debug flag.
 */
ydn.db.query.Restricted.DEBUG = false;


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {ydn.db.base.QueryMethod} mth query method.
 * @param {[ydn.db.Iterator]} iterators
 * @param {number} limit
 * @return {!ydn.db.Request}
 */
ydn.db.query.Restricted.prototype.list = function(mth, iterators, limit) {
  // console.log(this.iterator.getState(), this.iterator.getKey());
  var out = [];
  var solver = new ydn.db.algo.SortedMerge(out, limit);
  var scan_req = this.db.scan(solver, iterators);
  var store_name = iterators[0].getStoreName();
  var req = scan_req.copy();
  scan_req.addCallbacks(function(p_keys) {
    if (mth == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY) {
      req.callback(p_keys);
    } else {
      req.chainDeferred(this.db.values(store_name, p_keys));
    }
  }, function(e) {
    req.errback(e);
  }, this);

  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @param {ydn.db.Iterator} iter iterator.
 * @return {!ydn.db.Request}
 */
ydn.db.query.Restricted.prototype.count = function(iter) {
  var req;
  if (iter.isUnique()) {
    req = this.db.count(iter);
  } else if (iter.isIndexIterator()) {
    req = this.db.count(iter.getStoreName(), iter.getIndexName(),
        iter.getKeyRange());
  } else {
    req = this.db.count(iter.getStoreName(), iter.getKeyRange());
  }
  if (iter.getState() != ydn.db.Iterator.State.INITIAL) {
    // reset iteration state.
    req.addBoth(function() {
      if (iter.getState() != ydn.db.Iterator.State.WORKING) {
        iter.reset();
      }
    });
  }
  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @param {ydn.db.Iterator} iter iterator.
 * @return {!ydn.db.Request}
 */
ydn.db.query.Restricted.prototype.clear = function(iter) {
  var req = iter.isIndexIterator() ?
      this.db.clear(iter.getStoreName(), iter.getIndexName(), iter.keyRange()) :
      this.db.clear(iter.getStoreName(), iter.keyRange());
  return req;
};

