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
var KeyPaths = function() {};

/**
 * @type {string}
 */
KeyPaths.prototype.id;

/**
 * @type {string}
 */
KeyPaths.prototype.etag;

/**
 * @type {string}
 */
KeyPaths.prototype.nextUrl;

/**
 * @type {string}
 */
KeyPaths.prototype.updated;

/**
 * @constructor
 */
var AtomOptions = function() {};


/**
 * @type {string}
 */
AtomOptions.prototype.baseUri;


/**
 * @type {KeyPaths}
 */
AtomOptions.prototype.keyPaths;


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
 * @type {{request: Function}}
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
