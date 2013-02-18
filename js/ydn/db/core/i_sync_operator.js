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
ydn.db.ISyncOperator.prototype.dump = goog.abstractMethod;



