/**
 * @fileoverview Schema format.
 *
 * @externs
 */

/**
 * @constructor
 */
function IndexSchema() {}

/**
 * @type {string}
 */
IndexSchema.prototype.name;

/**
 * @type {ydn.db.DataType}
 */
IndexSchema.prototype.type;

/**
 * @type {boolean}
 */
IndexSchema.prototype.unique;

/**
 * @type {string}
 */
IndexSchema.prototype.keyPath;

/**
 * @type {boolean}
 */
IndexSchema.prototype.multiEntry;


/**
 * @constructor
 */
function StoreSchema() {}

/**
 * @type {string}
 */
StoreSchema.prototype.name;

/**
 * @type {string}
 */
StoreSchema.prototype.keyPath;

/**
 * @type {boolean}
 */
StoreSchema.prototype.autoIncremenent;

/**
 * @type {ydn.db.DataType}
 */
StoreSchema.prototype.type;

/**
 * @type {Array.<!IndexSchema>}
 */
StoreSchema.prototype.Indexes;


/**
 * @constructor
 */
function DatabaseSchema() {}

/**
 * @type {number}
 */
DatabaseSchema.prototype.version;

/**
 * @type {Array.<!StoreSchema>}
 */
DatabaseSchema.prototype.Stores;
