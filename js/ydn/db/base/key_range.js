/**
 * Created with IntelliJ IDEA.
 * User: mbikt
 * Date: 9/11/12
 * Time: 3:04 PM
 * To change this template use File | Settings | File Templates.
 */

goog.provide('ydn.db.KeyRangeJson');
goog.provide('ydn.db.IDBKeyRange');
goog.provide('ydn.db.KeyRange');


/**
 * For those browser that not implemented IDBKeyRange.
 * @constructor
 */
ydn.db.KeyRange = function(lower, upper, lowerOpen, upperOpen) {
  this.lower = lower;
  this.upper = upper;
  this.lowerOpen = !!lowerOpen;
  this.upperOpen = !!upperOpen;
};


/**
 * @override
 */
ydn.db.KeyRange.prototype.toJSON = function() {
  return ydn.db.KeyRange.toJSON(this);
};


ydn.db.KeyRange.only = function(value) {
  return new ydn.db.KeyRange(value, value, false, false);
};


/**
 *
 * @param {(string|number)=} lower
 * @param {(string|number)=} upper
 * @param {boolean=} lowerOpen
 * @param {boolean=} upperOpen
 * @return {ydn.db.KeyRange}
 */
ydn.db.KeyRange.bound = function(lower, upper,
                                     lowerOpen, upperOpen) {
  return new ydn.db.KeyRange(lower, upper, lowerOpen, upperOpen);
};


ydn.db.KeyRange.upperBound = function(upper, upperOpen) {
  return new ydn.db.KeyRange(undefined, upper, undefined, upperOpen);
};

ydn.db.KeyRange.lowerBound = function(lower, lowerOpen) {
  return new ydn.db.KeyRange(lower, undefined, lowerOpen, undefined);
};


/**
 *
 * @param {ydn.db.IDBKeyRange|ydn.db.KeyRange} keyRange IDBKeyRange.
 * @return {!Object} IDBKeyRange in JSON format.
 */
ydn.db.KeyRange.toJSON = function(keyRange) {
  if (!keyRange) {
    return {};
  }
  return {
    'lower': keyRange['lower'],
    'upper': keyRange['upper'],
    'lowerOpen': keyRange['lowerOpen'],
    'upperOpen': keyRange['upperOpen']
  }
};


/**
 * @param {(ydn.db.KeyRangeJson|ydn.db.KeyRange|ydn.db.IDBKeyRange)=} keyRange keyRange.
 * @return {ydn.db.IDBKeyRange} equivalent IDBKeyRange.
 */
ydn.db.KeyRange.parseKeyRange = function (keyRange) {
  if (!goog.isDefAndNotNull(keyRange)) {
    return null;
  }
  if (goog.isDef(keyRange['upper']) && goog.isDef(keyRange['lower'])) {
    if (keyRange.lower === keyRange.upper) {
      return ydn.db.IDBKeyRange.only(keyRange.lower);
    } else {
      return ydn.db.IDBKeyRange.bound(
        keyRange.lower, keyRange.upper,
        keyRange['lowerOpen'], keyRange['upperOpen']);
    }
  } else if (goog.isDef(keyRange.upper)) {
    return ydn.db.IDBKeyRange.upperBound(keyRange.upper,
      keyRange.upperOpen);
  } else if (goog.isDef(keyRange.lower)) {
    return ydn.db.IDBKeyRange.lowerBound(keyRange.lower,
      keyRange.lowerOpen);
  } else {
    return null;
  }
};


/**
 *
 * @type {function(new:IDBKeyRange)} The IDBKeyRange interface of the IndexedDB
 * API represents a continuous interval over some data type that is used for
 * keys.
 */
ydn.db.IDBKeyRange = goog.global.IDBKeyRange ||
  goog.global.webkitIDBKeyRange || ydn.db.KeyRange;

