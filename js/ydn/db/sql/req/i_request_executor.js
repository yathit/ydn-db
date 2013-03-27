/**
 * @fileoverview Interface for index base request.
 *
 */


goog.provide('ydn.db.sql.req.IRequestExecutor');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.Streamer');
goog.require('ydn.db.Sql');


/**
 * @interface
 * @extends {ydn.db.index.req.IRequestExecutor}
 */
ydn.db.sql.req.IRequestExecutor = function() {};



/**
 * Execute SQL statement.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {number} tx_no tx no
 * @param {?function(*, boolean=)} df return key in deferred function.
 * @param {!ydn.db.Sql} sql  SQL object.
 * @param {!Array} params SQL parameters.
 */
ydn.db.sql.req.IRequestExecutor.prototype.executeSql = goog.abstractMethod;


