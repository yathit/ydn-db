/**
 * @fileoverview Database operator supporting syncing.
 */


goog.provide('ydn.db.ISyncOperator');


/**
 *
 * @interface
 */
ydn.db.ISyncOperator = function() {
};


/**
 * Dump object into the database. Use only by synchronization process when updating from
 * server.
 * This is friendly module use only.
 * @param {string} store_name store name.
 * @param {!Array.<Object>} objs objects.
 * @return {goog.async.Deferred} df
 */
ydn.db.ISyncOperator.prototype.dumpInternal = goog.abstractMethod;


/**
 * List records from the database. Use only by synchronization process when
 * updating from server.
 * This is friendly module use only.
 * @param {string} store_name
 * @param {string} index_name
 * @param {IDBKeyRange} key_range
 * @param {boolean} reverse
 * @param {number} limit
 * @return {goog.async.Deferred} df
 */
ydn.db.ISyncOperator.prototype.listInternal = goog.abstractMethod;


/**
 * List keys from the database. Use only by synchronization process when
 * updating from server.
 * This is friendly module use only.
 * @param {string} store_name store name.
 * @param {?string} index_name index name.
 * @param {?IDBKeyRange} key_range key range.
 * @param {boolean} reverse reverse.
 * @param {number} limit limit.
 * @param {number} offset limit.
 * @param {boolean} unique limit.
 * @return {!ydn.db.Request} df.
 */
ydn.db.ISyncOperator.prototype.keysInternal = goog.abstractMethod;



