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
 * @fileoverview Query builder class.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Query');
goog.require('ydn.db.core.Storage');
goog.require('ydn.db.query.Base');
goog.require('ydn.db.query.Restricted');



/**
 * Query builder class.
 * @param {ydn.db.core.DbOperator} db
 * @param {ydn.db.schema.Database} schema
 * @param {!Array.<!ydn.db.Iterator>|!ydn.db.Iterator} iter key range.
 * @param {ydn.db.base.QueryMethod=} opt_type query type. Default to values.
 * @constructor
 * @struct
 */
ydn.db.Query = function(db, schema, iter, opt_type) {
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
  this.type = opt_type || ydn.db.base.QueryMethod.NONE;
  /**
   * @final
   * @protected
   * @type {Array.<string>}
   */
  this.orders = [];
  /**
   * @final
   * @protected
   * @type {!Array.<!ydn.db.Iterator>}
   */
  this.iterators = goog.isArray(iter) ? iter : [iter];
  /**
   * @type {?function(*): boolean}
   * @private
   */
  this.filter_ = null;
  /**
   * @type {*}
   * @private
   */
  this.filter_scope_;
};


/**
 * @define {boolean} debug flag.
 */
ydn.db.Query.DEBUG = false;


/**
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.copy = function() {
  var iters = [];
  for (var i = 0; i < this.iterators.length; i++) {
    iters[i] = this.iterators[i].copy();
  }
  var q = new ydn.db.Query(this.db, this.schema, iters, this.type);
  q.filter_ = this.filter_;
  q.filter_scope_ = this.filter_scope_;
  return q;
};


/**
 * @return {!ydn.db.Query} return a new query.
 */
ydn.db.Query.prototype.reverse = function() {
  var iters = [];
  for (var i = 0; i < this.iterators.length; i++) {
    iters[i] = this.iterators[i].reverse();
  }
  return new ydn.db.Query(this.db, this.schema, iters,
      this.type);
};


/**
 * Set unique state of query.
 * @param {boolean} val
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.unique = function(val) {
  if (!goog.isBoolean(val)) {
    throw new ydn.debug.error.ArgumentException('unique value must be' +
        ' a boolean, but ' + typeof val + ' found');
  }
  if (this.iterators.length > 1) {
    throw new ydn.debug.error.ArgumentException('multi-iterators cannot be set' +
        ' unique property');
  }
  var iter = this.iterators[0];
  if (!iter.isIndexIterator()) {
    throw new ydn.debug.error.ArgumentException('primary key query is ' +
        'already unique');
  }
  return new ydn.db.Query(this.db, this.schema, [iter.unique(val)],
      this.type);
};


/**
 * Specify query order.
 * @param {string|Array.<string>} order
 * @return {!ydn.db.Query} return a new query.
 */
ydn.db.Query.prototype.order = function(order) {
  var orders = goog.isString(order) ? [order] : order;
  if (orders.length != 1) {
    throw new ydn.debug.error.ArgumentException('Multi ordering not' +
        ' implemented, wait for next release');
  }
  if (this.iterators.length > 1) {
    throw new ydn.debug.error.ArgumentException('order cannot be set');
  }
  var iter = this.iterators[0];
  var store = this.schema.getStore(iter.getStoreName());
  var kr = iter.getKeyRange();
  if (iter.isIndexIterator()) {
    if (iter.getIndexName() != orders[0]) {
      var index = [iter.getIndexName(), orders[0]];
      if (kr) {
        if (kr.lower == kr.upper) {
          var range = ydn.db.KeyRange.starts([kr.lower]);
          iter = new ydn.db.Iterator(iter.getStoreName(),
              index.join(', '), range, iter.isReversed(), iter.isUnique(),
              iter.isKeyIterator(), index);
        } else {
          throw new ydn.debug.error.ArgumentException('Not supported');
        }
      } else {
        iter = new ydn.db.Iterator(iter.getStoreName(),
            index.join(', '), null, iter.isReversed(), iter.isUnique(),
            iter.isKeyIterator(), index);
      }
    }
  } else {
    if (orders[0] != store.getKeyPath()) {
      if (kr) {
        throw new ydn.debug.error.ArgumentException('Not possible without' +
            ' using in memory sorting.');
      } else {
        iter = new ydn.db.IndexValueIterator(iter.getStoreName(),
            orders[0], null, iter.isReversed(), iter.isUnique());
      }
    }
  }
  return new ydn.db.Query(this.db, this.schema, iter, this.type);
};


