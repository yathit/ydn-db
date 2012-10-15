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
 */


goog.provide('ydn.db.Cursor');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.error.ArgumentException');



/**
 * @param {string} store store name.
 * @param {ydn.db.Cursor.Direction=} direction cursor direction.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!KeyRangeJson|!ydn.db.KeyRange|!ydn.db.IDBKeyRange|string|number)=}
  * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given.
 * @param {...} opt_args additional parameters for key range constructor.
 * @constructor
 */
ydn.db.Cursor = function(store, direction, index, keyRange, opt_args) {
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
   * @type {ydn.db.Cursor.Direction|undefined}
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
  this.reduce = null;
  this.map = null;
  this.continued = null;
  this.finalize = null;
  this.sql = '';
  this.params = [];
};


/**
 * Cursor direction.
 * @link http://www.w3.org/TR/IndexedDB/#dfn-direction
 * @enum {string}
 */
ydn.db.Cursor.Direction = {
  NEXT: 'next',
  NEXT_UNIQUE: 'nextunique',
  PREV: 'prev',
  PREV_UNIQUE: 'prevunique'
};



/**
 * @const
 * @type {!Array.<ydn.db.Cursor.Direction>}
 */
ydn.db.Cursor.DIRECTIONS = [
  ydn.db.Cursor.Direction.NEXT,
  ydn.db.Cursor.Direction.NEXT_UNIQUE,
  ydn.db.Cursor.Direction.PREV,
  ydn.db.Cursor.Direction.PREV_UNIQUE
];




/**
 * @inheritDoc
 */
ydn.db.Cursor.prototype.toJSON = function() {
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
ydn.db.Cursor.prototype.keyRange;

/**
 * Cursor direction.
 * @type {(ydn.db.Cursor.Direction|undefined)}
 */
ydn.db.Cursor.prototype.direction;

/**
 * @type {?function(): *}
 */
ydn.db.Cursor.prototype.initial = null;

/**
 * @type {?function(!Object): boolean}
 */
ydn.db.Cursor.prototype.filter = null;

/**
 * @type {?function(!Object): boolean}
 */
ydn.db.Cursor.prototype.continued = null;

/**
 * @type {?function(!Object): *}
 */
ydn.db.Cursor.prototype.map = null;

/**
 * Reduce is execute after map.
 * @type {?function(*, *, number): *}
 * function(previousValue, currentValue, index)
 */
ydn.db.Cursor.prototype.reduce = null;


/**
 * @type {?function(*): *}
 */
ydn.db.Cursor.prototype.finalize = null;



/**
 *
 * @param {*} value the only value.
 * @return {!ydn.db.Cursor} The query for chaining.
 */
ydn.db.Cursor.prototype.only = function(value) {
  this.keyRange = ydn.db.IDBKeyRange.only(value);
  return this;
};


/**
 *
 * @param {*} value The value of the upper bound.
 * @param {boolean=} is_open If true, the range excludes the upper bound value.
 * @return {!ydn.db.Cursor} The query for chaining.
 */
ydn.db.Cursor.prototype.upperBound = function(value, is_open) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.upperBound(value, is_open);
  return this;
};


/**
 *
 * @param {*} value  The value of the lower bound.
 * @param {boolean=} is_open  If true, the range excludes the lower bound value.
 * @return {!ydn.db.Cursor} The query for chaining.
 */
ydn.db.Cursor.prototype.lowerBound = function(value, is_open) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.lowerBound(value, is_open);
  return this;
};


/**
 *
 * @param {*} lower  The value of the lower bound.
 * @param {*} upper  The value of the upper bound.
 * @param {boolean=} lo If true, the range excludes the lower bound value.
 * @param {boolean=} uo If true, the range excludes the upper bound value.
 * @return {!ydn.db.Cursor} The query for chaining.
 */
ydn.db.Cursor.prototype.bound = function(lower, upper, lo, uo) {
  goog.asserts.assertString(this.index, 'index name must be specified.');
  this.keyRange = ydn.db.IDBKeyRange.bound(lower, upper, lo, uo);
  return this;
};


/**
 * @param {string?} keyPath if index is not defined, keyPath will be used.
 * @return {{where_clause: string, params: Array}} return equivalent of keyRange
 * to SQL WHERE clause and its parameters.
 */
ydn.db.Cursor.prototype.toWhereClause = function(keyPath) {

  var where_clause = '';
  var params = [];
  var index = goog.isDef(this.index) ? this.index :
      goog.isDefAndNotNull(keyPath) ? keyPath :
          ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  var column = goog.string.quote(index);

  if (ydn.db.KeyRange.isLikeOperation(this.keyRange)) {
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
 * Convert keyRange to SQL statment
 * @param {ydn.db.DatabaseSchema} schema
 * @return {boolean} true if SQL plan changed.
 */
ydn.db.Cursor.prototype.planSql = function(schema) {

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

    if (ydn.db.KeyRange.isLikeOperation(this.keyRange)) {
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
  if (this.direction == ydn.db.Cursor.Direction.PREV ||
    this.direction == ydn.db.Cursor.Direction.PREV_UNIQUE) {
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
 * @type {string}
 */
ydn.db.Cursor.prototype.sql = '';


/**
 * SQL parameters for executing SQL.
 * @type {!Array.<string>}
 */
ydn.db.Cursor.prototype.params = [];




/**
 * @override
 */
ydn.db.Cursor.prototype.toString = function() {
  var idx = goog.isDef(this.index) ? ':' + this.index : '';
  return 'Cursor:' + this.store_name + idx;
};



/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @param {!Object} row row.
 * @param {ydn.db.StoreSchema} store
 * @return {!Object} parse value.
 */
ydn.db.Cursor.prototype.parseRow = function(row, store) {
  return ydn.db.Cursor.parseRow(row, store);
};



/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @final
 * @param {!Object} row row.
 * @param {ydn.db.StoreSchema} store
 * @return {!Object} parse value.
 */
ydn.db.Cursor.parseRow = function(row, store) {
  var value = ydn.json.parse(row[ydn.db.base.DEFAULT_BLOB_COLUMN]);
  if (goog.isDefAndNotNull(store.keyPath)) {
    var key = ydn.db.IndexSchema.sql2js(row[store.keyPath], store.type);
    store.setKeyValue(value, key);
  }
  for (var j = 0; j < store.indexes.length; j++) {
    var index = store.indexes[j];
    if (index.name == ydn.db.base.DEFAULT_BLOB_COLUMN) {
      continue;
    }
    var x = row[index.name];
    value[index.name] = ydn.db.IndexSchema.sql2js(x, index.type);
  }
  return value;
};


/**
 * Return given input row.
 * @final
 * @param {!Object} row row.
 * @param {ydn.db.StoreSchema} store
 * @return {!Object} the first field of object in row value.
 */
ydn.db.Cursor.parseRowIdentity = function (row, store) {
  return row;
};