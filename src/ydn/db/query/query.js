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
goog.require('ydn.db.query.ConjQuery');



/**
 * Query builder class.
 * @param {ydn.db.core.DbOperator} db
 * @param {ydn.db.schema.Database} schema
 * @param {ydn.db.base.QueryMethod?} type query type. Default to values.
 * @param {string} store_name index name.
 * @param {string?} index_name index name.
 * @param {ydn.db.KeyRange} kr key range.
 * @param {boolean=} opt_reverse reverse dir.
 * @param {boolean=} opt_unique unique dir.
 * @constructor
 * @extends {ydn.db.query.Base}
 * @struct
 */
ydn.db.Query = function(db, schema, type, store_name, index_name, kr, opt_reverse,
                        opt_unique) {
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
   * @type {ydn.db.KeyRange}
   */
  this.key_range = kr || null;
  /**
   * @final
   * @protected
   * @type {string}
   */
  this.store_name = store_name;
  /**
   * @final
   * @protected
   * @type {string?}
   */
  this.index_name = index_name || null;
  /**
   * @type {boolean}
   */
  this.is_reverse = !!opt_reverse;
  /**
   * @type {boolean}
   */
  this.is_unique = !!opt_unique;
  /**
   * Cursor position.
   * @type {Array.<IDBKey>} [key, primaryKey]
   * @protected
   */
  this.marker = null;

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
  return new ydn.db.Query(this.db, this.schema, this.type, this.store_name,
      this.index_name, this.key_range, this.is_reverse, this.is_unique);
};


/**
 * @return {!ydn.db.Query} return a new query.
 */