/**
 * Create a new value cursor range iterator using where clause condition.
 * @param {string} index_name index name.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.Query} return this for chaining.
 */
ydn.db.Query.prototype.where = function(index_name, op, value, opt_op2,
    opt_value2) {

  var iter = this.iterators[0];
  if (iter.hasKeyRange()) {
    throw new ydn.debug.error.ArgumentException(
        'joint query not implemented yet');
  } else {
    var store_name = iter.getStoreName();
    var store = this.schema.getStore(store_name);
    if (index_name == store.getKeyPath()) {
      iter = ydn.db.ValueIterator.where(store_name,
          op, value, opt_op2, opt_value2);
    } else {
      iter = ydn.db.IndexValueIterator.where(store_name,
          index_name, op, value, opt_op2, opt_value2);
    }
  }

  return new ydn.db.Query(this.db, this.schema, iter, this.type);
};


/**
 * @return {ydn.db.schema.Store}
 */
ydn.db.Query.prototype.getStore = function() {
  return this.schema.getStore(this.iterators[0].getStoreName());
};


/**
 * Select query result.
 * @param {string|!Array.<string>} field_name_s select field name(s).
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.select = function(field_name_s) {
  var store = this.getStore();
  var fields = goog.isArray(field_name_s) ? field_name_s : [field_name_s];
  var type = this.type;
  var iter = this.iterators[0].copy();
  if (fields.length == 1) {
    // select a key
    var field = fields[0];
    if (field == ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME ||
        field === store.getKeyPath()) {
      type = ydn.db.base.QueryMethod.LIST_PRIMARY_KEY;
    } else if (!field || field == '*') {
      type = ydn.db.base.QueryMethod.LIST_VALUE;
    } else if (store.hasIndex(field)) {
      if (iter.isIndexIterator()) {
        var index_name = iter.getIndexName();
        if (field != index_name) {
          throw new ydn.debug.error.ArgumentException('select field name ' +
              'must be "' + index_name + '", but "' + field + '" found.');

        }
      } else {
        iter = new ydn.db.Iterator(iter.getStoreName(), field,
            iter.getKeyRange(), iter.isReversed(), iter.isUnique(), true);
      }
      type = ydn.db.base.QueryMethod.LIST_KEY;
    } else {
      throw new ydn.debug.error.ArgumentException('Invalid select "' +
          field + '", index not found in store "' +
          store.getName() + '"');
    }
  } else if (fields.length == 2) {
    if (!iter.isIndexIterator()) {
      throw new ydn.debug.error.ArgumentException('Only primary key can be ' +
          'selected for this query.');
    }
    for (var i = 0; i < 2; i++) {
      var is_primary = fields[i] == ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME ||
          store.isKeyPath(fields[i]);
      if (!is_primary) {
        var idx_name = iter.getIndexName();
        if (fields[i] != idx_name) {
          throw new ydn.debug.error.ArgumentException('select field name ' +
              'must be "' + idx_name + '", but "' + fields[i] + '" found.');
        }
      }
    }
    type = ydn.db.base.QueryMethod.LIST_KEYS;
  } else {
    throw new ydn.debug.error.ArgumentException('Selecting more than 2 field' +
        ' names is not supported, but ' + fields.length + ' fields selected.');
  }
  return new ydn.db.Query(this.db, this.schema, iter, type);
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {number=} opt_limit
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.list = function(opt_limit) {
  var offset = 0;
  var limit = opt_limit || ydn.db.base.DEFAULT_RESULT_LIMIT;
  var type = ydn.db.base.QueryMethod.LIST_VALUE;
  if (this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ||
      this.type == ydn.db.base.QueryMethod.LIST_KEYS ||
      this.type == ydn.db.base.QueryMethod.LIST_KEY) {
    type = this.type;
  }
  // console.log(this.iterator.getState(), this.iterator.getKey());
  if (this.iterators.length == 1) {
    var basic = new ydn.db.query.Base(this.db, this.schema);
    return basic.list(type, this.iterators[0], limit, offset);
  } else {
    var jq = new ydn.db.query.Restricted(this.db, this.schema);
    return jq.list(type, this.iterators, limit);
  }
};


/**
 * Patch object.
 * @param {!Object|string|!Array.<string>} arg1 Patch object, field name or
 * field names.
 * @param {*=} opt_arg2 field value or field values.
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.patch = function(arg1, opt_arg2) {
  if (goog.DEBUG) {
    if (arguments.length < 1) {
      throw new ydn.debug.error.ArgumentException('too few arguments');
    } else if (arguments.length == 2) {
      if (goog.isString(arg1)) {
        // any value is OK.
      } else if (goog.isArray(arg1)) {
        if (!goog.isArray(opt_arg2)) {
          throw new ydn.debug.error.ArgumentException('an array is expected ' +
              'for second argument but, ' + ydn.json.toShortString(opt_arg2) +
              ' of type ' + typeof opt_arg2 + ' found');
        } else if (arg1.length != opt_arg2.length) {
          throw new ydn.debug.error.ArgumentException('length of two input ' +
              'arguments must be equal but, ' + arg1.length +
              ' and ' + opt_arg2.length + ' found');
        }
      }
    } else if (arguments.length == 1) {
      if (!goog.isObject(arg1)) {
        throw new ydn.debug.error.ArgumentException('an object is expected ' +
            'but, ' + ydn.json.toShortString(arg1) + ' of type ' + typeof arg1 +
            ' found');
      }
    } else {
      throw new ydn.debug.error.ArgumentException('too many arguments');
    }
  }
  var basic = new ydn.db.query.Base(this.db, this.schema);
  var req = basic.patch(this.iterators[0], arg1, opt_arg2);
  return req;
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {function(this: T, !ydn.db.core.req.AbstractCursor)} cb
 * @param {T=} opt_scope
 * @return {!ydn.db.Request}
 * @template T
 */
