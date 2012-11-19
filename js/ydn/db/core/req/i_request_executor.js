/**
 * @fileoverview Execute data request.
 *
 * Before invoking database request, transaction object (tx) must set
 * and active. Caller must preform setting tx. This class will not check
 * it, but run immediately. Basically thinks this as a static object.
 */


goog.provide('ydn.db.core.req.IRequestExecutor');


/**
 * @interface
 */
ydn.db.core.req.IRequestExecutor = function() {};




/**
 *
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx transaction object.
 * @param {string} scope scope for logistic purpose only.
 */
ydn.db.core.req.IRequestExecutor.prototype.setTx = goog.abstractMethod;



/**
 * Delete given key in the object store.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {(!Array|string|number)} id object key to be retrieved, if not
 * provided,
 * all entries in the store will return.
 */
ydn.db.core.req.IRequestExecutor.prototype.clearById = goog.abstractMethod;


/**
 * Clear a store or stores.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {(!Array.<string>|string)=} store table name.
 */
ydn.db.core.req.IRequestExecutor.prototype.clearByStore = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {!Array.<string>} table store name.
 */
ydn.db.core.req.IRequestExecutor.prototype.countStores = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {string} table store name.
 * @param {ydn.db.KeyRange} keyRange the key range.
 */
ydn.db.core.req.IRequestExecutor.prototype.countKeyRange = goog.abstractMethod;


/**
 * Return object
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {(string|number|Date|!Array)} id object key to be retrieved, if not
 * provided,
 * all entries in the store will return.
 */
ydn.db.core.req.IRequestExecutor.prototype.getById = goog.abstractMethod;


/**
 * Retrieve primary keys from a store in a given key range.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {!IDBKeyRange} key_range to retrieve.
 * @param {boolean} reverse ordering.
 * @param {number} limit the results.
 * @param {number} offset skip first results.
 */
ydn.db.core.req.IRequestExecutor.prototype.keysByKeyRange =
  goog.abstractMethod;


/**
 * Retrieve primary keys from a store in a given index key range.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {!IDBKeyRange} key_range to retrieve.
 * @param {string} index name.
 * @param {boolean} reverse ordering.
 * @param {number} limit the results.
 * @param {number} offset skip first results.
 * @param {boolean} unique unique key.
 */
ydn.db.core.req.IRequestExecutor.prototype.keysByIndexKeyRange =
  goog.abstractMethod;


/**
 * Retrieve primary keys from a store in a given index key range.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {!Array} list of keys to retrieve.
 * @param {string} index name.
 * @param {boolean} reverse ordering.
 * @param {number} limit the results.
 * @param {number} offset skip first results.
 */
ydn.db.core.req.IRequestExecutor.prototype.keysByIndexKeys =
  goog.abstractMethod;


/**
 * Retrieve index keys from a store in a given primary key range.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {string} index name.
 * @param {!IDBKeyRange} key_range to retrieve.
 * @param {boolean} reverse ordering.
 * @param {number} limit the results.
 * @param {number} offset skip first results.
 * @param {boolean} distinct key only.
 */
ydn.db.core.req.IRequestExecutor.prototype.keysIndexByKeyRange =
  goog.abstractMethod;

/**
 * Retrieve index keys from a store in a given primary key range.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {string} store table name.
 * @param {string} index name.
 * @param {!Array} list of keys to retrieve.
 * @param {boolean} reverse ordering.
 * @param {number} limit the results.
 * @param {number} offset skip first results.
 * @param {boolean} distinct key only.
 */
ydn.db.core.req.IRequestExecutor.prototype.keysIndexByKeys =
  goog.abstractMethod;


/**
 * Execute GET request callback results to df.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {string} store_name table name.
 * @param {!Array.<string|number>} ids id to get.
 * @throws {ydn.db.InvalidKeyException}
 * @throws {ydn.error.InternalError}
 */
ydn.db.core.req.IRequestExecutor.prototype.listByIds = goog.abstractMethod;


/**
 * Execute GET request callback results to df.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!Array.<!ydn.db.Key>} keys id to get.
 */
ydn.db.core.req.IRequestExecutor.prototype.listByKeys = goog.abstractMethod;



/**
 * List records from stores.
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!Array.<string>} store_name  store name.
 */
ydn.db.core.req.IRequestExecutor.prototype.listByStores = goog.abstractMethod;



/**
 * Put object and return key inserted.
 * @param {!goog.async.Deferred} return key in deferred function.
 * @param {string} store table name.
 * @param {!Object} obj object to put.
 * @param {(!Array|string|number)=} opt_key optional out-of-line key.
 */
ydn.db.core.req.IRequestExecutor.prototype.putObject = goog.abstractMethod;


/**
 * Put objects and return list of key inserted.
 * @param {!goog.async.Deferred} return keys in deferred function.
 * @param {string} store_name store name.
 * @param {!Array.<Object>} objs object to put.
 * @param {!Array.<(!Array|string|number)>=} opt_key optional out-of-line keys.
 */
ydn.db.core.req.IRequestExecutor.prototype.putObjects = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} return object in deferred function.
 * @param {!Array.<Object>} objs object to put.
 * @param {!Array.<!ydn.db.Key>} keys list of keys.
 */
ydn.db.core.req.IRequestExecutor.prototype.putByKeys = goog.abstractMethod;




