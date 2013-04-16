
/**
 * @fileoverview Interface for index base request.
 *
 */


goog.provide('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.Streamer');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.core.req.AbstractCursor');



/**
 * @interface
 * @extends {ydn.db.crud.req.IRequestExecutor}
 */
ydn.db.core.req.IRequestExecutor = function() {};


/**
 * List record in a store.
 * @param {ydn.db.con.IDatabase.Transaction} tx
 * @param {string} tx_no transaction number.
 * @param {?function(*, boolean=)} return key in deferred function.
 * @param {!ydn.db.Iterator} store_name  store name.
 * @param {number=} opt_limit limit.
 */
ydn.db.core.req.IRequestExecutor.prototype.keysByIterator =
    goog.abstractMethod;


/**
 * List record in a store.
 * @param {ydn.db.con.IDatabase.Transaction} tx
 * @param {string} tx_no transaction number.
 * @param {?function(*, boolean=)} df key in deferred function.
 * @param {!ydn.db.Iterator} iter  store name.
 * @param {number=} opt_limit limit.
 */
ydn.db.core.req.IRequestExecutor.prototype.listByIterator =
    goog.abstractMethod;


/**
 * @param {ydn.db.con.IDatabase.Transaction} tx
 * @param {string} tx_no transaction number.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index.
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec.
 * @param {boolean} key_only mode.
 * @param {boolean} key_query true for keys query method.
 * @return {!ydn.db.core.req.AbstractCursor} cursor.
 */
ydn.db.core.req.IRequestExecutor.prototype.getCursor = goog.abstractMethod;


/**
 * @param {ydn.db.con.IDatabase.Transaction} tx
 * @param {string} tx_no transaction number.
 * @param {string} store_name
 * @param {string=} opt_index_name
 * @return {!ydn.db.Streamer}
 */
ydn.db.core.req.IRequestExecutor.prototype.getStreamer = goog.abstractMethod;

