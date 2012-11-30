/**
 * @fileoverview Interface for index base request.
 *
 */


goog.provide('ydn.db.sql.req.IRequestExecutor');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.Streamer');
goog.require('ydn.db.Sql');


/**
 * @interface
 * @extends {ydn.db.index.req.IRequestExecutor}
 */
ydn.db.sql.req.IRequestExecutor = function() {};



/**
 * Explain plan.
 * @param {!ydn.db.Sql} sql  SQL object.
 * @return {Object} query plan in JSON.
 */
ydn.db.sql.req.IRequestExecutor.prototype.explainSql = goog.abstractMethod;



/**
 * Explain plan.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!ydn.db.Sql} sql  SQL object.
 */
ydn.db.sql.req.IRequestExecutor.prototype.executeSql = goog.abstractMethod;


