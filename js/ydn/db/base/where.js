/**
 * @fileoverview WHERE clause as keyRange object.
 */


goog.provide('ydn.db.Where');
goog.require('ydn.db.KeyRange');
goog.require('goog.string');
goog.require('ydn.debug.error.ArgumentException');


/**
 * For those browser that not implemented IDBKeyRange.
 * @param {string} field index field name to query from.
 * @param {string|Object} op where operator.
 * @param {*=} value rvalue to compare.
 * @param {string=} op2 second operator.
 * @param {*=} value2 second rvalue to compare.
 * @constructor
 * @extends {ydn.db.KeyRange}
 */
ydn.db.Where = function(field, op, value, op2, value2) {

  var upper, lower, upperOpen, lowerOpen;

  if (goog.isObject(op)) {
    lower = op['lower'];
    upper = op['upper'];
    lowerOpen = op['lowerOpen'];
    upperOpen = op['upperOpen'];
  } else {
    if (op == '^') {
      goog.asserts.assert(goog.isString(value) || goog.isArray(value), 'value');
      goog.asserts.assert(!goog.isDef(op2), 'op2');
      goog.asserts.assert(!goog.isDef(value2), 'value2');
      if (goog.isArray(value)) {
        upper = ydn.object.clone(/** @type {Object} */ (value));
        // Note on ordering: array > string > data > number
        upper.push('\uffff');
      } else if (goog.isString(value)) {
        upper = value + '\uffff';
      } else {
        throw new ydn.debug.error.ArgumentException();
      }
    } else if (op == '<' || op == '<=') {
      upper = value;
      upperOpen = op == '<';
    } else if (op == '>' || op == '>=') {
      lower = value;
      lowerOpen = op == '>';
    } else if (op == '=' || op == '==') {
      lower = value;
      upper = value;
    }  else {
      throw new ydn.debug.error.ArgumentException('invalid op: ' + op);
    }
    if (op2 == '<' || op2 == '<=') {
      upper = value2;
      upperOpen = op2 == '<';
    } else if (op2 == '>' || op2 == '>=') {
      lower = value2;
      lowerOpen = op2 == '>';
    } else if (goog.isDef(op2)) {
      throw new ydn.debug.error.ArgumentException('op2');
    }
  }

  goog.base(this, lower, upper, lowerOpen, upperOpen);
  this.field = field;
};
goog.inherits(ydn.db.Where, ydn.db.KeyRange);


/**
 *
 * @type {string}
 */
ydn.db.Where.prototype.field = '';


/**
 *
 * @return {string}
 */
ydn.db.Where.prototype.getField = function() {
  return this.field;
};


/**
 * @param {string} field field name.
 * @param {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} type data type.
 * @param {ydn.db.KeyRange|IDBKeyRange} key_range key range.
 * @return {{sql: string, params: !Array.<string>}}
 */
ydn.db.Where.toWhereClause = function (field, type, key_range) {

  var sql = '';
  var params = [];
  goog.asserts.assert(!goog.string.startsWith(field, '"'));
  if (key_range) {
    var column = goog.string.quote(field);
    if (ydn.db.Where.resolvedStartsWith(key_range)) {
      if (goog.isArray(type)) {
        sql = column + ' LIKE ?';
        if (goog.isArray(key_range.lower)) {
          for (var i = 0; i < key_range.lower.length; i++) {
            if (i > 0) {
              sql += ' AND ';
            }
            sql += column + ' LIKE ? ';
            params.push(ydn.db.schema.Index.ARRAY_SEP + key_range.lower[i] + ydn.db.schema.Index.ARRAY_SEP);
          }

        } else {
          sql = ' 1 = 2 ';
        }
      } else {
        // should be 'TEXT'
        sql = column + ' LIKE ?';
        params.push(ydn.db.schema.Index.js2sql(key_range.lower, type) + '%');
      }
    } else if (key_range.lower == key_range.upper) {
      sql = column + ' = ?';
      params.push(ydn.db.schema.Index.js2sql(key_range.lower, type));
    } else {
      if (goog.isDef(key_range.lower)) {
        var lowerOp = key_range.lowerOpen ? ' > ' : ' >= ';
        sql += ' ' + column + lowerOp + '?';
        params.push(ydn.db.schema.Index.js2sql(key_range.lower, type));
      }
      if (goog.isDef(key_range.upper)) {
        var upperOp = key_range.upperOpen ? ' < ' : ' <= ';
        var and = sql.length > 0 ? ' AND ' : ' ';
        sql += and + column + upperOp + '?';
        params.push(ydn.db.schema.Index.js2sql(key_range.upper, type));
      }
    }
  }

  return {sql: sql, params: params};
};

