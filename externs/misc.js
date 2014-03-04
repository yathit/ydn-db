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
 * @type {{
 *    expiration: (number|undefined),
 *    secrets: Array.<{name: string, key: string}>
 * }}
 */
StorageOptions.prototype.Encryption;



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


/**
 * @const
 * @type {Object}
 */
var DataSourceOption = {};



/**
 * @constructor
 */
var GDataSourceOption = function() {};


/**
 * @type {string}
 */
GDataSourceOption.prototype.kind;


/**
 * @type {string}
 */
GDataSourceOption.prototype.id;



/**
 * @constructor
 * @extends {GDataSourceOption}
 */
var ContactDataSourceOption = function() {};



/**
 * Record format for {@see ydn.debug.DbLogger}.
 * @interface.
 */
var DbLoggerRecord = function() {};


/** @type {string} */
DbLoggerRecord.prototype.exception;


/** @type {number} */
DbLoggerRecord.prototype.level;


/** @type {string} */
DbLoggerRecord.prototype.logger;


/** @type {string} */
DbLoggerRecord.prototype.name;


/** @type {number} */
DbLoggerRecord.prototype.time;


/** @type {string} */
DbLoggerRecord.prototype.message;


/** @type {number} */
DbLoggerRecord.prototype.seq;


