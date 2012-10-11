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
goog.require('ydn.db.DatabaseSchema');



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

  this.wheres = [];
  this.aggregate = null;
  this.map = null;
  this.direction = undefined;
  this.index = undefined;
};


/**
 *
 * @type {string|undefined}
 */
ydn.db.Query.prototype.index = undefined;


/**
 *
 * @type {ydn.db.Cursor.Direction|undefined}
 */
ydn.db.Query.prototype.direction = undefined;


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
 *
 * @param {boolean} value if <code>true</code>,  the cursor should not yield
 * records with the same key.
 * @return {ydn.db.Query} this query for chaining.
 */
ydn.db.Query.prototype.unique = function(value) {
  if (this.direction == ydn.db.Cursor.Direction.NEXT || this.direction == ydn.db.Cursor.Direction.NEXT_UNIQUE) {
    this.direction = !!value ? ydn.db.Cursor.Direction.NEXT_UNIQUE : ydn.db.Cursor.Direction.NEXT;
  } else {
    this.direction = !!value ? ydn.db.Cursor.Direction.PREV_UNIQUE : ydn.db.Cursor.Direction.PREV;
  }
  return this;
};


/**
 *
 * @param {boolean} value if <code>true</code>,  the cursor should yield
 * monotonically decreasing order of keys..
 * @return {ydn.db.Query} this query for chaining.
 */
ydn.db.Query.prototype.reverse = function(value) {
  if (this.direction == ydn.db.Cursor.Direction.NEXT_UNIQUE || this.direction == ydn.db.Cursor.Direction.PREV_UNIQUE) {
    this.direction = !!value ? ydn.db.Cursor.Direction.PREV_UNIQUE : ydn.db.Cursor.Direction.NEXT_UNIQUE;
  } else {
    this.direction = !!value ? ydn.db.Cursor.Direction.PREV : ydn.db.Cursor.Direction.NEXT;
  }
  return this;
};


/**
 *
 * @param {string} index
 */
