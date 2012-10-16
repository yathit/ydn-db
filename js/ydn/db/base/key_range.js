/**
 * @fileoverview Wrapper for a IndexedDB key range.
 */


goog.provide('ydn.db.IDBKeyRange');
goog.provide('ydn.db.KeyRange');



/**
 * For those browser that not implemented IDBKeyRange.
 * @param {*} lower The value of the lower bound.
 * @param {*} upper  The value of the upper bound.
 * @param {boolean=} lowerOpen  If true, the range excludes the lower bound
 * value.
 * @param {boolean=} upperOpen If true, the range excludes the lower bound
 * value.
 * @constructor
 */
ydn.db.KeyRange = function(lower, upper, lowerOpen, upperOpen) {
  this['lower'] = lower;
  this['upper'] = upper;
  this['lowerOpen'] = !!lowerOpen;
  this['upperOpen'] = !!upperOpen;
};


/**
 *
 * @type {*}
 */
ydn.db.KeyRange.prototype.lower = undefined;

/**
 *
 * @type {*}
 */
ydn.db.KeyRange.prototype.upper = undefined;

/**
 *
 * @type {boolean}
 */
ydn.db.KeyRange.prototype.lowerOpen = false;

/**
 *
 * @type {boolean}
 */
ydn.db.KeyRange.prototype.upperOpen = false;

/**
 * @override
 * @return {!Object} in JSON format.
 */
ydn.db.KeyRange.prototype.toJSON = function() {
  return ydn.db.KeyRange.toJSON(this);
};


/**
 * Creates a new key range for a single value.
 *
 * @param {Object} value The single value in the range.
 * @return {!ydn.db.KeyRange} The key range.
 */
ydn.db.KeyRange.only = function(value) {
  return new ydn.db.KeyRange(value, value, false, false);
};



/**
 * Creates a key range with upper and lower bounds.
 *
 * @param {*} lower The value of the lower bound.
 * @param {*} upper The value of the upper bound.
 * @param {boolean=} opt_lowerOpen If true, the range excludes the lower bound
 *     value.
 * @param {boolean=} opt_upperOpen If true, the range excludes the upper bound
 *     value.
 * @return {!ydn.db.KeyRange} The key range.
 */
ydn.db.KeyRange.bound = function(lower, upper,
                                 opt_lowerOpen, opt_upperOpen) {
  return new ydn.db.KeyRange(lower, upper, opt_lowerOpen, opt_upperOpen);
};


/**
 * Creates a key range with a upper bound only, starts at the first record.
 *
 * @param {Object} upper The value of the upper bound.
 * @param {boolean=} opt_upperOpen If true, the range excludes the upper bound
 *     value.
 * @return {!ydn.db.KeyRange} The key range.
 */
ydn.db.KeyRange.upperBound = function(upper, opt_upperOpen) {
  return new ydn.db.KeyRange(undefined, upper, undefined, opt_upperOpen);
};


/**
 * Creates a key range with a lower bound only, finishes at the last record.
 *
 * @param {Object} lower The value of the lower bound.
 * @param {boolean=} opt_lowerOpen If true, the range excludes the lower bound
 *     value.
 * @return {!ydn.db.KeyRange} The key range.
 */
ydn.db.KeyRange.lowerBound = function(lower, opt_lowerOpen) {
  return new ydn.db.KeyRange(lower, undefined, opt_lowerOpen, undefined);
};



/**
 * Helper method for creating useful KeyRange.
 * @param {string} value value.
 * @return {!ydn.db.KeyRange} The key range.
 */
ydn.db.KeyRange.starts = function(value) {
  var value_upper = value + '\uffff';
  return ydn.db.KeyRange.bound(value, value_upper);
};


/**
 *
 * @param {ydn.db.IDBKeyRange|ydn.db.KeyRange|KeyRangeJson} keyRange
 * IDBKeyRange.
 * @return {!KeyRangeJson} IDBKeyRange in JSON format.
 */
ydn.db.KeyRange.toJSON = function(keyRange) {
  keyRange = keyRange || /** @type {KeyRangeJson} */ ({});
  var out = {
    'lower': keyRange['lower'],
    'upper': keyRange['upper'],
    'lowerOpen': keyRange['lowerOpen'],
    'upperOpen': keyRange['upperOpen']
  };
  return /** @type {!KeyRangeJson} */ (out);
};


/**
 * @param {(KeyRangeJson|ydn.db.KeyRange|ydn.db.IDBKeyRange)=} keyRange
 * keyRange.
 * @return {ydn.db.IDBKeyRange} equivalent IDBKeyRange.
 */
ydn.db.KeyRange.parseKeyRange = function (keyRange) {
  if (!goog.isDefAndNotNull(keyRange)) {
    return null;
  }
  if (goog.isDef(keyRange['upper']) && goog.isDef(keyRange['lower'])) {

    return ydn.db.IDBKeyRange.bound(
      keyRange.lower, keyRange.upper,
      !!keyRange['lowerOpen'], !!keyRange['upperOpen']);

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

