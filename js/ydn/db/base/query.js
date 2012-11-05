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
 * @fileoverview Cursor object.
 *
 * Cursors are a transient mechanism used to iterate on stream of ordered
 * records from a store. Cursor object define exact stream of records and
 * conditioned iteration process and retain state of cursor position.
 */


goog.provide('ydn.db.Query');
goog.provide('ydn.db.Query.Direction');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.error.ArgumentException');



/**
 * Create a cursor object.
 * @param {string} store store name.
 * @param {ydn.db.Query.Direction=} direction cursor direction.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!KeyRangeJson|!ydn.db.KeyRange|!ydn.db.IDBKeyRange|string|number)=}
  * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given.
 * @param {...} opt_args additional parameters for key range constructor.
 * @constructor
 */
ydn.db.Query = function(store, direction, index, keyRange, opt_args) {
  // Note for V8 optimization, declare all properties in constructor.
  if (!goog.isString(store)) {
    throw new ydn.error.ArgumentException('store name required');
  }
  /**
   * Store name.
   * @final
   * @type {string}
   */
  this.store_name = store;
  /**
   * Indexed field.
   * @final
   * @type {string|undefined}
   */
  this.index = index;

  if (!goog.isDefAndNotNull(direction)) {
    direction = undefined;
  } else if (['next', 'prev'].indexOf(direction) == -1) {
    throw new ydn.error.ArgumentException('direction');
  }
  /**
   * @final
   * @type {ydn.db.Query.Direction|undefined}
   */
  this.direction = direction;

  var kr;
  if (keyRange instanceof ydn.db.KeyRange) {
    kr = ydn.db.KeyRange.parseKeyRange(keyRange);
  } else if (goog.isObject(keyRange)) {
    // must be JSON object
    kr = ydn.db.KeyRange.parseKeyRange(keyRange);
  } else if (goog.isDef(keyRange)) {
    kr = ydn.db.IDBKeyRange.bound.apply(this,
      Array.prototype.slice.call(arguments, 3));
  }
  /**
   * @final
   * @type {!ydn.db.IDBKeyRange|undefined}
   */
  this.keyRange = kr;

  // set all null so that no surprise from inherit prototype
  this.initial = null;
  this.filter = null;
  this.continued = null;

  // transient properties during cursor iteration
  this.counter = 0;
  this.store_key = undefined;
  this.index_key = undefined;
  this.has_done = undefined;

  this.parseRow = ydn.db.Query.prototype.parseRow;
  this.sql = '';
  this.params = [];
};


/**
 * Cursor direction.
 * @link http://www.w3.org/TR/IndexedDB/#dfn-direction
 * @enum {string} Cursor direction.
 */
ydn.db.Query.Direction = {
  NEXT: 'next',
  NEXT_UNIQUE: 'nextunique',
  PREV: 'prev',
  PREV_UNIQUE: 'prevunique'
};



/**
 * @const
 * @type {!Array.<ydn.db.Query.Direction>} Cursor directions.
 */
ydn.db.Query.DIRECTIONS = [
  ydn.db.Query.Direction.NEXT,
  ydn.db.Query.Direction.NEXT_UNIQUE,
  ydn.db.Query.Direction.PREV,
  ydn.db.Query.Direction.PREV_UNIQUE
];

/**
 *
 * @return {string} return store name.
 */
ydn.db.Query.prototype.getStoreName = function() {
  return this.store_name;
};


/**
 * @inheritDoc
 */
ydn.db.Query.prototype.toJSON = function() {
  return {
    'store': this.store_name,
    'index': this.index,
    'key_range': ydn.db.KeyRange.toJSON(this.keyRange || null),
    'direction': this.direction
  };
};

/**
 * Right value for query operation.
 * @type {ydn.db.IDBKeyRange|undefined}
 */
ydn.db.Query.prototype.keyRange;

/**
 * Cursor direction.
 * @type {(ydn.db.Query.Direction|undefined)}
 */
ydn.db.Query.prototype.direction;

/**
 * @type {?function(): *}
 */
ydn.db.Query.prototype.initial = null;

/**
 * @type {?function(*): boolean}
 */
ydn.db.Query.prototype.filter = null;

/**
 * @type {?function(*): boolean}
 */
ydn.db.Query.prototype.continued = null;

/**
 * @type {?function(*): *}
 */
ydn.db.Query.prototype.map = null;

/**
 * Reduce is execute after map.
 * @type {?function(*, *, number): *}
 * function(previousValue, currentValue, index)
 */
ydn.db.Query.prototype.reduce = null;


/**
 * @type {?function(*): *}
 */
ydn.db.Query.prototype.finalize = null;




/**
 * @param {string?} keyPath if index is not defined, keyPath will be used.
 * @return {{sql: string, params: !Array.<string>}} return equivalent of
 * keyRange
 * to SQL WHERE clause and its parameters.
 */
