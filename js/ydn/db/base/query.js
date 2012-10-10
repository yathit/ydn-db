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
 * @fileoverview Query object.
 *
 * Define database query declaratively.
 */


goog.provide('ydn.db.Query');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.error.ArgumentException');



/**
 * @param {string} sql_statement The sql statement.
 * @constructor
 */
ydn.db.Query = function(sql_statement) {
  // Note for V8 optimization, declare all properties in constructor.
  if (!goog.isString(sql_statement)) {
    throw new ydn.error.ArgumentException('SQL statement required');
  }

  this.sql = sql_statement;
};


/**
 * @private
 * @type {string}
 */
ydn.db.Query.prototype.sql = '';


/**
 * @inheritDoc
 */
ydn.db.Query.prototype.toJSON = function() {
  return {
    'sql': this.sql
  };
};


/**
 * @typedef {{
 *  field: string,
 *  op: string,
 *  value: string,
 *  op2: (string|undefined),
 * value2: (string|undefined)
 * }}
 */
ydn.db.Query.Where;


/**
 * Convenient method for SQL <code>WHERE</code> predicate.
 * @param {string} field index field name to query from.
 * @param {string} op where operator.
 * @param {string} value rvalue to compare.
 * @param {string=} op2 secound operator.
 * @param {string=} value2 second rvalue to compare.
 * @return {!ydn.db.Query} The query.
 */
ydn.db.Query.prototype.where = function(field, op, value, op2, value2) {

  var already =  goog.array.some(this.wheres, function(x) {
    return x.field === field;
  });

  if (already) {
    throw new ydn.error.ArgumentException(field);
  }

  this.wheres.push({field: field, op: op, value: value, op2: op2, value2: value2});

  return this;

//  var op_test = function(op, lv) {
//    if (op === '=' || op === '==') {
//      return function(x) {return x == lv};
//    } else if (op === '===') {
//      return function(x) {return x === lv};
//    } else if (op === '>') {
//      return function(x) {return x > lv};
//    } else if (op === '>=') {
//      return function(x) {return x >= lv};
//    } else if (op === '<') {
//      return function(x) {return x < lv};
//    } else if (op === '<=') {
//      return function(x) {return x <= lv};
//    } else if (op === '!=') {
//      return function(x) {return x != lv};
//    } else {
//      goog.asserts.assert(false, 'Invalid op: ' + op);
//    }
//  };
//
//  var test1 = op_test(op, value);
//  var test2 = goog.isDef(op2) && goog.isDef(value2) ?
//      op_test(op2, value2) : goog.functions.TRUE;
//
//  var prev_filter = this.filter || goog.functions.TRUE;
//
//  this.filter = function(obj) {
//    return prev_filter(obj) && test1(obj[field]) && test2(obj[field]);
//  };
//  return this;
};


/**
 * @protected
 * @type {!Array<!ydn.db.Query.Where>}
 */
ydn.db.Query.prototype.wheres = [];


/**
 * @enum {string}
 */
ydn.db.Query.MapType = {
  SELECT: 'sl'
};


/**
 * @typedef {{
 *   type: ydn.db.Query.MapType,
 *   fields: !Array.<string>
 * }}
 */
ydn.db.Query.Map;


/**
 *
 * @type {ydn.db.Query.Map}
 */
ydn.db.Query.prototype.map = null;



/**
 * @enum {string}
 */
ydn.db.Query.AggregateType = {
  COUNT: 'ct',
  SUM: 'sm',
  AVERAGE: 'av',
  MAX: 'mx',
  MIN: 'mn'
};


/**
 * @typedef {{
 *   type: ydn.db.Query.AggregateType,
 *   field: (string|undefined)
 * }}
 */
ydn.db.Query.Aggregate;


/**
 *
 * @type {ydn.db.Query.Aggregate}
 */
ydn.db.Query.prototype.aggregate = null;


/**
 * Convenient method for SQL <code>COUNT</code> method.
 * @return {!ydn.db.Query} The query.
 */
ydn.db.Query.prototype.count = function() {

  if (this.aggregate) {
    throw new ydn.error.ConstrainError('Aggregate method already defined.');
  }
  this.aggregate = {type: ydn.db.Query.AggregateType.COUNT};
  return this;

//  this.reduce = function(prev) {
//    if (!prev) {
//      prev = 0;
//    }
//    return prev + 1;
//  };
//  return this;
};


