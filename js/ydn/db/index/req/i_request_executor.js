/**
 * @fileoverview Interface for index base request.
 *
 */


goog.provide('ydn.db.index.req.IRequestExecutor');
goog.require('ydn.db.core.req.IRequestExecutor');


/**
 * @interface
 * @extends {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.index.req.IRequestExecutor = function() {};




/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!ydn.db.Iterator} store_name  store name.
 */
ydn.db.index.req.IRequestExecutor.prototype.getByIterator = goog.abstractMethod;


/**
 * Explain plan.
 * @param {!ydn.db.Sql} sql  SQL object.
 * @return {Object} query plan in JSON.
 */
ydn.db.index.req.IRequestExecutor.prototype.explainSql = goog.abstractMethod;



/**
 * Explain plan.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!ydn.db.Sql} sql  SQL object.
 */
ydn.db.index.req.IRequestExecutor.prototype.executeSql = goog.abstractMethod;



/**
 * List record in a store.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!ydn.db.Iterator} store_name  store name.
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


/**
 * Cursor scan iteration.
 * @param {!goog.async.Deferred} df promise on completed.
 * @param {!Array.<!ydn.db.Iterator>} queries the cursor.
 * @param {!Array.<!ydn.db.Streamer>} passthrough_streamers streamers.
 * @param {!ydn.db.algo.AbstractSolver|
  * function(!Array, !Array): !Array} solver solver.
 */
ydn.db.index.req.IRequestExecutor.prototype.scan = goog.abstractMethod;

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


/**
 *
 * @param {!goog.async.Deferred} df on completed.
 * @param {!ydn.db.Iterator} cursor the cursor.
 * @param {Function} callback icursor handler.
 * @param {ydn.db.base.CursorMode?=} mode mode.
 */
ydn.db.index.req.IRequestExecutor.prototype.open = goog.abstractMethod;



/**
 * Get list of keys in a range.
 * @param {!goog.async.Deferred} df result promise.
 * @param {string} store_name store name.
 * @param {string} index_name Index name of key range.
 * @param {!Array} keys The key range.
 * @param {number=} offset number of result to skip.
 * @param {number=} limit place upper bound on results.
 */
ydn.db.index.req.IRequestExecutor.prototype.getIndexKeysByKeys =
  goog.abstractMethod;


/**
 * Get list of keys in a range.
 * @param {!goog.async.Deferred} df result promise.
 * @param {string} store_name store name.
 * @param {IDBKeyRange} key_range The key range.
 * @param {string} key_range_index Index name of key range.
 * @param {number=} offset number of result to skip.
 * @param {number=} limit place upper bound on results.
 */
ydn.db.index.req.IRequestExecutor.prototype.getKeysByIndexKeyRange =
  goog.abstractMethod;