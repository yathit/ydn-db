/**
 * @fileoverview Misc type
 *
 * @externs
 */



/**
 * @constructor
 */
function StorageOptions() {}


/**
 * Estimated database size for WebSQL.
 * @type {number|undefined}
 */
StorageOptions.prototype.size;


/**
 * Preferential ordering of storage mechanisms.
 * @type {!Array.<string>|undefined}
 */
StorageOptions.prototype.mechanisms;


/**
 * @type {boolean}
 */
StorageOptions.prototype.autoSchema;


/**
 * @type {string|undefined}
 */
StorageOptions.prototype.policy;


/**
 * @type {boolean|undefined}
 */
StorageOptions.prototype.isSerial;


/**
 * @type {number|undefined}
 */
StorageOptions.prototype.connectionTimeout;



/**
 * @constructor
 */
function KeyRangeJson() {}


/**
 * @type {number|string|!Date|!Array.<number|string|!Date>|undefined}
 */
KeyRangeJson.prototype.lower;


/**
 * @type {boolean}
 */
KeyRangeJson.prototype.lowerOpen;


/**
 * @type {number|string|!Date|!Array.<number|string|!Date>|undefined}
 */
KeyRangeJson.prototype.upper;


/**
 * @type {boolean}
 */
KeyRangeJson.prototype.upperOpen;






