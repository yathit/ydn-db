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
 * @fileoverview Query object to feed WebSQL iterator.
 *
 *
 */


goog.provide('ydn.db.req.SqlQuery');
goog.require('ydn.db.req.IdbQuery');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.error.ArgumentException');



/**
 * Create a SQL query object from a query object.
 *
 * This clone given query object and added iteration functions so that
 * query processor can mutation as part of query optimization processes.
 *
 * @param {string} store store name.
 * @param {ydn.db.Query.Direction=} direction cursor direction.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {ydn.db.KeyRange=}
  * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given.
 * @param {Function=} filter filter function.
 * @param {Function=} continued continued function.
 * @extends {ydn.db.req.IdbQuery}
 * @constructor
 */
ydn.db.req.SqlQuery = function(store, direction, index, keyRange, filter, continued) {
  // Note for V8 optimization, declare all properties in constructor.
  goog.base(this, store, direction, index, keyRange, filter, continued);

  this.parseRow = ydn.db.req.SqlQuery.prototype.parseRow;
  this.sql = '';
  this.params = [];
};
goog.inherits(ydn.db.req.SqlQuery, ydn.db.req.IdbQuery);



/**
 * @inheritDoc
 */
ydn.db.req.SqlQuery.prototype.toJSON = function() {
  return {
    'store': this.store_name,
    'index': this.index,
    'key_range': this.keyRange ? ydn.db.KeyRange.toJSON(this.keyRange) : null,
    'direction': this.direction,
    'sql': this.sql,
    'params': this.params
  };
};



/**
 * @param {string?} keyPath if index is not defined, keyPath will be used.
 * @return {{sql: string, params: !Array.<string>}} return equivalent of
 * keyRange
 * to SQL WHERE clause and its parameters.
 */
ydn.db.req.SqlQuery.prototype.toWhereClause = function(keyPath) {

  var index = goog.isDef(this.index) ? this.index :
      goog.isDefAndNotNull(keyPath) ? keyPath :
          ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  var column = goog.string.quote(index);

  var where = new ydn.db.Where(column, keyPath);

  return where.toWhereClause();
};




/**
 * SQL statement for executing.
 * @type {string} sql string.
 */
ydn.db.req.SqlQuery.prototype.sql = '';


/**
 * SQL parameters for executing SQL.
 * @type {!Array.<string>} sql parameters.
 */
ydn.db.req.SqlQuery.prototype.params = [];




/**
 * @override
 */
ydn.db.req.SqlQuery.prototype.toString = function() {
  var idx = goog.isDef(this.index) ? ':' + this.index : '';
  return 'Cursor:' + this.store_name + idx;
};



/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @param {!Object} row row.
 * @param {ydn.db.schema.Store} store store schema.
 * @return {!Object} parse value.
 */
ydn.db.req.SqlQuery.prototype.parseRow = function(row, store) {
  return ydn.db.req.SqlQuery.parseRow(row, store);
};



/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @final
 * @param {!Object} row row.
 * @param {ydn.db.schema.Store} store store schema.
 * @return {!Object} parse value.
 */
ydn.db.req.SqlQuery.parseRow = function(row, store) {
  var value = ydn.json.parse(row[ydn.db.base.DEFAULT_BLOB_COLUMN]);
  if (goog.isDefAndNotNull(store.keyPath)) {
    var key = ydn.db.schema.Index.sql2js(row[store.keyPath], store.type);
    store.setKeyValue(value, key);
  }
  for (var j = 0; j < store.indexes.length; j++) {
    var index = store.indexes[j];
    if (index.name == ydn.db.base.DEFAULT_BLOB_COLUMN) {
      continue;
    }
    var x = row[index.name];
    value[index.name] = ydn.db.schema.Index.sql2js(x, index.type);
  }
  return value;
};


/**
 * Return given input row.
 * @final
 * @param {!Object} row row.
 * @param {ydn.db.schema.Store} store store schema.
 * @return {!Object} the first field of object in row value.
 */
ydn.db.req.SqlQuery.parseRowIdentity = function(row, store) {
  return row;
};

//
///**
// * @final
// * @param {string} op
// * @param {number|string} lv
// * @param {number|string} x
// * @return {boolean}
// */
//ydn.db.req.SqlQuery.op_test = function(op, lv, x) {
//  if (op === '=' || op === '==') {
//    return  x == lv;
//  } else if (op === '===') {
//    return  x === lv;
//  } else if (op === '>') {
//    return  x > lv;
//  } else if (op === '>=') {
//    return  x >= lv;
//  } else if (op === '<') {
//    return  x < lv;
//  } else if (op === '<=') {
//    return  x <= lv;
//  } else if (op === '!=') {
//    return  x != lv;
//  } else {
//    throw new Error('Invalid op: ' + op);
//  }
//};




