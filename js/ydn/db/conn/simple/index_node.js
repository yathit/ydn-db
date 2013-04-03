/**
 * @fileoverview Node for AVL tree to hold key and primary key.
 */


goog.provide('ydn.db.con.simple.Node');


/**
 *
 * @param {!IDBKey} key must be valid IDBKey.
 * @param {*=} primary_key
 * @constructor
 */
ydn.db.con.simple.Node = function(key, primary_key) {

  /**
   * @final
   */
  this.key = /** @type  {!IDBKey}  */ (key);
  /**
   * @final
   */
  this.primary_key = primary_key;
};


/**
 * @private
 * @type {!IDBKey}
 */
ydn.db.con.simple.Node.prototype.key;


/**
 * @private
 * @type {*}
 */
ydn.db.con.simple.Node.prototype.primary_key;


/**
 *
 * @return {!IDBKey}
 */
ydn.db.con.simple.Node.prototype.getKey = function() {
  return this.key;
};


/**
 *
 * @return {*}
 */
ydn.db.con.simple.Node.prototype.getPrimaryKey = function() {
  return this.primary_key;
};


if (goog.DEBUG) {
/**
 * @override
 */
ydn.db.con.simple.Node.prototype.toString = function() {
  return 'ydn.db.con.simple.Node:' + this.key +
    (goog.isDefAndNotNull(this.primary_key) ? ':' + this.primary_key : '');
};
}


/**
 * Node comparator
 * @param {ydn.db.con.simple.Node} a
 * @param {ydn.db.con.simple.Node} b
 * @return {number} -1 if a < b, 1 if a > b, 0 if a = b.
 */
ydn.db.con.simple.Node.cmp = function (a,b) {
  var cmp = ydn.db.cmp(a.key, b.key);
  if (cmp === 0) {
    if (goog.isDefAndNotNull(a.primary_key)) {
      if (goog.isDefAndNotNull(b.primary_key)) {
        return ydn.db.cmp(a.primary_key, b.primary_key);
      } else {
        return 1;
      }
    } else if (goog.isDefAndNotNull(b.primary_key)) {
      return -1;
    } else {
      return 0;
    }
  } else {
    return cmp;
  }
};