ydn.db.Query.prototype.orderBy = function(index) {
  this.index = index;
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
 * Process where instruction into filter iteration method.
 * @param {string} field index field name to query from.
 * @param {string} op where operator.
 * @param {string} value rvalue to compare.
 * @param {string=} op2 secound operator.
 * @param {string=} value2 second rvalue to compare.
 * @protected
 */
ydn.db.Query.processWhere = function(cursor, field, op, value, op2, value2) {

  var op_test = function(op, lv) {
    if (op === '=' || op === '==') {
      return function(x) {return x == lv};
    } else if (op === '===') {
      return function(x) {return x === lv};
    } else if (op === '>') {
      return function(x) {return x > lv};
    } else if (op === '>=') {
      return function(x) {return x >= lv};
    } else if (op === '<') {
      return function(x) {return x < lv};
    } else if (op === '<=') {
      return function(x) {return x <= lv};
    } else if (op === '!=') {
      return function(x) {return x != lv};
    } else {
      goog.asserts.assert(false, 'Invalid op: ' + op);
    }
  };

  var test1 = op_test(op, value);
  var test2 = goog.isDef(op2) && goog.isDef(value2) ?
      op_test(op2, value2) : goog.functions.TRUE;

  var prev_filter = cursor.filter || goog.functions.TRUE;

  cursor.filter = function(obj) {
    return prev_filter(obj) && test1(obj[field]) && test2(obj[field]);
  };
};


/**
 * @protected
 * @type {!Array.<!ydn.db.Query.Where>}
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
 * @type {ydn.db.Query.Map?}
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
 * @type {ydn.db.Query.Aggregate?}
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
  this.aggregate = {type: ydn.db.Query.AggregateType.COUNT, field: undefined};
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


};


/**
 * Return reduce iteration function for SUM
 * @param {string} field
 * @return {Function}
 */
ydn.db.Query.reduceSum = function(field) {
  return function(prev, curr, i) {
    if (!goog.isDef(prev)) {
      prev = 0;
    }
    return prev + curr[field];
  };
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


};


/**
 * Return reduce iteration function for AVERAGE
 * @param {string} field
 * @return {Function}
 */
ydn.db.Query.reduceAverage = function (field) {
  return function (prev, curr, i) {
    if (!goog.isDef(prev)) {
      prev = 0;
    }
    return (prev * i + curr[field]) / (i + 1);
  };
};


/**
 *
 * @param {string|Array.<string>} fields field names to select.
 * @return {!ydn.db.Query} The query for chaining.
 */
ydn.db.Query.prototype.select = function (fields) {

  if (this.map) {
    throw new ydn.error.ConstrainError('Map method already defined.');
  }
  var fs = goog.isString(fields) ? [fields] : goog.isArray(fields) ?
    fields : null;
  if (goog.isNull(fs)) {
    throw new ydn.error.ArgumentException();
  } else {
    this.map = {
      type:ydn.db.Query.MapType.SELECT,
      fields:fs
    };
  }

  return this;
};


/**
 *
 * @param {!Array.<string>|string} fields
 * @return {Function}
 */
ydn.db.Query.mapSelect = function (fields) {
  return function (data) {
    if (goog.isString(fields)) {
      return data[fields];
    } else {
      var selected_data = {};
      for (var i = 0; i < fields.length; i++) {
        selected_data[fields[i]] = data[fields[i]];
      }
      return selected_data;
    }
  };
};


/**
 *
 * @return {string}
 */
ydn.db.Query.prototype.getStoreName = function() {
  var store_name = goog.string.stripQuotes(this.sql, '"');
  return store_name;
};



/**
 * Parse SQL statement and convert to cursor object.
 * @param {ydn.db.DatabaseSchema} schema
 * @return {!ydn.db.Cursor}
 */
ydn.db.Query.prototype.toCursor = function(schema) {

  /**
   * @type {ydn.db.Cursor}
   */
  var cursor;
  // assumeing sql_statement is just a database name
  var store_name = goog.string.stripQuotes(this.sql, '"');
  var store = schema.getStore(store_name);
  if (store) {
    cursor = new ydn.db.Cursor(store_name, this.direction, this.index);
  } else {
    throw new ydn.db.SqlParseError(this.sql);
  }

  // sniff index field
  if (!goog.isDef(this.index)) {
    for (var i = 0; i < this.wheres.length; i++) {
      /**
       * @type {ydn.db.Query.Where}
       */
      var where = this.wheres[i];
      if (store.hasIndex(where.field)) {
        this.index = where.field;
        if (goog.isDef(where.op2)) {
          this.key_range = new ydn.db.KeyRange(where.value, where.value2,
            where.op == '>', where.op2 == '<');
        } else {
          this.key_range = new ydn.db.KeyRange(where.value, undefined,
            where.op == '>', undefined);
        }
        this.wheres.splice(i, 1);
        break;
      }
    }
  }

  // then, process where clauses
  for (var i = 0; i < this.wheres.length; i++) {
    ydn.db.Query.processWhere(cursor, this.wheres[i].field,
      this.wheres[i].op, this.wheres[i].value,
      this.wheres[i].op2, this.wheres[i].value2);
  }

  if (this.map) {
    if (this.map.type == ydn.db.Query.MapType.SELECT) {
      cursor.map = ydn.db.Query.mapSelect(this.map.fields);
    } else {
      throw new ydn.db.SqlParseError(this.sql);
    }
  }

  if (this.aggregate) {
    if (this.aggregate.type == ydn.db.Query.AggregateType.SUM) {
      if (goog.isString(this.aggregate.field)) {
        cursor.reduce = ydn.db.Query.reduceSum(this.aggregate.field);
      } else {
        throw new ydn.db.SqlParseError('SUM: ' + this.sql);
      }
    } else if (this.aggregate.type == ydn.db.Query.AggregateType.AVERAGE) {
      if (goog.isString(this.aggregate.field)) {
        cursor.reduce = ydn.db.Query.reduceAverage(this.aggregate.field);
      } else {
        throw new ydn.db.SqlParseError('SUM: ' + this.sql);
      }
    } else {
      throw new ydn.db.SqlParseError(this.sql);
    }
  }

  return cursor;
};


/**
 * @override
 */
ydn.db.Query.prototype.toString = function() {
  if (goog.DEBUG) {
    return 'query:' + this.sql;
  } else {
    return goog.base(this, 'toString');
  }
};


