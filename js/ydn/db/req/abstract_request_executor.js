/**
 * @fileoverview Execute CRUD and query request.
 *
 */


goog.provide('ydn.db.req.AbstractRequestExecutor');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('ydn.db.Query');
goog.require('ydn.db.Key');
goog.require('ydn.db.InternalError');




/**
 * @param {ydn.db.DatabaseSchema} schema
 * @constructor
 */
ydn.db.req.AbstractRequestExecutor = function(schema) {
  /**
   * @protected
   * @final
   * @type {ydn.db.DatabaseSchema}
   */
  this.schema = schema;
};



/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.req.AbstractRequestExecutor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.req.AbstractRequestExecutor');


/**
 *
 * @type {SQLTransaction|IDBTransaction|Object}
 * @protected
 */
ydn.db.req.AbstractRequestExecutor.prototype.tx = null;


/**
 * @protected
 * @type {string}
 */
ydn.db.req.AbstractRequestExecutor.prototype.scope = '?';


/**
 *
 * @param {SQLTransaction|IDBTransaction|Object} tx
 * @param {string} scope
 */
ydn.db.req.AbstractRequestExecutor.prototype.setTx = function(tx, scope) {
  this.tx = tx;
  this.scope_ = scope;
};


/**
 * Return true if transaction object is active.
 * @return {boolean}
 */
ydn.db.req.AbstractRequestExecutor.prototype.isActive = function() {
  return goog.isDefAndNotNull(this.tx);
};



/**
 * @throws {ydn.db.InternalError}
 * @return {SQLTransaction|IDBTransaction|Object}
 * @protected
 */
ydn.db.req.AbstractRequestExecutor.prototype.getTx = function() {
  if (!this.isActive()) {
    // this kind of error is not due to user.
    throw new ydn.db.InternalError('Scope: ' + this.scope + ' invalid.');
  }
  return this.tx;
};


/**
 * Return object
 * @param {string} store table name.
 * @param {(string|number)} id object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.req.AbstractRequestExecutor.prototype.getById = goog.abstractMethod;

