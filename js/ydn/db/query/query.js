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
 * @fileoverview Query module.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Query');
goog.require('ydn.db.core.Storage');



/**
 * Query class.
 * @param {ydn.db.core.Storage} db
 * @param {ydn.db.schema.Database} schema
 * @param {string=} opt_store store name.
 * @param {ydn.db.KeyRange=} opt_range key range.
 * @constructor
 * @struct
 */
ydn.db.Query = function(db, schema, opt_store, opt_range) {
  /**
   * @final
   * @protected
   * @type {ydn.db.core.Storage}
   */
  this.db = db;
  /**
   * @protected
   * @type {ydn.db.schema.Database}
   */
  this.schema = schema;
  /**
   * @protected
   * @type {number}
   */
  this.limit = 100;
  /**
   * @protected
   * @type {Array.<string>}
   */
  this.orders = [];
  /**
   * @protected
   * @type {Array.<ydn.db.Iterator>}
   */
  this.iterators = [];
  if (opt_store) {
    if (this.schema.hasStore(opt_store)) {
      this.iterators.push(new ydn.db.ValueCursors(opt_store, opt_range));
    } else {
      throw new ydn.debug.error.ArgumentException('Store "' + opt_store +
          '" not found.');
    }
  }
};


/**
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.clone = function() {
  var iters = [];
  for (var i = 0; i < this.iterators.length; ++i) {
    iters.push(this.iterators[i].clone());
  }
  var q = new ydn.db.Query(this.storage, this.schema);
  q.iterators = iters;
  return q;
};


/**
 * @return {!ydn.db.Query} return a new query.
 */
ydn.db.Query.prototype.reverse = function() {
  var q = this.clone();
  for (var i = 0; i < q.iterators.length; ++i) {
    q.iterators[i] = q.iterators[i].reverse();
  }
  return q;
};


/**
 * Specify query order.
 * @param {string|Array.<string>} order
 * @return {!ydn.db.Query} return a new query.
 */
ydn.db.Query.prototype.order = function(order) {
  var orders = goog.isString(order) ? [order] : order;
  if (orders.length != 1) {
    throw new Error('Multi ordering not implemented, but possible');
  }
  var q = this.clone();
  if (q.iterators.length == 0) {
    q.iterators[0] = new ydn.db.Iterator(this.store_name, orders.join(', '),
        null, false, false, false, orders);
  } else if (q.iterators.length == 1) {
    var iter = q.iterators[0];
    var kr = iter.getKeyRange();
    if (iter.isIndexIterator()) {
      if (iter.getIndexName() != orders[0]) {
        var index = [iter.getIndexName(), orders[0]];
        if (kr) {
          if (kr.lower == kr.upper) {
            var range = ydn.db.KeyRange.starts(kr.lower);
            q.iterators[0] = new ydn.db.Iterator(this.store_name,
                index.join(', '), range, iter.isReversed(), iter.isUnique(),
                iter.isKeyIterator(), index);
          } else {
            throw new Error('Not supported');
          }
        } else {
          q.iterators[0] = new ydn.db.Iterator(this.store_name,
              index.join(', '), null, iter.isReversed(), iter.isUnique(),
              iter.isKeyIterator(), index);
        }
      }
    } else {
      var store = this.schema.getStore(this.store_name);
      if (orders[0] != store.getKeyPath()) {
        throw new Error('Not possible without using in memory sorting.');
      }
    }
  } else {
    throw new Error('Not implemented');
  }
  q.orders = orders;
  return q;
};


/**
 * @param {number} limit set limit of this query.
 * @return {!ydn.db.Query} return this.
 */
ydn.db.Query.prototype.setLimit = function(limit) {
  this.limit = limit;
  return this;
};


/**
 * Create a new value cursor range iterator using where clause condition.
 * @param {string} index_name index name.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.Query} newly created query.
 */
