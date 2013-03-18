/**
 * @fileoverview Execute data request.
 *
 * Before invoking database request, transaction object (tx) must set
 * and active. Caller must preform setting tx. This class will not check
 * it, but run immediately. Basically thinks this as a static object.
 *
 * These classes assume requested store or index are available in the database.
 */


goog.provide('ydn.db.core.req.RequestExecutor');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('ydn.db.InternalError');
goog.require('ydn.db.Key');



/**
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 */
ydn.db.core.req.RequestExecutor = function(dbname, schema) {
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

  this.tx = null;
  this.request_tx = null;
  this.scope = '';
};



/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.RequestExecutor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.core.req.RequestExecutor');


/**
 * Running tx.
 * @type {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage}
 * @protected
 */
ydn.db.core.req.RequestExecutor.prototype.tx = null;

/**
 * Transaction object is sed when receiving a request before result df
 * callback and set null after that callback so that it can be aborted
 * in the callback.
 * In general, this tx may be different from running tx.
 * @type {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage}
 * @protected
 */
ydn.db.core.req.RequestExecutor.prototype.request_tx = null;


/**
 * @protected
 * @type {string}
 */
ydn.db.core.req.RequestExecutor.prototype.scope = '';


/**
 *
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx transaction object.
 * @param {string=} scope scope for logistic purpose only.
 */
ydn.db.core.req.RequestExecutor.prototype.setTx = function(tx, scope) {
  this.tx = tx;
  this.scope_ = scope || '';
};


/**
 * Abort current request transaction.
 */
ydn.db.core.req.RequestExecutor.prototype.abort = function() {
  if (this.request_tx) {
    this.logger.finer(this + ': abort transaction');
    this.request_tx['abort']();
  } else {
    throw new ydn.error.InvalidOperationError();
  }
};


if (goog.DEBUG) {
/**
 * @inheritDoc
 */
ydn.db.core.req.RequestExecutor.prototype.toString = function() {
  return 'RequestExecutor';
};
}