ydn.db.Query.prototype.reverse = function() {

  return new ydn.db.Query(this.db, this.schema, this.type, this.store_name,
      this.index_name, this.key_range, !this.is_reverse, this.is_unique);
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

  if (!this.index_name) {
    throw new ydn.debug.error.ArgumentException('primary key query is ' +
        'already unique');
  }
  return new ydn.db.Query(this.db, this.schema, this.type, this.store_name,
      this.index_name, this.key_range, this.is_reverse, val);
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

  var iter = this.getIterator();
  var store = this.schema.getStore(iter.getStoreName());
  var kr = this.key_range;
  var index = this.index_name;
  if (this.index_name) {
    if (this.index_name != orders[0]) {
      index = [this.index_name, orders[0]];
      if (kr) {
        if (kr.lower == kr.upper) {
          kr = ydn.db.KeyRange.starts([kr.lower]);
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
        index = orders[0];
        kr = null;
      }
    }
  }
  var index_name = index ? store.getIndexName(index) : null;
  return new ydn.db.Query(this.db, this.schema, this.type, this.store_name,
      index_name, kr, this.is_reverse, this.is_unique);
};


/**
 * Create a new value cursor range iterator using where clause condition.
 * @param {string} index_name index name.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.query.Base} return this for chaining.
 */
ydn.db.Query.prototype.where = function(index_name, op, value, opt_op2,
    opt_value2) {
  var kr = ydn.db.KeyRange.where(op, value, opt_op2, opt_value2);
  var q = new ydn.db.Query(this.db, this.schema, this.type, this.store_name,
      index_name, kr, this.is_reverse, this.is_unique);
  if (this.key_range) {
    if (this.index_name == index_name) {
      kr = this.key_range.and(kr);
      return new ydn.db.Query(this.db, this.schema, this.type, this.store_name,
          index_name, kr, this.is_reverse, this.is_unique);
    } else {
      return this.and(q);
    }
  } else {
    return q;
  }
};


/**
 * @return {ydn.db.schema.Store}
 */
ydn.db.Query.prototype.getStore = function() {
  return this.schema.getStore(this.store_name);
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
  var kr = this.key_range;
  var index = this.index_name;
  if (fields.length == 1) {
    // select a key
    var field = fields[0];
    if (field == ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME ||
        field === store.getKeyPath()) {
      type = ydn.db.base.QueryMethod.LIST_PRIMARY_KEY;
    } else if (!field || field == '*') {
      type = ydn.db.base.QueryMethod.LIST_VALUE;
    } else if (store.hasIndex(field)) {
      if (this.index_name) {
        if (field != this.index_name) {
          throw new ydn.debug.error.ArgumentException('select field name ' +
              'must be "' + this.index_name + '", but "' + field + '" found.');

        }
      } else {
        index = field;
      }
      type = ydn.db.base.QueryMethod.LIST_KEY;
    } else {
      throw new ydn.debug.error.ArgumentException('Invalid select "' +
          field + '", index not found in store "' +
          store.getName() + '"');
    }
  } else if (fields.length == 2) {
    if (!index) {
      throw new ydn.debug.error.ArgumentException('Only primary key can be ' +
          'selected for this query.');
    }
    for (var i = 0; i < 2; i++) {
      var is_primary = fields[i] == ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME ||
          store.isKeyPath(fields[i]);
      if (!is_primary) {
        if (fields[i] != index) {
          throw new ydn.debug.error.ArgumentException('select field name ' +
              'must be "' + index + '", but "' + fields[i] + '" found.');
        }
      }
    }
    type = ydn.db.base.QueryMethod.LIST_KEYS;
  } else {
    throw new ydn.debug.error.ArgumentException('Selecting more than 2 field' +
        ' names is not supported, but ' + fields.length + ' fields selected.');
  }
  var index_name = index ? store.getIndexName(index) : null;
  return new ydn.db.Query(this.db, this.schema, type, this.store_name,
      index_name, kr, this.is_reverse, this.is_unique);
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
  var iter = this.getIterator();
  if (this.marker && this.marker[0]) {
    // console.log('starting from ' + this.marker[0]);
    iter = iter.resume(this.marker[0], this.marker[1]);
  }
  if (this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ||
      this.type == ydn.db.base.QueryMethod.LIST_KEYS ||
      this.type == ydn.db.base.QueryMethod.LIST_KEY) {
    mth = this.type;
  }

  var req = this.db.listIter(mth, iter, limit, offset);
  req.addCallback(function(x) {
    if (iter.getState() == ydn.db.Iterator.State.RESTING) {
      // iteration not finished
      // console.log('end in ' + iter.getKey());
      this.marker = [iter.getKey()];
      if (this.index_name) {
        this.marker.push(iter.getPrimaryKey());
      }
    }
  }, this);
  return req;
};


/**
 * @inheritDoc
 */
ydn.db.Query.prototype.getIterators = function() {
  return [this.getIterator(true)];
};


/**
 * Get iterator.
 * @param {boolean=} opt_key_only return key only iterator.
 * @return {!ydn.db.Iterator}
 */
ydn.db.Query.prototype.getIterator = function(opt_key_only) {
  var is_key_only = !!opt_key_only ||
      (this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ||
      this.type == ydn.db.base.QueryMethod.LIST_KEYS ||
      this.type == ydn.db.base.QueryMethod.LIST_KEY);
  var kr = this.key_range;
  if (is_key_only) {
    return this.index_name ?
        new ydn.db.IndexIterator(this.store_name, this.index_name, kr,
            this.is_reverse, this.is_unique) :
        new ydn.db.KeyIterator(this.store_name, kr, this.is_reverse);
  } else {
    return this.index_name ?
        new ydn.db.IndexValueIterator(this.store_name, this.index_name,
            kr, this.is_reverse, this.is_unique) :
        new ydn.db.ValueIterator(this.store_name, kr, this.is_reverse);
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
  }, this.getIterator(), ydn.db.base.TransactionMode.READ_WRITE, this);
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
  var req = this.db.open(cb, this.getIterator(),
      ydn.db.base.TransactionMode.READ_WRITE, opt_scope);
  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.count = function() {
  var req;
  if (this.index_name) {
    if (this.is_unique) {
      req = this.db.count(this.getIterator(true));
    } else {
      req = this.db.count(this.store_name, this.index_name, this.key_range);
    }
  } else {
    req = this.db.count(this.store_name, this.key_range);
  }
  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.clear = function() {
  var req = this.index_name ?
      this.db.clear(this.store_name, this.index_name, this.key_range) :
      this.db.clear(this.store_name, this.key_range);
  return req;
};


/**
 * Create AND query.
 * @param {ydn.db.query.Base} q
 * @return {!ydn.db.query.ConjQuery}
 */
ydn.db.Query.prototype.and = function(q) {
  var iters = q.getIterators().concat(this.getIterators());
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
  var range = null;
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
  return new ydn.db.Query(this.getIndexOperator(), this.schema, null,
      store_name, null, range);
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
  var range = null;
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
  return new ydn.db.Query(this, this.schema, null, store_name, null, range);
};


