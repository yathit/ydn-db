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
goog.require('ydn.string');



/**
 * @param {string=} sql_statement The sql statement.
 * @constructor
 */
ydn.db.Query = function(sql_statement) {
  // Note for V8 optimization, declare all properties in constructor.
  if (goog.isDef(sql_statement) && !goog.isString(sql_statement)) {
    throw new ydn.error.ArgumentException();
  }

  this.sql = '';
  if (goog.isDef(sql_statement)) {
    this.sql = sql_statement;
    //this.parseSql(sql_statement);
  }

  this.store_name = '';
  this.wheres = [];
  this.aggregate = null;
  this.map = null;
  this.direction = undefined;
  this.index = undefined;
  this.limit_ = NaN;
  this.offset_ = NaN;
};


/**
 *
 * @type {string}
 */
ydn.db.Query.prototype.store_name = '';


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
 * @type {number}
 */
ydn.db.Query.prototype.limit_ = NaN;

/**
 * @private
 * @type {number}
 */
ydn.db.Query.prototype.offset_ = NaN;



/**
 * @protected
 * @type {!Array.<!ydn.db.Query.Where>}
 */
ydn.db.Query.prototype.wheres = [];



/**
 *
 * @type {ydn.db.Query.Aggregate?}
 */
ydn.db.Query.prototype.aggregate = null;



/**
 *
 * @type {ydn.db.Query.Map?}
 */
ydn.db.Query.prototype.map = null;


/**
 * @protected
 * @param {string} sql
 * @return {{
 *    action: string,
 *    fields: (string|!Array.<string>|undefined),
 *    store_name: string,
 *    wheres: !Array.<string>
 *  }}
 * @throws {ydn.error.ArgumentException}
 */
