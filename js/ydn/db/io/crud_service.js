/**
 * @fileoverview Interface for query service.
 *
 * Use interface so that query, key and database can strongly typed
 * cross-talking.
 */


goog.provide('ydn.db.io.CrudService');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Cursor');
goog.require('ydn.db.Key');




/**
 * @interface
 */
ydn.db.io.CrudService = function() {

};


/**
 * Return object of given key.
 * @param {(string|!ydn.db.Key)=} store table name.
 * @param {(string|number|Date)=} id
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.io.CrudService.prototype.get = function(store, id) {

};


/**
 * @param {string} store table name.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {string|number|!Array.<(string|number)>=} opt_keys out-of-line keys
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.io.CrudService.prototype.put = function(store, value, opt_keys) {

};


/**
 * Remove a specific entry from a store or all.
 * @param {string=} opt_table delete the table as provided otherwise
 * delete all stores.
 * @param {(string|number)=} opt_key delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.io.CrudService.prototype.clear = function(opt_table, opt_key) {

};




