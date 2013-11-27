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
 * @param {boolean=} opt_ref_join By default key of iterators are
 * joined. Set true to join on reference value.
 * @constructor
 * @extends {ydn.db.query.Base}
 * @struct
 */
ydn.db.query.ConjQuery = function(db, schema, type, iters, opt_ref_join) {
  goog.base(this, db, schema, type);
  if (goog.DEBUG) {
    for (var i = 0; i < iters.length; i++) {
      goog.asserts.assert(iters[i].isKeyIterator(), 'iterator ' + i +
          ' must be key iterator');
    }
  }
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
  this.ref_join = !!opt_ref_join;
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
  var solver = this.ref_join ? new ydn.db.algo.ZigzagMerge(out) :
      new ydn.db.algo.SortedMerge(out);
  req = this.db.scan(solver, this.iters,
      ydn.db.base.TransactionMode.READ_WRITE);
  return req;
};


/**
 * Return true if joining is key, otherwise reference value.
 * @return {boolean}
 */
ydn.db.query.ConjQuery.prototype.isRefJoin = function() {
  return this.ref_join;
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {number} limit
 * @return {!ydn.db.Request}
 */
ydn.db.query.ConjQuery.prototype.list = function(limit) {
  // console.log(this.iterator.getState(), this.iterator.getKey());
  var out = this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ? [] :
      new ydn.db.Streamer(null, this.iters[0].getStoreName());

  var solver = this.ref_join ?
      new ydn.db.algo.ZigzagMerge(out) :
      new ydn.db.algo.SortedMerge(out);
  var req = this.db.scan(solver, this.iters,
      ydn.db.base.TransactionMode.READ_WRITE);
  var ans = req.copy();
  req.addCallbacks(function() {
    if (this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY) {
      ans.callback(out);
    } else {
      // wait for data collection to finished.
      out.done().addBoth(function(x) {
        ans.callback(x);
      });
    }
  }, function(e) {
    ans.errback(e);
  }, this);
  return ans;
};


/**
 * @inheritDoc
 */
ydn.db.query.ConjQuery.prototype.getIterators = function() {
  return this.iters.slice();
};


/**
 * @return {ydn.db.schema.Store}
 */
ydn.db.query.ConjQuery.prototype.getStore = function() {
  return this.schema.getStore(this.iters[0].getStoreName());
};


/**
 * Select query result.
 * @param {string|!Array.<string>} field_name_s select field name(s).
 * @return {!ydn.db.query.ConjQuery}
 */
ydn.db.query.ConjQuery.prototype.select = function(field_name_s) {
  var store = this.getStore();
  var fields = goog.isArray(field_name_s) ? field_name_s : [field_name_s];
  var type = this.type;
  if (fields.length == 1) {
    // select a key
    var field = fields[0];
    if (field == ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME ||
        field === store.getKeyPath()) {
      type = ydn.db.base.QueryMethod.LIST_PRIMARY_KEY;
    } else if (!field || field == '*') {
      type = ydn.db.base.QueryMethod.LIST_VALUE;
    } else if (store.hasIndex(field)) {
      type = ydn.db.base.QueryMethod.LIST_KEY;
    } else {
      throw new ydn.debug.error.ArgumentException('Invalid select "' +
          field + '", index not found in store "' +
          store.getName() + '"');
    }
  } else {
    throw new ydn.debug.error.ArgumentException('Not implemented');
  }
  return new ydn.db.query.ConjQuery(this.db, this.schema, type, this.iters);
};


/**
 * @return {!ydn.db.query.ConjQuery} return a new query.
 */
ydn.db.query.ConjQuery.prototype.reverse = function() {
  var iters = this.iters.map(function(iter) {
    return iter.reverse();
  });
  return new ydn.db.query.ConjQuery(this.db, this.schema, this.type, iters);
};




