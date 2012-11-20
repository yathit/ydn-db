/**
 * @fileoverview WHERE clause as keyRange object.
 */


goog.provide('ydn.db.Where');
goog.require('ydn.db.KeyRange');
goog.require('goog.string');


/**
 * For those browser that not implemented IDBKeyRange.
 * @param {string} field index field name to query from.
 * @param {string|Object} op where operator.
 * @param {string=} value rvalue to compare.
 * @param {string=} op2 secound operator.
 * @param {string=} value2 second rvalue to compare.
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

    if (op == '<' || op == '<=') {
      upper = value;
      upperOpen = op == '<';
    } else if (op == '>' || op == '>=') {
      lower = value;
      lowerOpen = op == '>';
    } else if (op == '=' || op == '==') {
      lower = value;
      upper = value;
    }
    if (op2 == '<' || op2 == '<=') {
      upper = value2;
      upperOpen = op2 == '<';
    } else if (op2 == '>' || op2 == '>=') {
      lower = value2;
      lowerOpen = op2 == '>';
    } else if (goog.isDef(op2)) {
      throw new ydn.error.ArgumentException(op2);
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
 * @param {string} field field name.
 * @param {ydn.db.KeyRange|IDBKeyRange} key_range key range.
 * @return {{sql: string, params: !Array.<string>}}
 */
ydn.db.Where.toWhereClause = function (field, key_range) {

  var sql = '';
  var params = [];
  var column = goog.string.quote(field);
  if (ydn.db.Where.resolvedStartsWith(key_range)) {
    sql = column + ' LIKE ?';
    params.push(key_range.lower + '%');
  } else if (key_range.lower == key_range.upper) {
    sql = column + ' = ?';
    params.push(key_range.lower);
  } else {
    if (goog.isDef(key_range.lower)) {
      var lowerOp = key_range.lowerOpen ? ' > ' : ' >= ';
      sql += ' ' + column + lowerOp + '?';
      params.push(key_range.lower);
    }
    if (goog.isDef(key_range.upper)) {
      var upperOp = key_range.upperOpen ? ' < ' : ' <= ';
      var and = sql.length > 0 ? ' AND ' : ' ';
      sql += and + column + upperOp + '?';
      params.push(key_range.upper);
    }
  }

  return {sql: sql, params: params};
};

/**
 *
 * @return {{sql: string, params: !Array.<string>}}
 */
ydn.db.Where.prototype.toWhereClause = function () {
  return ydn.db.Where.toWhereClause(this.field, this);
};


/**
 * Try to resolve keyRange with starts with keyRange.
 * @param {ydn.db.KeyRange|ydn.db.IDBKeyRange=} keyRange key range to check.
 * @return {boolean} true if given key range can be resolved to starts with
 * keyRange.
 */
ydn.db.Where.resolvedStartsWith = function(keyRange) {
  if (!goog.isDefAndNotNull(keyRange)) {
    return false;
  }
  return goog.isDef(keyRange.lower) && goog.isDef(keyRange.upper) &&
    !keyRange.lowerOpen && !keyRange.upperOpen &&
    keyRange.lower.length == keyRange.upper.length + 1 &&
    keyRange.upper[keyRange.lower.length - 1] == '\uffff';
};




