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
 * Execute SQL statement.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {?function(*, boolean=)} df return key in deferred function.
 * @param {!ydn.db.Sql} sql  SQL object.
 * @param {!Array} params SQL parameters.
 */
ydn.db.sql.req.IRequestExecutor.prototype.executeSql = goog.abstractMethod;


