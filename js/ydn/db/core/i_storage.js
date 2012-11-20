/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.core.IStorage');
goog.require('ydn.db.req.RequestExecutor');
goog.require('ydn.db.KeyRange');



/**
 * @extends {ydn.db.tr.IStorage}
 * @interface
 */
ydn.db.core.IStorage = function() {};




/**
 *
 * @param {!Array.<string>|string=} store_name store name or names.
 * @param {ydn.db.KeyRange=} opt_key_range key range.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.core.IStorage.prototype.count = goog.abstractMethod;

/**
 * Return object or objects of given key or keys.
 * @param {(string|!ydn.db.Key)=} arg1 table name.
 * @param {(string|number|Date|!Array)=} arg2
 * object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.core.IStorage.prototype.get = goog.abstractMethod;


/**
 * Return object or objects of given key or keys.
 * @param {(string|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(ydn.db.KeyRange|!Array.<string>)=} arg2 primary key to be retrieved, if not provided,
 * all entries in the store will return. key range
 * @param {boolean=} reverse to reverse.
 * @param {number=} limit limit.
 * @param {number=} offset offset.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.core.IStorage.prototype.list = goog.abstractMethod;


/**
 * Execute PUT request either storing result to tx or callback to df.
 * @param {string|StoreSchema} store_name_or_schema store name or
 * schema.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {string|number|!Array.<(string|number)>=} opt_keys out-of-line keys.
 * @return {!goog.async.Deferred} return newly created keys in promise.
 */
ydn.db.core.IStorage.prototype.put = goog.abstractMethod;


/**
 * Remove a specific entry from a store or all.
 * @param {(!Array.<string>|string)=} arg1 delete the table as provided
 * otherwise
 * delete all stores.
 * @param {(string|number)=} arg2 delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.core.IStorage.prototype.clear = goog.abstractMethod;
