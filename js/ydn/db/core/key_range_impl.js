/**
 * Created with IntelliJ IDEA.
 * User: mbikt
 * Date: 9/11/12
 * Time: 3:04 PM
 * To change this template use File | Settings | File Templates.
 */

goog.provide('ydn.db.KeyRangeJson');
goog.provide('ydn.db.KeyRange');
goog.provide('ydn.db.KeyRangeImpl');


/**
 * For those browser that not implemented IDBKeyRange.
 * @constructor
 */
ydn.db.KeyRangeImpl = function(lower, upper, lowerOpen, upperOpen) {
  this.lower = lower;
  this.upper = upper;
  this.lowerOpen = !!lowerOpen;
  this.upperOpen = !!upperOpen;
};


ydn.db.KeyRangeImpl.only = function(value) {
  return new ydn.db.KeyRangeImpl(value, value, false, false);
};


/**
 *
 * @param {(string|number)=} lower
 * @param {(string|number)=} upper
 * @param {boolean=} lowerOpen
 * @param {boolean=} upperOpen
 * @return {ydn.db.KeyRangeImpl}
 */
ydn.db.KeyRangeImpl.bound = function(lower, upper,
                                     lowerOpen, upperOpen) {
  return new ydn.db.KeyRangeImpl(lower, upper, lowerOpen, upperOpen);
};


ydn.db.KeyRangeImpl.upperBound = function(upper, upperOpen) {
  return new ydn.db.KeyRangeImpl(undefined, upper, undefined, upperOpen);
};

ydn.db.KeyRangeImpl.lowerBound = function(lower, lowerOpen) {
  return new ydn.db.KeyRangeImpl(lower, undefined, lowerOpen, undefined);
};


/**
 *
 * @param {ydn.db.KeyRange} keyRange IDBKeyRange.
 * @return {!Object} IDBKeyRange in JSON format.
 */
ydn.db.KeyRangeImpl.toJSON = function(keyRange) {
  return {
    'lower': keyRange.lower,
    'upper': keyRange.upper,
    'lowerOpen': keyRange.lowerOpen,
    'upperOpen': keyRange.upperOpen
  }
};


/**
 * @param {ydn.db.KeyRangeJson=} keyRange keyRange.
 * @return {ydn.db.KeyRange} equivalent IDBKeyRange.
 */
ydn.db.KeyRangeImpl.parseKeyRange = function (keyRange) {
  if (!goog.isDefAndNotNull(keyRange)) {
    return null;
  }
  if (goog.isDef(keyRange['upper']) && goog.isDef(keyRange['lower'])) {
    if (keyRange.lower === keyRange.upper) {
      return ydn.db.KeyRange.only(keyRange.lower);
    } else {
      return ydn.db.KeyRange.bound(
        keyRange.lower, keyRange.upper,
        keyRange['lowerOpen'], keyRange['upperOpen']);
    }
  } else if (goog.isDef(keyRange.upper)) {
    return ydn.db.KeyRange.upperBound(keyRange.upper,
      keyRange.upperOpen);
  } else if (goog.isDef(keyRange.lower)) {
    return ydn.db.KeyRange.lowerBound(keyRange.lower,
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
ydn.db.KeyRange = goog.global.IDBKeyRange ||
  goog.global.webkitIDBKeyRange || ydn.db.KeyRangeImpl;

