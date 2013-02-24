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
AtomOptions.prototype.keyPathId;

/**
 * @type {(string|number|!Array.<number|string>)}
 */
AtomOptions.prototype.keyPathEtag;

/**
 * This need to be a string because, the value is used as dual purpose of index name.
 * The string can be use dotted notation for nested key path.
 * @type {string}
 */
AtomOptions.prototype.keyPathUpdated;


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
function StoreSyncOptionJson() {}


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
StoreSyncOptionJson.prototype.format;

/**
 * @type {number}
 */
StoreSyncOptionJson.prototype.readRequestTimeout;

/**
 * @type {number}
 */
StoreSyncOptionJson.prototype.writeRequestTimeout;

/**
 * @type {?Function}
 */
StoreSyncOptionJson.prototype.transport;

/**
 * @type {AtomOptions|GDataOptions|ODataOptions}
 */
StoreSyncOptionJson.prototype.options;

/**
 * Entry list fetch strategy. Supported method are
 * ['last-updated', 'descending-key']
 * @type {Array}
 */
StoreSyncOptionJson.prototype.fetchStrategies;


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
 * @type {StoreSyncOptionJson}
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