/**
 * @param {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} type data type.
 * @return {{sql: string, params: !Array.<string>}}
 */
ydn.db.Where.prototype.toWhereClause = function (type) {
  return ydn.db.Where.toWhereClause(this.field, type, this);
};


/**
 * Try to resolve keyRange with starts with keyRange.
 * @param {ydn.db.KeyRange|ydn.db.IDBKeyRange=} keyRange key range to check.
 * @return {boolean} true if given key range can be resolved to starts with
 * keyRange.
 */
ydn.db.Where.resolvedStartsWith = function(keyRange) {
  if (!goog.isDefAndNotNull(keyRange) ||
      !goog.isDef(keyRange.lower) || !goog.isDef(keyRange.upper)) {
    return false;
  }
  if (goog.isArray(keyRange.lower) && goog.isArray(keyRange.upper)) {
    return (keyRange.lower.length == keyRange.upper.length - 1) &&
        keyRange.upper[keyRange.upper.length - 1] == '\uffff' &&
        keyRange.lower.every(function (x, i) {return x == keyRange.upper[i]});
  } else {
    return !keyRange.lowerOpen && !keyRange.upperOpen &&
        keyRange.lower.length == keyRange.upper.length + 1 &&
        keyRange.upper[keyRange.lower.length - 1] == '\uffff';
  }

};


/**
 * Combine another where clause.
 * @param {!ydn.db.Where} where
 * @return {ydn.db.Where} return null if fail.
 */
ydn.db.Where.prototype.and = function(where) {
  if (this.field != where.field) {
    return null;
  }
  var lower, upper, lowerOpen, upperOpen;
  if (goog.isDefAndNotNull(this.lower) && goog.isDefAndNotNull(where.lower)) {
    if (this.lower > where.lower) {
      lower = this.lower;
      lowerOpen = this.lowerOpen;
    } else if (this.lower == where.lower) {
      lower = this.lower;
      lowerOpen = this.lowerOpen || where.lowerOpen;
    } else {
      lower = where.lower;
      lowerOpen = where.lowerOpen;
    }
  } else if (goog.isDefAndNotNull(this.lower)) {
    lower = this.lower;
    lowerOpen = this.lowerOpen;
  }  else if (goog.isDefAndNotNull(where.lower)) {
    lower = where.lower;
    lowerOpen = where.lowerOpen;
  }
  if (goog.isDefAndNotNull(this.upper) && goog.isDefAndNotNull(where.upper)) {
    if (this.lower > where.upper) {
      upper = this.upper;
      upperOpen = this.upperOpen;
    } else if (this.lower == where.lower) {
      upper = this.upper;
      upperOpen = this.upperOpen || where.upperOpen;
    } else {
      upper = where.upper;
      upperOpen = where.upperOpen;
    }
  } else if (goog.isDefAndNotNull(this.upper)) {
    upper = this.upper;
    upperOpen = this.upperOpen;
  }  else if (goog.isDefAndNotNull(where.upper)) {
    upper = where.upper;
    upperOpen = where.upperOpen;
  }

  return new ydn.db.Where(this.field,
      {
        'lower': lower,
        'upper': upper,
        'lowerOpen': lowerOpen,
        'upperOpen': upperOpen
      }
  );
};



