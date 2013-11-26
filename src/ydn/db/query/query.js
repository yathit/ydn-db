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



/**
 * Query builder class.
 * @param {ydn.db.core.DbOperator} db
 * @param {ydn.db.schema.Database} schema
 * @param {ydn.db.base.QueryMethod} type query type. Default to values.
 * @param {!ydn.db.Iterator} iter key range.
 * @constructor
 * @extends {ydn.db.query.Base}
 * @struct
 */
ydn.db.Query = function(db, schema, type, iter) {
  goog.base(this, db, schema, type);
  /**
   * @final
   * @protected
   * @type {Array.<string>}
   */
  this.orders = [];
  /**
   * @final
   * @protected
   * @type {!ydn.db.Iterator}
   */
  this.iterator = iter;

};
goog.inherits(ydn.db.Query, ydn.db.query.Base);


/**
 * @define {boolean} debug flag.
 */
ydn.db.Query.DEBUG = false;


/**
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.copy = function() {

  var q = new ydn.db.Query(this.db, this.schema, this.iterator.copy(), this.type);

  return q;
};


/**
 * @return {!ydn.db.Query} return a new query.
 */
ydn.db.Query.prototype.reverse = function() {

  return new ydn.db.Query(this.db, this.schema, this.iterator.reverse(),
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

  var iter = this.iterator;
  if (!iter.isIndexIterator()) {
    throw new ydn.debug.error.ArgumentException('primary key query is ' +
        'already unique');
  }
  return new ydn.db.Query(this.db, this.schema, iter.unique(val),
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

  var iter = this.iterator;
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

  var iter = this.iterator;
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
  return this.schema.getStore(this.iterator.getStoreName());
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
  var iter = this.iterator.copy();
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
  var mth = ydn.db.base.QueryMethod.LIST_VALUE;
  if (this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ||
      this.type == ydn.db.base.QueryMethod.LIST_KEYS ||
      this.type == ydn.db.base.QueryMethod.LIST_KEY) {
    mth = this.type;
  }

  return this.db.listIter(mth, this.iterator, limit, offset);
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
  var req = this.db.open(function(cursor) {
    var val = /** @type {!Object} */ (cursor.getValue());
    if (goog.isString(arg1)) {
      ydn.db.utils.setValueByKeys(val, arg1, opt_arg2);
    } else if (goog.isArray(arg1)) {
      for (var i = 0; i < arg1.length; i++) {
        ydn.db.utils.setValueByKeys(val, arg1[i], opt_arg2[i]);
      }
    } else if (goog.isObject(arg1)) {
      for (var k in arg1) {
        if (arg1.hasOwnProperty(k)) {
          val[k] = arg1[k];
        }
      }
    }
    req.awaitDeferred(cursor.update(val));
  }, this.iterator, ydn.db.base.TransactionMode.READ_WRITE, this);
  return req;
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {function(this: T, !ydn.db.core.req.ICursor)} cb
 * @param {T=} opt_scope
 * @return {!ydn.db.Request}
 * @template T
 */
ydn.db.Query.prototype.open = function(cb, opt_scope) {
  var req = this.db.open(cb, this.iterator,
      ydn.db.base.TransactionMode.READ_WRITE, opt_scope);
  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.count = function() {
  var basic = new ydn.db.query.Base(this.db, this.schema);
  var iter = this.iterator;
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
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.clear = function() {
  var iter = this.iterator;
  var req = iter.isIndexIterator() ?
      this.db.clear(iter.getStoreName(), iter.getIndexName(), iter.keyRange()) :
      this.db.clear(iter.getStoreName(), iter.keyRange());
  return req;
};


/**
 * Create AND query.
 * @param {ydn.db.query.Base} q
 * @return {ydn.db.query.ConjQuery}
 */
ydn.db.Query.prototype.and = function(q) {
  var iters = q.getIterators();
  iters.push(this.iterator);
  return new ydn.db.query.ConjQuery(this.db, this.schema, this.type, iters);
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