ydn.db.Query.prototype.toWhereClause = function(keyPath) {

  var index = goog.isDef(this.index) ? this.index :
      goog.isDefAndNotNull(keyPath) ? keyPath :
          ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  var column = goog.string.quote(index);

  var where = new ydn.db.Where(column, keyPath);

  return where.toWhereClause();
};



/**
 * Convert keyRange to SQL statment
 * @param {ydn.db.schema.Database} schema schema.
 * @return {boolean} true if SQL plan changed.
 */
ydn.db.Query.prototype.planSql = function(schema) {

  if (this.sql) {
    return false;
  }

  var store = schema.getStore(this.store_name);
  goog.asserts.assertObject(store, this.store_name + ' not found.');
  this.params = [];

  var select = 'SELECT';

  var from = '* FROM ' + store.getQuotedName();

  var index = goog.isDef(this.index) ? store.getIndex(this.index) : null;

  var where_clause = '';
  if (this.keyRange) {
    var key_column = goog.isDefAndNotNull(this.index) ? this.index :
      goog.isDefAndNotNull(store.keyPath) ? store.keyPath :
        ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
    var column = goog.string.quote(key_column);

    if (ydn.db.Where.resolvedStartsWith(this.keyRange)) {
      where_clause = column + ' LIKE ?';
      this.params.push(this.keyRange['lower'] + '%');
    } else {
      if (goog.isDef(this.keyRange.lower)) {
        var lowerOp = this.keyRange['lowerOpen'] ? ' > ' : ' >= ';
        where_clause += ' ' + column + lowerOp + '?';
        this.params.push(this.keyRange.lower);
      }
      if (goog.isDef(this.keyRange['upper'])) {
        var upperOp = this.keyRange['upperOpen'] ? ' < ' : ' <= ';
        var and = where_clause.length > 0 ? ' AND ' : ' ';
        where_clause += and + column + upperOp + '?';
        this.params.push(this.keyRange.upper);
      }
    }
    where_clause = ' WHERE ' + '(' + where_clause + ')';
  }

  // Note: IndexedDB key range result are always ordered.
  var dir = 'ASC';
  if (this.direction == ydn.db.Query.Direction.PREV ||
    this.direction == ydn.db.Query.Direction.PREV_UNIQUE) {
    dir = 'DESC';
  }
  var order = '';
  if (index) {
    order = 'ORDER BY ' + goog.string.quote(index.name);
  } else if (goog.isString(store.keyPath)) {
    order = 'ORDER BY ' + goog.string.quote(store.keyPath);
  } else {
    order = 'ORDER BY ' + ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  }

  this.sql = [select, from, where_clause, order, dir].join(' ');
  return true;
};



/**
 * SQL statement for executing.
 * @type {string} sql string.
 */
ydn.db.Query.prototype.sql = '';


/**
 * SQL parameters for executing SQL.
 * @type {!Array.<string>} sql parameters.
 */
ydn.db.Query.prototype.params = [];




/**
 * @override
 */
ydn.db.Query.prototype.toString = function() {
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
ydn.db.Query.prototype.parseRow = function(row, store) {
  return ydn.db.Query.parseRow(row, store);
};



/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @final
 * @param {!Object} row row.
 * @param {ydn.db.schema.Store} store store schema.
 * @return {!Object} parse value.
 */
ydn.db.Query.parseRow = function(row, store) {
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
ydn.db.Query.parseRowIdentity = function(row, store) {
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
//ydn.db.Query.op_test = function(op, lv, x) {
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



/**
 * Process where instruction into filter iteration method.
 * @param {!ydn.db.Where} where where.
 */
ydn.db.Query.prototype.processWhereAsFilter = function(where) {

  var prev_filter = goog.functions.TRUE;
  if (goog.isFunction(this.filter)) {
    prev_filter = this.filter;
  }

  this.filter = function(obj) {
    var value = obj[where.field];
    var ok1 = true;
    if (goog.isDef(where.lower)) {
      ok1 = where.lowerOpen ? value < where.lower : value <= where.lower;
    }
    var ok2 = true;
    if (goog.isDef(where.upper)) {
      ok2 = where.upperOpen ? value > where.upper : value >= where.upper;
    }

    return prev_filter(obj) && ok1 && ok2;
  };

  //console.log([where, this.filter.toString()]);

};


/**
 *
 * @return {*|undefined} Current cursor key.
 */
ydn.db.Query.prototype.key = function() {
  return this.store_key;
};


/**
 *
 * @return {*|undefined} Current cursor index key.
 */
ydn.db.Query.prototype.indexKey = function() {
  return this.index_key;
};


/**
 *
 * @return {number} number of record iterated.
 */
ydn.db.Query.prototype.count = function() {
  return this.counter;
};


/**
 *
 * @return {boolean|undefined} number of record iterated.
 */
ydn.db.Query.prototype.done = function() {
  return this.has_done;
};


/**
 *
 * @return {!Array.<string>}
 */
ydn.db.Query.prototype.stores = function() {
  return [this.store_name];
};

