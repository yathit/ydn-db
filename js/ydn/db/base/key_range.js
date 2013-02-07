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
 *
 * @return {IDBKeyRange}
 */
ydn.db.KeyRange.prototype.toIDBKeyRange = function() {
  return ydn.db.KeyRange.parseIDBKeyRange(this);
};


/**
 * Robust efficient cloning of a keyrnge.
 * @param {(ydn.db.KeyRange|ydn.db.IDBKeyRange)=} kr key range to be cloned.
 * @return {!ydn.db.KeyRange|undefined} cloned key range.
 */
ydn.db.KeyRange.clone = function(kr) {
  if (goog.isDefAndNotNull(kr)) {
    return new ydn.db.KeyRange(kr.lower, kr.upper,
        !!kr.lowerOpen, !!kr.upperOpen);
  } else {
    return undefined;
  }
};


/**
 * Creates a new key range for a single value.
 *
 * @param {!Array|string|number} value The single value in the range.
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
 * @param {string|!Array} value value.
 * @return {!ydn.db.KeyRange} The key range.
 */
ydn.db.KeyRange.starts = function(value) {
  var value_upper;
  if (goog.isArray(value)) {
    value_upper = ydn.object.clone(value);
    // Note on ordering: array > string > data > number
    value_upper.push('\uffff');
  } else if (goog.isString(value)) {
    value_upper = value + '\uffff';
  } else {
    throw new ydn.debug.error.ArgumentException();
  }

  return ydn.db.KeyRange.bound(value, value_upper, false, true);
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
 * Read four primitive attributes from the input and return newly created
 * keyRange object.
 * @param {(KeyRangeJson|ydn.db.KeyRange|ydn.db.IDBKeyRange)=} keyRange
 * keyRange.
 * @return {ydn.db.IDBKeyRange} equivalent IDBKeyRange. Return null if input
 * is null or undefined.
 */
ydn.db.KeyRange.parseKeyRange = function(keyRange) {
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
 * Read four primitive attributes from the input and return newly created
 * keyRange object.
 * @param {(KeyRangeJson|ydn.db.KeyRange|ydn.db.IDBKeyRange)=} key_range
 * keyRange.
 * @return {IDBKeyRange} equivalent IDBKeyRange. Return null if input
 * is null or undefined.
 */
ydn.db.KeyRange.parseIDBKeyRange = function(key_range) {
  return /** @type {IDBKeyRange} */ (ydn.db.KeyRange.parseKeyRange(key_range));
};


/**
 *
 * @param {Object|undefined} keyRange
 * @return {string} if not valid key range object, return a message reason.
 */
ydn.db.KeyRange.validate = function(keyRange) {
  if (keyRange instanceof ydn.db.KeyRange) {
    return '';
  } else if (goog.isDefAndNotNull(keyRange)) {
    if (goog.isObject(keyRange)) {
      for (var key in keyRange) {
        if (keyRange.hasOwnProperty(key)) {
          if (!goog.array.contains(['lower', 'upper', 'lowerOpen', 'upperOpen'],
              key)) {
            return 'invalid attribute "' + key + '" in key range object';
          }
        }
      }
      return '';
    } else {
      return 'key range must be an object';
    }
  } else {
    return '';
  }
};


/**
 *
 * @param {string} op where operator.
 * @param {*} value rvalue to compare.
 * @param {string=} op2 second operator.
 * @param {*=} value2 second rvalue to compare.
 * @return {!ydn.db.KeyRange}
 */
ydn.db.KeyRange.where = function(op, value, op2, value2) {
  var upper, lower, upperOpen, lowerOpen;
  if (op == '$') {
    goog.asserts.assert(goog.isString(value) || goog.isArray(value), 'value');
    goog.asserts.assert(!goog.isDef(op2), 'op2');
    goog.asserts.assert(!goog.isDef(value2), 'value2');
    return ydn.db.KeyRange.starts(/** @type {string|!Array} */ (value));
  } else if (op == '<' || op == '<=') {
    upper = value;
    upperOpen = op == '<';
  } else if (op == '>' || op == '>=') {
    lower = value;
    lowerOpen = op == '>';
  } else if (op == '=' || op == '==') {
    lower = value;
    upper = value;
  } else {
    throw new ydn.debug.error.ArgumentException('invalid op: ' + op);
  }
  if (op2 == '<' || op2 == '<=') {
    upper = value2;
    upperOpen = op2 == '<';
  } else if (op2 == '>' || op2 == '>=') {
    lower = value2;
    lowerOpen = op2 == '>';
  } else if (goog.isDef(op2)) {
    throw new ydn.debug.error.ArgumentException('invalid op2: ' + op2);
  }
  return ydn.db.KeyRange.bound(lower, upper, lowerOpen, upperOpen);
};



/**
 *
 * @type {function(new:IDBKeyRange)} The IDBKeyRange interface of the IndexedDB
 * API represents a continuous interval over some data type that is used for
 * keys.
 */
ydn.db.IDBKeyRange = goog.global.IDBKeyRange ||
  goog.global.webkitIDBKeyRange || ydn.db.KeyRange;

