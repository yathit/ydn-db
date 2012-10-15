/**
 * @fileoverview WHERE clause as keyRange object.
 */


goog.provide('ydn.db.Where');
goog.require('ydn.db.KeyRange');
goog.require('goog.string');


/**
 * For those browser that not implemented IDBKeyRange.
 * @param {string} field
 * @param {*} lower_or_keyRange The value of the lower bound.
 * @param {*=} upper  The value of the upper bound.
 * @param {boolean=} lowerOpen  If true, the range excludes the lower bound
 * value.
 * @param {boolean=} upperOpen If true, the range excludes the lower bound
 * value.
 * @constructor
 * @extends {ydn.db.KeyRange}
 */
ydn.db.Where = function(field, lower_or_keyRange, upper, lowerOpen, upperOpen) {
  var lower = lower_or_keyRange;
  if (goog.isObject(lower_or_keyRange)) {
    lower = lower_or_keyRange['lower'];
    upper = lower_or_keyRange['upper'];
    lowerOpen = lower_or_keyRange['lowerOpen'];
    upperOpen = lower_or_keyRange['upperOpen'];
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
 * @return {{sql: string, params: !Array.<string>}}
 */
ydn.db.Where.prototype.toWhereClause = function () {

  var sql = '';
  var params = [];
  var column = goog.string.quote(this.field);
  if (ydn.db.Where.resolvedStartsWith(this)) {
    sql = column + ' LIKE ?';
    params.push(this.lower + '%');
  } else if (this.lower == this.upper) {
    sql = column + ' = ?';
    params.push(this.lower);
  } else {
    if (goog.isDef(this.lower)) {
      var lowerOp = this.lowerOpen ? ' > ' : ' >= ';
      sql += ' ' + column + lowerOp + '?';
      params.push(this.lower);
    }
    if (goog.isDef(this.upper)) {
      var upperOp = this.upperOpen ? ' < ' : ' <= ';
      var and = sql.length > 0 ? ' AND ' : ' ';
      sql += and + column + upperOp + '?';
      params.push(this.upper);
    }
  }

  return {sql: sql, params: params};
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




