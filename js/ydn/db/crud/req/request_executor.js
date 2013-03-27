/**
 * @fileoverview Execute data request.
 *
 * Before invoking database request, transaction object (tx) must set
 * and active. Caller must preform setting tx. This class will not check
 * it, but run immediately. Basically thinks this as a static object.
 *
 * These classes assume requested store or index are available in the database.
 */


goog.provide('ydn.db.crud.req.RequestExecutor');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('ydn.db.InternalError');
goog.require('ydn.db.Key');



/**
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @param {string} scope
 * @constructor
 */
ydn.db.crud.req.RequestExecutor = function(dbname, schema, scope) {
  /**
   * @final
   */
  this.dbname = dbname;
  /**
   * @final
   */
  this.schema = schema;
  /**
   * @final
   */
  this.scope = scope;
};



/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.req.RequestExecutor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.crud.req.RequestExecutor');


/**
 * @protected
 * @type {!ydn.db.schema.Database}
 */
ydn.db.crud.req.RequestExecutor.prototype.schema;

/**
 * @protected
 * @type {string}
 */
ydn.db.crud.req.RequestExecutor.prototype.dbname = '';

/**
 * @protected
 * @type {string}
 */
ydn.db.crud.req.RequestExecutor.prototype.scope = '';




if (goog.DEBUG) {
/**
 * @inheritDoc
 */
ydn.db.crud.req.RequestExecutor.prototype.toString = function() {
  return 'RequestExecutor:' + this.scope;
};
}




