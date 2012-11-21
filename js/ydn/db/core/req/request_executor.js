/**
 * @fileoverview Execute data request.
 *
 * Before invoking database request, transaction object (tx) must set
 * and active. Caller must preform setting tx. This class will not check
 * it, but run immediately. Basically thinks this as a static object.
 *
 * These classes assume requested store or index are available in the database.
 */


goog.provide('ydn.db.req.RequestExecutor');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('ydn.db.InternalError');
goog.require('ydn.db.Key');



/**
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 */
ydn.db.req.RequestExecutor = function(dbname, schema) {
  /**
   * @protected
   * @final
   * @type {string}
   */
  this.dbname = dbname;
  /**
   * @protected
   * @final
   * @type {!ydn.db.schema.Database}
   */
  this.schema = schema;
};



/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.req.RequestExecutor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.req.RequestExecutor');


/**
 *
 * @type {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage}
 * @protected
 */
ydn.db.req.RequestExecutor.prototype.tx = null;


/**
 * @protected
 * @type {string}
 */
ydn.db.req.RequestExecutor.prototype.scope = '?';


/**
 *
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx transaction object.
 * @param {string} scope scope for logistic purpose only.
 */
ydn.db.req.RequestExecutor.prototype.setTx = function(tx, scope) {
  this.tx = tx;
  this.scope_ = scope;
};




