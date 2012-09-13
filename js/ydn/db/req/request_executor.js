/**
 * @fileoverview Execute CRUD and query request.
 *
 * Before invoking database request, transaction object (tx) must set
 * and active. Caller must preform setting tx. This class will not check
 * it, but run immediately. Basically thinks this as a static object.
 */


goog.provide('ydn.db.req.RequestExecutor');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('ydn.db.Query');
goog.require('ydn.db.Key');
goog.require('ydn.db.InternalError');



/**
 * @param {ydn.db.DatabaseSchema} schema
 * @constructor
 */
ydn.db.req.RequestExecutor = function(schema) {
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
ydn.db.req.RequestExecutor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.req.RequestExecutor');


/**
 *
 * @type {SQLTransaction|IDBTransaction|Object}
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
 * @param {SQLTransaction|IDBTransaction|Object} tx
 * @param {string} scope scope for logistic purpose only.
 */
ydn.db.req.RequestExecutor.prototype.setTx = function(tx, scope) {
  this.tx = tx;
  this.scope_ = scope;
};



//
//
///**
// * @throws {ydn.db.InternalError}
// * @return {SQLTransaction|IDBTransaction|Object}
// * @protected
// */
//ydn.db.req.RequestExecutor.prototype.getTx = function() {
//  if (!this.isActive()) {
//    // this kind of error is not due to user.
//    throw new ydn.db.InternalError('Scope: ' + this.scope + ' invalid.');
//  }
//  return this.tx;
//};


/**
 * Return object
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {(string|number)} id object key to be retrieved, if not provided,
 * all entries in the store will return.
 */
ydn.db.req.RequestExecutor.prototype.getById = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store_name
 * @param {!Array.<string|number>} ids
 */
ydn.db.req.RequestExecutor.prototype.getByIds = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!Array.<!ydn.db.Key>} keys
 */
ydn.db.req.RequestExecutor.prototype.getByKeys = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {(string|!Array.<string>)=} store_name
 */
ydn.db.req.RequestExecutor.prototype.getByStore = goog.abstractMethod;


/**
 * Return object
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {!Object} obj
 * all entries in the store will return.
 */
ydn.db.req.RequestExecutor.prototype.putObject = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store_name
 * @param {!Array.<Object>} objs
 */
ydn.db.req.RequestExecutor.prototype.putObjects = goog.abstractMethod;



/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!Array.<Object>} objs
 * @param {!Array.<!ydn.db.Key>} keys
 */
ydn.db.req.RequestExecutor.prototype.putByKeys = goog.abstractMethod;


/**
 * Return object
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {(string|number)} id object key to be retrieved, if not provided,
 * all entries in the store will return.
 */
ydn.db.req.RequestExecutor.prototype.clearById = goog.abstractMethod;



/**
 * Return object
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {(!Array.<string>|string)=} store table name.
 */
ydn.db.req.RequestExecutor.prototype.clearByStore = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {string} table store name.
 */
ydn.db.req.RequestExecutor.prototype.count = goog.abstractMethod;



/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!ydn.db.Query} q query.
 * @param {number=} max
 * @param {number=} skip
 */
ydn.db.req.RequestExecutor.prototype.fetch = goog.abstractMethod;