ydn.db.Query.prototype.where = function(index_name, op, value, opt_op2,
    opt_value2) {
  var q = this.clone();
  if (q.iterators.length > 1) {
    throw new Error('Multi query not implemented');
  } else if (q.iterators[0].hasKeyRange()) {
    throw new ydn.debug.error.ArgumentException('joint query not implemented');
  } else {
    if (index_name == this.schema.getKeyPath()) {
      q.iterators[0] = ydn.db.ValueCursors.where(this.store_name,
          op, value, opt_op2, opt_value2);
    } else {
      q.iterators[0] = ydn.db.IndexValueCursors.where(this.store_name,
          index_name, op, value, opt_op2, opt_value2);
    }
  }
  return q;
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {function(this: T, !Array)} cb
 * @param {number=} opt_limit limit.
 * @param {T=} opt_scope
 * @template T
 */
ydn.db.Query.prototype.toArray = function(cb, opt_limit, opt_scope) {
  this.db.values(this.iterators[0], opt_limit).addCallbacks(function(list) {
    if (cb) {
      cb.call(opt_scope, list);
    } else {
      window.console.log(list);
    }
  }, function(e) {
    throw e;
  }, this);
};


/**
 * Count result of query. This method forces query execution.
 * @param {function(this: T, number)} cb
 * @param {T=} opt_scope
 * @template T
 */
ydn.db.Query.prototype.count = function(cb, opt_scope) {
  var iter = this.iterators[0];
  var req = iter.isIndexIterator() ?
      this.db.count(iter.getStoreName(), iter.getIndexName(), iter.keyRange()) :
      this.db.count(iter.getStoreName(), iter.keyRange());
  req.addCallbacks(function(cnt) {
    if (cb) {
      cb.call(opt_scope, cnt);
    } else {
      window.console.log(cnt);
    }
  }, function(e) {
    throw e;
  }, this);
};


/**
 * Create a new query.
 * @param {string} store_name
 * @param {string=} opt_op1 where operator.
 * @param {IDBKey=} opt_value1 rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {ydn.db.Query}
 */
ydn.db.core.Storage.prototype.from = function(store_name, opt_op1, opt_value1,
                                              opt_op2, opt_value2) {
  if (goog.DEBUG && !goog.isString(store_name)) {
    throw new TypeError('store name "' + store_name + '"');
  }
  var range;
  if (goog.isDef(opt_op1) && goog.isDef(opt_value1)) {
    range = ydn.db.KeyRange.where(opt_op1, opt_value1, opt_op2, opt_value2);
  }
  return new ydn.db.Query(this, this.schema, store_name, range);
};


/**
 * Create a new query.
 * @param {string} store_name
 * @param {string=} opt_op1 where operator.
 * @param {IDBKey=} opt_value1 rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {ydn.db.Query}
 */
ydn.db.core.DbOperator.prototype.from = function(store_name, opt_op1,
    opt_value1, opt_op2, opt_value2) {
  if (goog.DEBUG && !goog.isString(store_name)) {
    throw new TypeError('store name "' + store_name + '"');
  }
  var range;
  if (goog.isDef(opt_op1) && goog.isDef(opt_value1)) {
    range = ydn.db.KeyRange.where(opt_op1, opt_value1, opt_op2, opt_value2);
  }
  var db = /** @type {ydn.db.core.Storage} */ (this.getStorage());
  return new ydn.db.Query(db, this.schema, store_name, range);
};


goog.exportProperty(ydn.db.Query.prototype, 'count',
    ydn.db.Query.prototype.count);
goog.exportProperty(ydn.db.Query.prototype, 'get',
    ydn.db.Query.prototype.get);
goog.exportProperty(ydn.db.Query.prototype, 'order',
    ydn.db.Query.prototype.order);
goog.exportProperty(ydn.db.Query.prototype, 'reverse',
    ydn.db.Query.prototype.reverse);
goog.exportProperty(ydn.db.Query.prototype, 'toArray',
    ydn.db.Query.prototype.toArray);
goog.exportProperty(ydn.db.Query.prototype, 'where',
    ydn.db.Query.prototype.where);

goog.exportProperty(ydn.db.core.Storage.prototype, 'from',
    ydn.db.core.Storage.prototype.from);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'from',
    ydn.db.core.DbOperator.prototype.from);
