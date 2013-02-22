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
 */
ydn.db.Where = function(field, op, value, op2, value2) {
  /**
   * @final
   */
  this.key_range_ = new ydn.db.KeyRange(op, value, op2, value2);
  /**
   * @final
   */
  this.field = field;
};
goog.inherits(ydn.db.Where, ydn.db.KeyRange);


/**
 *
 * @type {string}
 * @private
 */
ydn.db.Where.prototype.field = '';

/**
 *
 * @type {ydn.db.KeyRange}
 * @private
 */
ydn.db.Where.prototype.key_range_;


/**
 *
 * @return {string}
 */
ydn.db.Where.prototype.getField = function() {
  return this.field;
};


/**
 *
 * @return {ydn.db.KeyRange}
 */
ydn.db.Where.prototype.getKeyRange = function() {
  return this.key_range_;
};


/**
 * @param {!Array.<string>|string} key_path field name.
 * @param {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} type data type.
 * @param {ydn.db.KeyRange|IDBKeyRange} key_range key range.
 * @return {{sql: string, params: !Array.<string>}}
 */
ydn.db.Where.toWhereClause = function (key_path, type, key_range) {

  // NOTE: this.field is different from key_path in general.

  var sql = '';
  var params = [];
  if (key_range) {
    if (ydn.db.Where.resolvedStartsWith(key_range)) {
      if (goog.isString(key_path)) {
        goog.asserts.assert(!goog.string.startsWith(key_path, '"'));
        var column = goog.string.quote(key_path);
        // should be 'TEXT'
        sql = column + ' LIKE ?';
        params.push(ydn.db.schema.Index.js2sql(key_range.lower, type) + '%');
      } else {
        goog.asserts.assertArray(key_path);
        goog.asserts.assertArray(key_range.lower,
          'lower value of key range must be an array, but ' + key_range.lower);

        for (var i = 0; i < key_range.lower.length; i++) {
          if (i > 0) {
            sql += ' AND ';
          }
          sql += goog.string.quote(key_path[i]) + ' = ?';
          params.push(key_range.lower[i]);
        }

        // NOTE: we don't need to care about upper value for LIKE
      }
    } else if (ydn.db.cmp(key_range.lower, key_range.upper) == 0) {
      if (goog.isArray(key_range.lower)) {
        for(var i = 0; i < key_range.lower.length; i++) {
          if (i > 0) {
            sql += ' AND ';
          }
          sql += key_path[i] + ' = ?';
          params.push(ydn.db.schema.Index.js2sql(key_range.lower[i], type[i]));
        }
      } else {
        sql = key_path + ' = ?';
        params.push(ydn.db.schema.Index.js2sql(key_range.lower, type));
      }
    } else {
      if (goog.isDef(key_range.lower)) {
        if (goog.isArray(type)) {
          var op = '=';
          for (var i = 0; i < key_range.lower.length; i++) {
            if (i > 0) {
              sql += ' AND ';
            }
            if (i == key_range.lower.length-1) {
              op = key_range.lowerOpen ? ' > ' : ' >= ';
            }
            sql += ' ' + key_path[i] + op + '?';
            params.push(ydn.db.schema.Index.js2sql(key_range.lower[i], type[i]));
          }
        } else {
          var op = key_range.lowerOpen ? ' > ' : ' >= ';
          sql += ' ' + key_path + op + '?';
          params.push(ydn.db.schema.Index.js2sql(key_range.lower, type));
        }
      }
      if (goog.isDef(key_range.upper)) {
        sql += sql.length > 0 ? ' AND ' : ' ';
        if (goog.isArray(type)) {
          var op = '=';
          for (var i = 0; i < key_range.upper.length; i++) {
            if (i > 0) {
              sql += ' AND ';
            }
            if (i == key_range.upper.length-1) {
              op = key_range.upperOpen ? ' < ' : ' <= ';
            }
            sql += ' ' + key_path[i] + op + '?';
            params.push(ydn.db.schema.Index.js2sql(key_range.upper[i], type[i]));
          }
        } else {
          var op = key_range.upperOpen ? ' < ' : ' <= ';
          sql += ' ' + key_path + op + '?';
          params.push(ydn.db.schema.Index.js2sql(key_range.upper, type));
        }
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
  return ydn.db.Where.toWhereClause(this.field, type, this.key_range_);
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



