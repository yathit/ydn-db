/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.Service');
goog.require('ydn.db.tr.Service');
goog.require('ydn.db.exe.Executor');



/**
 * @extends {ydn.db.tr.Service}
 * @interface
 */
ydn.db.Service = function() {};



/**
 * @throws {ydn.db.ScopeError}
 * @param {function(!ydn.db.exe.Executor)} callback
 */
ydn.db.Service.prototype.execute = function(callback) {};
