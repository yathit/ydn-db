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
var AtomOptions = function() {};


/**
 * @type {string}
 */
AtomOptions.prototype.baseUri;


/**
 * @type {(string|number|!Array.<number|string>)}
 */
AtomOptions.prototype.pathId;

/**
 * @type {(string|number|!Array.<number|string>)}
 */
AtomOptions.prototype.pathEtag;

/**
 * @type {(string|number|!Array.<number|string>)}
 */
AtomOptions.prototype.pathUpdated;


/**
 * @extends {AtomOptions}
 * @constructor
 */
var GDataOptions = function() {};


/**
 * @type {string?}
 */
GDataOptions.prototype.version;


/**
 * @type {string?}
 */
GDataOptions.prototype.projection;


/**
 * @extends {AtomOptions}
 * @constructor
 */
var ODataOptions = function() {};


/**
 * @constructor
 */
function StoreSyncOptions() {}


/**
 * @constructor
 */
function Transport() {}

/**
 * @type {Function}
 */
Transport.prototype.send;


/**
 * @type {string}
 */
StoreSyncOptions.prototype.format;

/**
 * @type {number}
 */
StoreSyncOptions.prototype.readRequestTimeout;

/**
 * @type {number}
 */
StoreSyncOptions.prototype.writeRequestTimeout;

/**
 * @type {Function}
 */
StoreSyncOptions.prototype.transport;

/**
 * @type {AtomOptions|GDataOptions|ODataOptions}
 */
StoreSyncOptions.prototype.options;


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
 * Name of sync
 * @type {StoreSyncOptions}
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
