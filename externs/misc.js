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
StorageOptions.prototype.thread;


/**
 * @constructor
 */
function KeyRangeJson() {}

/**
 * @type {*}
 */
KeyRangeJson.prototype.lower;

/**
 * @type {*}
 */
KeyRangeJson.prototype.lowerOpen;

/**
 * @type {*}
 */
KeyRangeJson.prototype.upper;

/**
 * @type {*}
 */
KeyRangeJson.prototype.upperOpen;
