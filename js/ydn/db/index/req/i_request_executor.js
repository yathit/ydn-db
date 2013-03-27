/**
 * @fileoverview Interface for index base request.
 *
 */


goog.provide('ydn.db.index.req.IRequestExecutor');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.Streamer');
goog.require('ydn.db.index.req.AbstractCursor');



/**
 * @interface
 * @extends {ydn.db.crud.req.IRequestExecutor}
 */
ydn.db.index.req.IRequestExecutor = function() {};


/**
 * List record in a store.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {number} tx_no transaction number
 * @param {?function(*, boolean=)} return key in deferred function.
 * @param {!ydn.db.Iterator} store_name  store name.
 * @param {number=} limit
 * @param {number=} offset
 */
ydn.db.index.req.IRequestExecutor.prototype.keysByIterator = goog.abstractMethod;

/**
 * List record in a store.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {number} tx_no transaction number
 * @param {?function(*, boolean=)} df key in deferred function.
 * @param {!ydn.db.Iterator} store_name  store name.
 * @param {number=} limit
 * @param {number=} offset
 */
ydn.db.index.req.IRequestExecutor.prototype.listByIterator = goog.abstractMethod;


//
//
///**
// * @param {!goog.async.Deferred} return object in deferred function.
// * @param {!ydn.db.Sql} q the query.
// * @deprecated
// */
//ydn.db.index.req.IRequestExecutor.prototype.fetchQuery = goog.abstractMethod;
//
//
///**
// * @param {!goog.async.Deferred} return object in deferred function.
// * @param {!ydn.db.Iterator} q the query.
// * @deprecated
// */
//ydn.db.index.req.IRequestExecutor.prototype.fetchCursor = goog.abstractMethod;


///**
// * Cursor scan iteration.
// * @param {!goog.async.Deferred} df promise on completed.
// * @param {!Array.<!ydn.db.Iterator>} queries the cursor.
// * @param {!Array.<!ydn.db.Streamer>} passthrough_streamers streamers.
// * @param {!ydn.db.algo.AbstractSolver|
//  * function(!Array, !Array): !Array} solver solver.
// */
//ydn.db.index.req.IRequestExecutor.prototype.scan = goog.abstractMethod;

//
///**
// * @param {goog.async.Deferred} df deferred to feed result.
// * @param {!ydn.db.Iterator} q query.
// * @param {function(*): boolean} clear clear iteration function.
// * @param {function(*): *} update update iteration function.
// * @param {function(*): *} map map iteration function.
// * @param {function(*, *, number=): *} reduce reduce iteration function.
// * @param {*} initial initial value for reduce iteration function.
// * @param {?function(*): *} finalize finalize function.
// */
//ydn.db.index.req.IRequestExecutor.prototype.iterate = goog.abstractMethod;

//
///**
// *
// * @param {!goog.async.Deferred} df on completed.
// * @param {!ydn.db.Iterator} cursor the cursor.
// * @param {Function} callback icursor handler.
// * @param {ydn.db.base.CursorMode?=} mode mode.
// */
//ydn.db.index.req.IRequestExecutor.prototype.open = goog.abstractMethod;



/**
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {number} tx_no transaction number
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec
 * @param {boolean} key_only mode.
 * @return {!ydn.db.index.req.AbstractCursor} cursor.
 */
ydn.db.index.req.IRequestExecutor.prototype.getCursor = goog.abstractMethod;

/**
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {number} tx_no transaction number
 * @param {string} store_name
 * @param {string=} index_name
 * @return {!ydn.db.Streamer}
 */
ydn.db.index.req.IRequestExecutor.prototype.getStreamer = goog.abstractMethod;