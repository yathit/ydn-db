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
 * @fileoverview Query directly execute on raw cursor.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.query.Base');
goog.require('ydn.db.core.Storage');



/**
 * Query directly execute on raw cursor.
 * @param {ydn.db.core.DbOperator} db
 * @param {ydn.db.schema.Database} schema
 * @constructor
 * @struct
 */
ydn.db.query.Base = function(db, schema) {
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
ydn.db.query.Base.DEBUG = false;


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {ydn.db.base.QueryMethod} mth query method.
 * @param {!ydn.db.Iterator} iterator
 * @param {number} limit
 * @param {number} offset
 * @return {!ydn.db.Request}
 */
ydn.db.query.Base.prototype.list = function(mth, iterator, limit, offset) {
  // console.log(this.iterator.getState(), this.iterator.getKey());
  var req = this.db.listIter(mth, iterator, limit, offset);
  return req;
};


/**
 * Patch object.
 * @param {!ydn.db.Iterator} iterator iterator.
 * @param {!Object|string|!Array.<string>} arg1 Patch object, field name or
 * field names.
 * @param {*=} opt_arg2 field value or field values.
 * @return {!ydn.db.Request}
 */
ydn.db.query.Base.prototype.patch = function(iterator, arg1, opt_arg2) {
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
  }, iterator, ydn.db.base.TransactionMode.READ_WRITE, this);
  return req;
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {!ydn.db.Iterator} iterator iterator.
 * @param {function(this: T, !ydn.db.core.req.AbstractCursor)} cb
 * @param {T=} opt_scope
 * @return {!ydn.db.Request}
 * @template T
 */
ydn.db.query.Base.prototype.open = function(iterator, cb, opt_scope) {
  var req = this.db.open(cb, iterator,
      ydn.db.base.TransactionMode.READ_WRITE, opt_scope);
  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @param {ydn.db.Iterator} iter iterator.
 * @return {!ydn.db.Request}
 */
ydn.db.query.Base.prototype.count = function(iter) {
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
ydn.db.query.Base.prototype.clear = function(iter) {
  var req = iter.isIndexIterator() ?
      this.db.clear(iter.getStoreName(), iter.getIndexName(), iter.keyRange()) :
      this.db.clear(iter.getStoreName(), iter.keyRange());
  return req;
};

