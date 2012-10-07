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
 * If true, a default key-value text object store will be created.
 * @type {boolean|undefined}
 */
StorageOptions.prototype.used_key_value_store;

/**
 * Estimated database size for WebSQL.
 * @type {number|undefined}
 */
StorageOptions.prototype.size;


/**
 * Preferential ordering of storage mechanisms.
 * @type {!Array.<string>|undefined}
 */
StorageOptions.prototype.Mechanisms;

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
