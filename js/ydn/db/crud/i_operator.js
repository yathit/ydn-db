/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.crud.IOperator');
goog.require('ydn.db.crud.req.RequestExecutor');
goog.require('ydn.db.KeyRange');



/**
 * @interface
 */
ydn.db.crud.IOperator = function() {};



/**
 * Abort current request transaction.
 */
ydn.db.crud.IOperator.prototype.abort = goog.abstractMethod;

/**
 *
 * @param {!Array.<string>|string} store_name store name or names.
 * @param {string=} index name.
 * @param {(string|ydn.db.KeyRange)=} key_range_index key range.
 * @param {ydn.db.KeyRange=} opt_key_range key range.
 * @param {boolean=} unique count unique index key.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.crud.IOperator.prototype.count = goog.abstractMethod;

/**
 * Return object or objects of given key or keys.
 * @param {(string|!ydn.db.Key)=} arg1 table name.
 * @param {(ydn.db.KeyRange|string|number|Date|!Array)=} arg2
 * object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.crud.IOperator.prototype.get = goog.abstractMethod;


/**
 * Return object or objects of given key or keys.
 * @param {(*|string|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(string|KeyRangeJson|ydn.db.KeyRange|!Array.<string|number|Date|!Array>)=} arg2 list of primary
 * keys or key range.
 * @param {(number|KeyRangeJson|ydn.db.KeyRange)=} arg3 limit.
 * @param {number=} arg4 offset.
 * @param {(boolean|number)=} arg5 index name.
 * @param {boolean=} arg6 reverse.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.crud.IOperator.prototype.values = goog.abstractMethod;


/**
 * List keys.
 * @param {string|*} store_name or iterator
 * @param {(string|ydn.db.KeyRange|KeyRangeJson)=} arg1 key range or index name.
 * @param {(number|ydn.db.KeyRange|KeyRangeJson)=} arg2 limit or key range
 * @param {number=} arg3 offset or limit
 * @param {(boolean|number)=} arg4 reverse or offset.
 * @param {boolean=} arg5 reverse.
 * @return {!goog.async.Deferred} result promise.
 */
ydn.db.crud.IOperator.prototype.keys = goog.abstractMethod;


/**
 * Execute ADD request either storing result to tx or callback to df.
 * @param {string|StoreSchema} store_name_or_schema store name or
 * schema.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {*=} opt_keys out-of-line keys.
 * @return {!goog.async.Deferred} return newly created keys in promise.
 */
ydn.db.crud.IOperator.prototype.add = goog.abstractMethod;


/**
 * Execute PUT request to the store of given records in delimited text.
 * @param {string} store_name table name.
 * @param {string} data delimited text to put. one object per line.
 * @param {string=} delimiter field delimiter.
 */
ydn.db.crud.IOperator.prototype.load = goog.abstractMethod;


/**
 * Execute PUT request either storing result to tx or callback to df.
 * @param {string|StoreSchema|ydn.db.Key|!Array.<!ydn.db.Key>} arg1 store name
 * or schema, key or array of keys.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {IDBKey|!Array.<IDBKey>=} opt_keys out-of-line keys.
 * @return {!goog.async.Deferred} return newly created keys in promise.
 */
ydn.db.crud.IOperator.prototype.put = goog.abstractMethod;


/**
 * Clear a specific entry from a store or all.
 * @param {(!Array.<string>|string)=} arg1 delete the table as provided
 * otherwise
 * delete all stores.
 * @param {(string|number|Date|KeyRangeJson|ydn.db.KeyRange)=}  arg2 delete a
 * specific row.
 * @param {*=} arg3 argument control
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.crud.IOperator.prototype.clear = goog.abstractMethod;



/**
 * Remove a specific entry from a store or all.
 * @param {string|ydn.db.Key|!Array.<!ydn.db.Key>} store_name store name
 * @param {(string|number|Date|KeyRangeJson|ydn.db.KeyRange)=} arg2 delete a specific key or
 * key range.
 * @param {(string|number|Date|KeyRangeJson|ydn.db.KeyRange)=} arg3 delete a specific key or
 * key range.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return number of record removed a deferred function.
 */
ydn.db.crud.IOperator.prototype.remove = goog.abstractMethod;