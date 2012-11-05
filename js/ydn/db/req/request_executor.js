/**
 * @fileoverview Execute data request.
 *
 * Before invoking database request, transaction object (tx) must set
 * and active. Caller must preform setting tx. This class will not check
 * it, but run immediately. Basically thinks this as a static object.
 */


goog.provide('ydn.db.req.RequestExecutor');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('ydn.db.Query');
goog.require('ydn.db.InternalError');
goog.require('ydn.db.Key');
goog.require('ydn.db.Sql');



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



/**
 * Return object
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {(string|number|Date|!Array)} id object key to be retrieved, if not
 * provided,
 * all entries in the store will return.
 */
ydn.db.req.RequestExecutor.prototype.getById = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!ydn.db.Query} store_name  store name.
 */
ydn.db.req.RequestExecutor.prototype.getByQuery = goog.abstractMethod;



/**
 * Delete given key in the object store.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {(!Array|string|number)} id object key to be retrieved, if not
 * provided,
 * all entries in the store will return.
 */
ydn.db.req.RequestExecutor.prototype.clearById = goog.abstractMethod;


/**
 * Clear a store or stores.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {(!Array.<string>|string)=} store table name.
 */
ydn.db.req.RequestExecutor.prototype.clearByStore = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {!Array.<string>} table store name.
 */
ydn.db.req.RequestExecutor.prototype.countStores = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {string} table store name.
 * @param {ydn.db.KeyRange} keyRange the key range.
 */
ydn.db.req.RequestExecutor.prototype.countKeyRange = goog.abstractMethod;


/**
 * Execute GET request callback results to df.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {string} store_name table name.
 * @param {!Array.<string|number>} ids id to get.
 * @throws {ydn.db.InvalidKeyException}
 * @throws {ydn.error.InternalError}
 */
ydn.db.req.RequestExecutor.prototype.listByIds = goog.abstractMethod;


/**
 * Execute GET request callback results to df.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!Array.<!ydn.db.Key>} keys id to get.
 */
ydn.db.req.RequestExecutor.prototype.listByKeys = goog.abstractMethod;


/**
 * List records from stores.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!Array.<string>} store_name  store name.
 */
ydn.db.req.RequestExecutor.prototype.listByStores = goog.abstractMethod;


/**
 * List record in a store.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!ydn.db.Query} store_name  store name.
 */
ydn.db.req.RequestExecutor.prototype.listByQuery = goog.abstractMethod;


/**
 * Put object and return key inserted.
 * @param {!goog.async.Deferred} return key in deferred function.
 * @param {string} store table name.
 * @param {!Object} obj object to put.
 * @param {(!Array|string|number)=} opt_key optional out-of-line key.
 */
ydn.db.req.RequestExecutor.prototype.putObject = goog.abstractMethod;


/**
 * Put objects and return list of key inserted.
 * @param {!goog.async.Deferred} return keys in deferred function.
 * @param {string} store_name store name.
 * @param {!Array.<Object>} objs object to put.
 * @param {!Array.<(!Array|string|number)>=} opt_key optional out-of-line keys.
 */
ydn.db.req.RequestExecutor.prototype.putObjects = goog.abstractMethod;



/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!Array.<Object>} objs object to put.
 * @param {!Array.<!ydn.db.Key>} keys list of keys.
 */
ydn.db.req.RequestExecutor.prototype.putByKeys = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!ydn.db.Sql} q the query.
 */
ydn.db.req.RequestExecutor.prototype.fetchQuery = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!ydn.db.Query} q the query.
 */
ydn.db.req.RequestExecutor.prototype.fetchCursor = goog.abstractMethod;


/**
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!ydn.db.Query} q query.
 * @param {function(*): boolean} clear clear iteration function.
 * @param {function(*): *} update update iteration function.
 * @param {function(*): *} map map iteration function.
 * @param {function(*, *, number=): *} reduce reduce iteration function.
 * @param {*} initial initial value for reduce iteration function.
 */
ydn.db.req.RequestExecutor.prototype.iterate = goog.abstractMethod;
