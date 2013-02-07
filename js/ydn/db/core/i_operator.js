/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.core.IOperator');
goog.require('ydn.db.req.RequestExecutor');
goog.require('ydn.db.KeyRange');



/**
 * @interface
 */
ydn.db.core.IOperator = function() {};



/**
 *
 * @param {!Array.<string>|string} store_name store name or names.
 * @param {string=} index name.
 * @param {ydn.db.KeyRange=} opt_key_range key range.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.core.IOperator.prototype.count = goog.abstractMethod;

/**
 * Return object or objects of given key or keys.
 * @param {(string|!ydn.db.Key)=} arg1 table name.
 * @param {(ydn.db.KeyRange|string|number|Date|!Array)=} arg2
 * object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.core.IOperator.prototype.get = goog.abstractMethod;


/**
 * Return object or objects of given key or keys.
 * @param {(*|string|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(ydn.db.KeyRange|!Array.<string|number|Date|!Array>)=} arg2 list of primary
 * keys or key range.
 * @param {number=} limit limit.
 * @param {number=} offset offset.
 * @param {string=} index index name.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.core.IOperator.prototype.values = goog.abstractMethod;


/**
 * List keys.
 * @param {string|*} store_name or iterator
 * @param {ydn.db.KeyRange=} key_range key range.
 * @param {number=} limit limit
 * @param {number=} offset offset
 * @param {string=} index index name.
 * @return {!goog.async.Deferred} result promise.
 */
ydn.db.core.IOperator.prototype.keys = goog.abstractMethod;


/**
 * Execute ADD request either storing result to tx or callback to df.
 * @param {string|StoreSchema} store_name_or_schema store name or
 * schema.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {*=} opt_keys out-of-line keys.
 * @return {!goog.async.Deferred} return newly created keys in promise.
 */
ydn.db.core.IOperator.prototype.add = goog.abstractMethod;


/**
 * Execute PUT request to the store of given records in delimited text.
 * @param {string} store_name table name.
 * @param {string} data delimited text to put. one object per line.
 * @param {string=} delimiter field delimiter.
 */
ydn.db.core.IOperator.prototype.load = goog.abstractMethod;


/**
 * Execute PUT request either storing result to tx or callback to df.
 * @param {string|StoreSchema} store_name_or_schema store name or
 * schema.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {string|number|!Array.<(string|number)>=} opt_keys out-of-line keys.
 * @return {!goog.async.Deferred} return newly created keys in promise.
 */
ydn.db.core.IOperator.prototype.put = goog.abstractMethod;


/**
 * Remove a specific entry from a store or all.
 * @param {(!Array.<string>|string)=} arg1 delete the table as provided
 * otherwise
 * delete all stores.
 * @param {(string|number)=} arg2 delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.core.IOperator.prototype.clear = goog.abstractMethod;
