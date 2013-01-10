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
 * @type {string}
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
StoreSchema.prototype.autoIncrement;

/**
 * @type {string}
 */
StoreSchema.prototype.type;

/**
 * @type {Array.<!IndexSchema>}
 */
StoreSchema.prototype.indexes;

/**
 * @type {boolean}
 */
StoreSchema.prototype.dispatchEvents;

/**
 * A fixed schema.
 * @type {boolean}
 */
StoreSchema.prototype.fixed;

/**
 * @type {boolean}
 */
StoreSchema.prototype.sync;


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
DatabaseSchema.prototype.stores;