/**
 * Convenient method for SQL <code>SUM</code> method.
 * @param {string} field name.
 * @return {!ydn.db.Query} The query for chaining.
 */
ydn.db.Query.prototype.sum = function(field) {

  if (this.aggregate) {
    throw new ydn.error.ConstrainError('Aggregate method already defined.');
  }
  this.aggregate = {
    type: ydn.db.Query.AggregateType.SUM,
    field: field
  };
  return this;

//  this.reduce = function(prev, curr, i) {
//    if (!goog.isDef(prev)) {
//      prev = 0;
//    }
//    return prev + curr[field];
//  };
//  return this;
};


/**
 * Convenient method for SQL <code>AVERAGE</code> method.
 * @param {string} field name.
 * @return {!ydn.db.Query} The query for chaining.
 */
ydn.db.Query.prototype.average = function(field) {

  if (this.aggregate) {
    throw new ydn.error.ConstrainError('Aggregate method already defined.');
  }
  this.aggregate = {
    type: ydn.db.Query.AggregateType.AVERAGE,
    field: field
  };
  return this;

//  this.reduce = function(prev, curr, i) {
//    if (!goog.isDef(prev)) {
//      prev = 0;
//    }
//    return (prev * i + curr[field]) / (i + 1);
//  };
//  return this;
};


/**
 *
 * @param {string|Array.<string>} fields field names to select.
 * @return {!ydn.db.Query} The query for chaining.
 */
ydn.db.Query.prototype.select = function(fields) {

  if (this.map) {
    throw new ydn.error.ConstrainError('Map method already defined.');
  }
  var fs = goog.isString(fields) ? [fields] : goog.isArray(fields) ?
    fields : null;
  if (!fields) {
    throw new ydn.error.ArgumentException();
  }
  this.map = {
    type: ydn.db.Query.MapType.SELECT,
    field: fields
  };
  return this;

//  this.map = function(data) {
//    if (goog.isString(arg1)) {
//      return data[arg1];
//    } else {
//      var selected_data = {};
//      for (var i = 0; i < arg1.length; i++) {
//        selected_data[arg1[i]] = data[arg1[i]];
//      }
//      return selected_data;
//    }
//  };
//  return this;
};



/**
 * @param {string?} keyPath if index is not defined, keyPath will be used.
 * @return {{where_clause: string, params: Array}} return equivalent of keyRange
 * to SQL WHERE clause and its parameters.
 */
ydn.db.Query.prototype.toWhereClause = function(keyPath) {

  var where_clause = '';
  var params = [];
  var index = goog.isDef(this.index) ? this.index :
      goog.isDefAndNotNull(keyPath) ? keyPath :
          ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  var column = goog.string.quote(index);

  if (ydn.db.Query.isLikeOperation_(this.keyRange)) {
    where_clause = column + ' LIKE ?';
    params.push(this.keyRange['lower'] + '%');
  } else {

    if (goog.isDef(this.keyRange.lower)) {
      var lowerOp = this.keyRange['lowerOpen'] ? ' > ' : ' >= ';
      where_clause += ' ' + column + lowerOp + '?';
      params.push(this.keyRange.lower);
    }
    if (goog.isDef(this.keyRange['upper'])) {
      var upperOp = this.keyRange['upperOpen'] ? ' < ' : ' <= ';
      var and = where_clause.length > 0 ? ' AND ' : ' ';
      where_clause += and + column + upperOp + '?';
      params.push(this.keyRange.upper);
    }

  }

  return {where_clause: where_clause, params: params};
};


/**
 * @override
 */
ydn.db.Query.prototype.toString = function() {
  var idx = goog.isDef(this.index) ? ':' + this.index : '';
  return 'query:' + this.store_name + idx;
};




/**
 * @private
 * @param {ydn.db.KeyRange|ydn.db.IDBKeyRange=} keyRange key range to check.
 * @return {boolean} true if given key range can be substitute with SQL
 * operation LIKE.
 */
ydn.db.Query.isLikeOperation_ = function(keyRange) {
  if (!goog.isDefAndNotNull(keyRange)) {
    return false;
  }
  return goog.isDef(keyRange.lower) && goog.isDef(keyRange.upper) &&
    !keyRange.lowerOpen && !keyRange.upperOpen &&
    keyRange.lower.length == keyRange.upper.length + 1 &&
    keyRange.upper[keyRange.lower.length - 1] == '\uffff';
};
