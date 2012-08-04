/**
 * @fileoverview Interface for database.
 */

goog.provide('ydn.db.Db');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Query');


/**
 * @interface
 */
ydn.db.Db = function() {};


/**
 * @define {string}
 */
ydn.db.Db.DEFAULT_TEXT_STORE = 'default_text_store';


/**
 *
 *
 * @param {string} key
 * @param {string} value
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Db.prototype.put = function (key, value) {

};



/**
 * @param {string} table
 * @param {Object|Array} value
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Db.prototype.putObject = function (table, value) {

};


/**
 * Return string
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.Db.prototype.get = function (key) {

};


/**
 * Return object
 * @param {string} table
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.Db.prototype.getObject = function (table, key) {

};


/**
 * Get number of items stored.
 * @param {string=} table
 * @return {!goog.async.Deferred} {@code number}
 */
ydn.db.Db.prototype.getCount = function (table) {

};


/**
 * Deletes all objects from the store.
 * @param {string=} table
 * @return {!goog.async.Deferred}
 */
ydn.db.Db.prototype.clear = function (table) {

};



/**
 * Fetch result of a query
 * @param {ydn.db.Query} q
 * @return {!goog.async.Deferred}
 */
ydn.db.Db.prototype.fetch = function (q) {

};