ydn.db.Query.prototype.parseSql = function(sql) {
  var from_parts = sql.split(/\sFROM\s/i);
  if (from_parts.length != 2) {
    throw new ydn.error.ArgumentException('FROM required.');
  }

  // Parse Pre-FROM
  var pre_from_parts = from_parts[0].match(/\s*?(SELECT|COUNT|MAX|AVG|MIN|CONCAT)\s*(.*)/i);
  if (pre_from_parts.length != 3) {
    throw new ydn.error.ArgumentException('Unable to parse: ' + sql);
  }
  var action = pre_from_parts[1].toUpperCase();
  var action_arg = pre_from_parts[2].trim();
  var fields = undefined;
  if (action_arg.length > 0 && action_arg != '*') {
    if (action_arg[0] == '(') {
      action_arg = action_arg.substring(1);
    }
    if (action_arg[action_arg.length - 2] == ')') {
      action_arg = action_arg.substring(0, action_arg.length - 2);
    }
    if (action_arg.indexOf(',') > 0) {
      fields = ydn.string.split_comma_seperated(action_arg);
      fields = goog.array.map(fields, function(x) {
        return goog.string.stripQuotes(x, '"');
      })
    } else {
      fields = action_arg;
    }
  }

  // Parse FROM
  var parts = from_parts[1].trim().match(/"(.+)"\s*(.*)/);
  if (!parts) {
    throw new ydn.error.ArgumentException('store name required.');
  }
  var store_name = parts[1];
  var wheres = [];
  if (parts.length > 2) {
    wheres.push(parts[2]);
  }



  return {
    action: action,
    fields: fields,
    store_name: store_name,
    wheres: wheres
  }
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
 *
 * @param {string} store_name
 * @return {ydn.db.Query} this query for chaining.
 */
ydn.db.Query.prototype.from = function(store_name) {
  this.store_name = store_name;
  return this;
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
 * @enum {string}
 */
ydn.db.Query.MapType = {
  SELECT: 'sl'
};


/**
 * @typedef {{
 *   type: ydn.db.Query.MapType,
 *   fields: (!Array.<string>|string)
 * }}
 */
ydn.db.Query.Map;




/**
 * @enum {string}
 */
ydn.db.Query.AggregateType = {
  COUNT: 'ct',
  SUM: 'sm',
  AVERAGE: 'av',
  MAX: 'mx',
  MIN: 'mn',
  SELECT: 'sl',
  CONCAT: 'cc'
};


/**
 * @typedef {{
 *   type: ydn.db.Query.AggregateType,
 *   field: (string|undefined)
 * }}
 */
ydn.db.Query.Aggregate;


//
///**
// * Convenient method for SQL <code>COUNT</code> method.
// * @return {!ydn.db.Query} The query.
// */
//ydn.db.Query.prototype.count = function() {
//
//  if (this.aggregate) {
//    throw new ydn.error.ConstrainError('Aggregate method already defined.');
//  }
//  this.aggregate = {type: ydn.db.Query.AggregateType.COUNT, field: undefined};
//  return this;
//
//};



/**
 * Return reduce iteration function for SUM
 * @param {string=} field
 * @return {Function}
 */
ydn.db.Query.reduceCount = function(field) {
  return function(prev) {
    if (!prev) {
      prev = 0;
    }
    return prev + 1;
  };
};
//
//
///**
// * Convenient method for SQL <code>SUM</code> method.
// * @param {string} field name.
// * @return {!ydn.db.Query} The query for chaining.
// */
//ydn.db.Query.prototype.sum = function(field) {
//
//  if (this.aggregate) {
//    throw new ydn.error.ConstrainError('Aggregate method already defined.');
//  }
//  this.aggregate = {
//    type: ydn.db.Query.AggregateType.SUM,
//    field: field
//  };
//  return this;
//
//
//};


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
 * Return reduce iteration function for MIN
 * @param {string} field
 * @return {Function}
 */
ydn.db.Query.reduceMin = function(field) {
  return function(prev, curr, i) {
    var x = curr[field];
    if (!goog.isDef(prev)) {
      return x;
    }
    return prev < x ? prev : x;
  };
};


/**
 * Return reduce iteration function for MAX
 * @param {string} field
 * @return {Function}
 */
ydn.db.Query.reduceMax = function(field) {
  return function(prev, curr, i) {
    var x = curr[field];
    if (!goog.isDef(prev)) {
      return x;
    }
    return prev > x ? prev : x;
  };
};


//
//
///**
// * Convenient method for SQL <code>AVERAGE</code> method.
// * @param {string} field name.
// * @return {!ydn.db.Query} The query for chaining.
// */
//ydn.db.Query.prototype.average = function(field) {
//
//  if (this.aggregate) {
//    throw new ydn.error.ConstrainError('Aggregate method already defined.');
//  }
//  this.aggregate = {
//    type: ydn.db.Query.AggregateType.AVERAGE,
//    field: field
//  };
//  return this;
//
//
//};


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
 * @param {string?=} opt_method selection method.
 * @param {(string|!Array.<string>)=} fields field names to select.
 * @return {!ydn.db.Query} The query for chaining.
 */
ydn.db.Query.prototype.select = function (opt_method, fields) {

  var  method = 'select';
  if (goog.isDefAndNotNull(opt_method)) {
    if (goog.isString(opt_method)) {
      method = opt_method.toLowerCase();
    } else {
      throw new ydn.error.ArgumentException();
    }
  }

  if (method == 'select') {
    if (this.map) {
      throw new ydn.error.ConstrainError('SELECT');
    }
    if (goog.isString(fields) || goog.isArray(fields)) {
      this.map = {
        type:ydn.db.Query.MapType.SELECT,
        fields:fields
      };
    } else {
      throw new ydn.error.ArgumentException('SELECT fields missing');
    }
  } else if (method == 'avg') {
    if (this.aggregate) {
      throw new ydn.error.ConstrainError('Aggregate method already defined.');
    }
    if (!goog.isString(fields)) {
      throw new ydn.error.ArgumentException('AVG');
    }
    this.aggregate = {
      type: ydn.db.Query.AggregateType.AVERAGE,
      field: fields
    };
  } else if (method == 'min') {
    if (this.aggregate) {
      throw new ydn.error.ConstrainError('Aggregate method already defined.');
    }
    if (!goog.isString(fields)) {
      throw new ydn.error.ArgumentException('MIN');
    }
    this.aggregate = {
      type: ydn.db.Query.AggregateType.MIN,
      field: fields
    };
  } else if (method == 'max') {
    if (this.aggregate) {
      throw new ydn.error.ConstrainError('Aggregate method already defined.');
    }
    if (!goog.isString(fields)) {
      throw new ydn.error.ArgumentException('MAX');
    }
    this.aggregate = {
      type: ydn.db.Query.AggregateType.MAX,
      field: fields
    };
  } else if (method == 'sum') {
    if (this.aggregate) {
      throw new ydn.error.ConstrainError('Aggregate method already defined.');
    }
    if (!goog.isString(fields)) {
      throw new ydn.error.ArgumentException('SUM');
    }
    this.aggregate = {
      type: ydn.db.Query.AggregateType.SUM,
      field: fields
    };
  } else if (method == 'count') {
    if (this.aggregate) {
      throw new ydn.error.ConstrainError('Aggregate method already defined.');
    }
    if (goog.isString(fields)) {
      this.aggregate = {type:ydn.db.Query.AggregateType.COUNT, field:fields};
    } else if (goog.isDef(fields)) {
      throw new ydn.error.ArgumentException('COUNT');
    } else {
      this.aggregate = {type:ydn.db.Query.AggregateType.COUNT, field:undefined};
    }
  } else {
    throw new ydn.error.ArgumentException('Unknown SELECT method: ' + opt_method);
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
  return this.store_name;
};



/**
 * Parse SQL statement and convert to cursor object for IndexedDB execution.
 * @see #toSqlCursor
 * @param {ydn.db.DatabaseSchema} schema
 * @return {!ydn.db.Cursor}
 */
ydn.db.Query.prototype.toCursor = function(schema) {


  if (this.store_name.length == 0) {
    throw new ydn.error.InvalidOperationException('store name not set.');
  }
  var store = schema.getStore(this.store_name);
  if (!store) {
    throw new ydn.error.InvalidOperationException('store: ' + this.store_name +
        ' not found.');
  }

  var cursor =  new ydn.db.Cursor(this.store_name, this.direction, this.index);


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
    cursor.processWhere(this.wheres[i]);
  }

  if (this.map) {
    if (this.map.type == ydn.db.Query.MapType.SELECT) {
      cursor.map = ydn.db.Query.mapSelect(this.map.fields);
    } else {
      throw new ydn.db.SqlParseError(this.map.type);
    }
  }

  if (this.aggregate) {
    if (this.aggregate.type == ydn.db.Query.AggregateType.SUM) {
      if (goog.isString(this.aggregate.field)) {
        cursor.reduce = ydn.db.Query.reduceSum(this.aggregate.field);
      } else {
        throw new ydn.db.SqlParseError('SUM: ' + this.sql);
      }
    } else if (this.aggregate.type == ydn.db.Query.AggregateType.MIN) {
      if (goog.isString(this.aggregate.field)) {
        cursor.reduce = ydn.db.Query.reduceMin(this.aggregate.field);
      } else {
        throw new ydn.db.SqlParseError('MIN: ' + this.sql);
      }
    } else if (this.aggregate.type == ydn.db.Query.AggregateType.MAX) {
      if (goog.isString(this.aggregate.field)) {
        cursor.reduce = ydn.db.Query.reduceMax(this.aggregate.field);
      } else {
        throw new ydn.db.SqlParseError('MAX: ' + this.sql);
      }
    } else if (this.aggregate.type == ydn.db.Query.AggregateType.AVERAGE) {
      if (goog.isString(this.aggregate.field)) {
        cursor.reduce = ydn.db.Query.reduceAverage(this.aggregate.field);
      } else {
        throw new ydn.db.SqlParseError('AVERAGE: ' + this.sql);
      }
    } else if (this.aggregate.type == ydn.db.Query.AggregateType.COUNT) {
      cursor.reduce = ydn.db.Query.reduceCount(this.aggregate.field);
    } else {
      throw new ydn.db.SqlParseError(this.sql);
    }
  }

  return cursor;
};



/**
 *
 * @param value limit value.
 */
ydn.db.Query.prototype.limit = function(value) {
  if (goog.isNumber(value) && value > 0) {
    this.limit_ = value;
  } else {
    throw new ydn.error.ArgumentException();
  }
};



/**
 *
 * @param value offset value.
 */
ydn.db.Query.prototype.offset = function(value) {
  if (goog.isNumber(value) && value >= 0) {
    this.offset_ = value;
  } else {
    throw new ydn.error.ArgumentException();
  }
};


/**
 * Convert this query into iterable cursor object for WebSQL execution.
 * @see #toCursor
 * @param {!ydn.db.DatabaseSchema} schema
 * @return {!ydn.db.Cursor}
 */
ydn.db.Query.prototype.toSqlCursor = function(schema) {

  if (this.sql.length > 0) {
    throw new ydn.error.NotImplementedException('SQL parser not implement');
  }
  if (this.store_name.length == 0) {
    throw new ydn.error.InvalidOperationException('store name not set.');
  }
  var store = schema.getStore(this.store_name);
  if (!store) {
    throw new ydn.error.InvalidOperationException('store: ' + this.store_name +
        ' not found.');
  }

  var cursor = new ydn.db.Cursor(this.store_name);
  var from = 'FROM ' + goog.string.quote(this.store_name);

  var select = '';
  var distinct = this.direction == ydn.db.Cursor.Direction.PREV_UNIQUE ||
    this.direction == ydn.db.Cursor.Direction.NEXT_UNIQUE;

  var fields_selected = false;
  if (goog.isDefAndNotNull(this.map)) {
    if (this.map.type == ydn.db.Query.MapType.SELECT) {
      var fs =goog.isArray(this.map.fields) ?
        this.map.fields : [this.map.fields];
      var fields = goog.array.map(fs, function(x) {
        return goog.string.quote(x);
      });
      select += 'SELECT (' + fields.join(', ') + ')';
      fields_selected = true;
      // parse row and then select the fields.
      cursor.parseRow = ydn.db.Cursor.parseRowIdentity;
      cursor.map = ydn.db.Query.mapSelect(this.map.fields);
    } else {
      throw new ydn.db.SqlParseError(this.map + ' in ' + this.sql);
    }
  }
  if (goog.isDefAndNotNull(this.aggregate)) {
    if (this.aggregate.type == ydn.db.Query.AggregateType.COUNT) {
      select += 'SELECT COUNT (';
      select += distinct ? 'DISTINCT ' : '';
      if (goog.isString(this.aggregate.field)) {
        select += goog.string.quote(this.aggregate.field);
      } else {
        select += '*';
      }
      select += ')';
      fields_selected = true;
      // parse row and then select the fields.
      cursor.parseRow = ydn.db.Cursor.parseRowIdentity;
      cursor.map = ydn.object.takeFirst;
      cursor.finalize = ydn.db.Query.finalizeTakeFirst;
    } else if (this.aggregate.type == ydn.db.Query.AggregateType.SUM) {
      select += 'SELECT SUM (';
      select += distinct ? 'DISTINCT ' : '';
      if (goog.isString(this.aggregate.field)) {
        select += goog.string.quote(this.aggregate.field);
      } else {
        select += '*';
      }
      select += ')';
      fields_selected = true;
      // parse row and then select the fields.
      cursor.parseRow = ydn.db.Cursor.parseRowIdentity;
      cursor.map = ydn.object.takeFirst;
      cursor.finalize = ydn.db.Query.finalizeTakeFirst;
    } else if (this.aggregate.type == ydn.db.Query.AggregateType.AVERAGE) {
      select += 'SELECT AVG (';
      select += distinct ? 'DISTINCT ' : '';
      if (goog.isString(this.aggregate.field)) {
        select += goog.string.quote(this.aggregate.field);
      } else {
        select += '*';
      }
      select += ')';
      fields_selected = true;
      // parse row and then select the fields.
      cursor.parseRow = ydn.db.Cursor.parseRowIdentity;
      cursor.map = ydn.object.takeFirst;
      cursor.finalize = ydn.db.Query.finalizeTakeFirst;
    } else {
      throw new ydn.db.SqlParseError(this.aggregate.type + ' in ' + this.sql);
    }
  }

  if (select.length == 0) {
    select += 'SELECT *' + (distinct ? ' DISTINCT' : '');
  }

  var where = '';
  for (var i = 0; i < this.wheres.length; i++) {
    if (store.hasIndex(this.wheres[i].field)) {
      if (where.length > 0) {
        where += ' AND ';
      } else {
        where += 'WHERE ';
      }
      where += goog.string.quote(this.wheres[i].field) + ' ' + this.wheres[i].op + ' ?';
      cursor.params.push(this.wheres[i].value);
      if (goog.isDefAndNotNull(this.wheres[i].op2)) {
        where += ' AND ' + goog.string.quote(this.wheres[i].field) + ' ' +
            this.wheres[i].op2 + ' ?';
        cursor.params.push(this.wheres[i].value2);
      }
    } else {
      cursor.processWhere(this.wheres[i]);
    }
  }

  var field_name = goog.isDefAndNotNull(this.index) ?
    goog.string.quote(this.index) : goog.isDefAndNotNull(store.keyPath) ?
    goog.string.quote(store.keyPath) : ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;

  var order = 'ORDER BY ' + field_name;
  if (this.direction == ydn.db.Cursor.Direction.PREV ||
    this.direction == ydn.db.Cursor.Direction.PREV_UNIQUE) {
    order += ' DESC';
  } else {
    order += ' ASC';
  }

  var range = '';
  if (!isNaN(this.limit_)) {
    range += ' LIMIT ' + this.limit_;
  }

  if (!isNaN(this.offset_)) {
    range += ' OFFSET ' + this.offset_;
  }

  cursor.sql = select + ' ' + from + ' ' + where + ' ' + order + ' ' + range;
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


/**
 * Parse resulting object of a row
 * @final
 * @param {ydn.db.StoreSchema} table table of concern.
 * @param {!Object} row row.
 * @return {*} the first field of object in row value.
 */
ydn.db.Query.parseRowTakeFirst = function (table, row) {
  for (var key in row) {
    if (row.hasOwnProperty(key)) {
      return row[key];
    }
  }
  return undefined;
};


/**
 *
 * @param {*} arr
 * @return {*}
 */
ydn.db.Query.finalizeTakeFirst = function(arr) {
  if (goog.isArray(arr)) {
    return arr[0];
  } else {
    return undefined;
  }
};