ydn.db.Query.prototype.open = function(cb, opt_scope) {
  var basic = new ydn.db.query.Base(this.db, this.schema);
  var req = basic.open(this.iterators[0], cb, opt_scope);
  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.count = function() {
  var basic = new ydn.db.query.Base(this.db, this.schema);
  var req = basic.count(this.iterators[0]);
  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.clear = function() {
  var basic = new ydn.db.query.Base(this.db, this.schema);
  var req = basic.clear(this.iterators[0]);
  return req;
};


ydn.db.Query.prototype.filter = function(cb, opt_scope) {
  this.filter_ = cb;
  this.filter_scope_ = opt_scope;
};


/**
 * Create a new query.
 * @param {string} store_name
 * @param {string=} opt_op1 where operator.
 * @param {IDBKey=} opt_value1 rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.Query}
 */
ydn.db.core.Storage.prototype.from = function(store_name, opt_op1, opt_value1,
                                              opt_op2, opt_value2) {
  if (goog.DEBUG && !goog.isString(store_name)) {
    throw new TypeError('store name "' + store_name + '"');
  }
  if (!this.schema.hasStore(store_name)) {
    throw new ydn.debug.error.ArgumentException('Store "' + store_name +
        '" not found.');
  }
  var range;
  if (goog.isDef(opt_op1)) {
    if (!goog.isDef(opt_value1)) {
      throw new ydn.debug.error.ArgumentException('boundary value ' +
          'must be defined.');
    }
    range = ydn.db.KeyRange.where(opt_op1, opt_value1, opt_op2, opt_value2);
  } else if (goog.isDef(opt_op2)) {
    throw new ydn.debug.error.ArgumentException('second boundary must not be' +
        ' defined.');
  }
  var iter = new ydn.db.ValueIterator(store_name, range);
  return new ydn.db.Query(this.getIndexOperator(), this.schema, iter);
};


/**
 * Create a new query.
 * @param {string} store_name
 * @param {string=} opt_op1 where operator.
 * @param {IDBKey=} opt_value1 rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.Query}
 */
ydn.db.core.DbOperator.prototype.from = function(store_name, opt_op1,
    opt_value1, opt_op2, opt_value2) {
  if (goog.DEBUG && !goog.isString(store_name)) {
    throw new TypeError('store name "' + store_name + '"');
  }
  if (!this.schema.hasStore(store_name)) {
    throw new ydn.debug.error.ArgumentException('Store "' + store_name +
        '" not found.');
  }
  var range;
  if (goog.isDef(opt_op1)) {
    if (!goog.isDef(opt_value1)) {
      throw new ydn.debug.error.ArgumentException('boundary value ' +
          'must be defined.');
    }
    range = ydn.db.KeyRange.where(opt_op1, opt_value1, opt_op2, opt_value2);
  } else if (goog.isDef(opt_op2)) {
    throw new ydn.debug.error.ArgumentException('second boundary must not be' +
        ' defined.');
  }
  var iter = new ydn.db.ValueIterator(store_name, range);
  return new ydn.db.Query(this, this.schema, iter);
};


