/**
 * @fileoverview Interface for executing CRUD and query.
 *
 */


goog.provide('ydn.db.exe.Executor');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Query');
goog.require('ydn.db.Key');




/**
 * @interface
 */
ydn.db.exe.Executor = function() {

};


/**
 *
 * @param {SQLTransaction|IDBTransaction|Object} tx
 */
ydn.db.exe.Executor.prototype.setTx = function(tx) {};


/**
 * Return true if transaction object is active.
 */
ydn.db.exe.Executor.prototype.isActive = function() {};


/**
 * Return object
 * @param {string} store table name.
 * @param {(string|number)} id object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.exe.Executor.prototype.getById = function(store, id) {};

