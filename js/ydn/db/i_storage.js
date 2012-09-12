/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.IStorage');
goog.require('ydn.db.tr.IStorage');
goog.require('ydn.db.req.AbstractRequestExecutor');



/**
 * @extends {ydn.db.tr.IStorage}
 * @interface
 */
ydn.db.IStorage = function() {};



/**
 * @throws {ydn.db.ScopeError}
 * @param {function(!ydn.db.req.AbstractRequestExecutor)} callback
 */
ydn.db.IStorage.prototype.execute = function(callback) {};
