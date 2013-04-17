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
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 11/12/12
 */


goog.provide('ydn.db.sql.req.idb.ReduceNode');
goog.require('ydn.db.sql.req.idb.Node');
goog.require('ydn.object');



/**
 *
 * @param {!ydn.db.schema.Store} schema store schema.
 * @param {!ydn.db.Sql} sql store name.
 * @extends {ydn.db.sql.req.idb.Node}
 * @constructor
 * @struct
 */
ydn.db.sql.req.idb.ReduceNode = function(schema, sql) {
  goog.base(this, schema, sql);
};
goog.inherits(ydn.db.sql.req.idb.ReduceNode, ydn.db.sql.req.idb.Node);


/**
 * @param {ydn.db.con.IDatabase.Transaction} tx transaction object.
 * @param {string} tx_no tx label.
 * @param {?function(*, boolean=)} df return key in deferred function.
 * @param {ydn.db.core.req.IRequestExecutor} req request executor.
 */
ydn.db.sql.req.idb.ReduceNode.prototype.execute = function(tx, tx_no, df, req) {

  var me = this;
  var out;

  var store_name = this.sql.getStoreNames()[0];
  var wheres = this.sql.getConditions();
  /**
   *
   * @type {IDBKeyRange}
   */
  var key_range = null;
  var reverse = this.sql.isReversed();
  if (wheres.length == 0) {
    key_range = null;
  } else if (wheres.length == 1) {
    key_range = ydn.db.KeyRange.parseIDBKeyRange(wheres[0].getKeyRange());
  } else {
    throw new ydn.error.NotSupportedException('too many conditions.');
  }

  var aggregate = this.sql.getAggregate();
  if (aggregate == 'COUNT') {
    if (key_range) {
      req.countKeyRange(tx, tx_no, df, store_name, key_range,
          wheres[0].getField(), false);
    } else {
      req.countKeyRange(tx, tx_no, df, store_name, null, undefined, false);
    }
  } else {
    var reduce;
    var fields = this.sql.getSelList();
    if (!fields || fields.length == 0) {
      throw new ydn.error.InvalidOperationError(
          'field name require for reduce operation: ' + aggregate);
    }
    var field_name = fields[0];
    if (aggregate == 'MIN') {
      reduce = ydn.db.sql.req.idb.ReduceNode.reduceMin(field_name);
    } else if (aggregate == 'MAX') {
      reduce = ydn.db.sql.req.idb.ReduceNode.reduceMax(field_name);
    } else if (aggregate == 'AVG') {
      out = 0;
      reduce = ydn.db.sql.req.idb.ReduceNode.reduceAverage(field_name);
    } else if (aggregate == 'SUM') {
      out = 0;
      reduce = ydn.db.sql.req.idb.ReduceNode.reduceSum(field_name);
    } else {
      throw new ydn.error.NotSupportedException(aggregate);
    }

    // TODO: optimization
    // if (this.store_schema.hasIndex(field_name)) {

    var iter;
    if (key_range) {
      iter = new ydn.db.IndexValueCursors(store_name, wheres[0].getField(),
          key_range);
    } else {
      iter = new ydn.db.ValueCursors(store_name);
    }

    var cursor = iter.iterate(tx, tx_no, req);

    /**
     *
     * @param {!Error} e
     */
    cursor.onFail = function(e) {
      df(e, true);
    };
    var i = 0;
    /**
     *
     * @param {IDBKey=} opt_key
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDef(opt_key)) {
        var value = iter.isKeyOnly() ?
            cursor.getPrimaryKey() : cursor.getValue();
        out = reduce(value, out, i);
        cursor.advance(1);
        i++;
      } else {
        df(out);
      }
    };
  }


};


/**
 * Return reduce iteration function for AVERAGE
 * @param {string} field name.
 * @return {Function} average.
 */
ydn.db.sql.req.idb.ReduceNode.reduceAverage = function(field) {
  return function(curr, prev, i) {
    if (!goog.isDef(prev)) {
      prev = 0;
    }
    return (prev * i + curr[field]) / (i + 1);
  };
};


/**
 * Return reduce iteration function for SUM
 * @param {string} field field name.
 * @return {Function} sum.
 */
ydn.db.sql.req.idb.ReduceNode.reduceSum = function(field) {
  return function(curr, prev, i) {
    return prev + curr[field];
  };
};


/**
 * Return reduce iteration function for MIN
 * @param {string} field name.
 * @return {Function} min.
 */
ydn.db.sql.req.idb.ReduceNode.reduceMin = function(field) {
  return function(curr, prev, i) {
    var x = curr[field];
    if (!goog.isDef(prev)) {
      return x;
    }
    return prev < x ? prev : x;
  };
};


/**
 * Return reduce iteration function for MAX
 * @param {string} field name.
 * @return {Function} max.
 */
ydn.db.sql.req.idb.ReduceNode.reduceMax = function(field) {
  return function(curr, prev, i) {
    var x = curr[field];
    if (!goog.isDef(prev)) {
      return x;
    }
    return prev > x ? prev : x;
  };
};

