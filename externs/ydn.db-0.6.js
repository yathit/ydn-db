/**
 * @fileoverview YDN-DB module externs file.
 *
 * @externs
 */


/**
 * @type {Object}
 * @const
 */
var ydn = {};


/**
 * @type {Object}
 * @const
 */
ydn.db = {};



/**
 *
 * @constructor
 * @extends {EventTarget}
 */
ydn.db.DbOperator = function() {};


/**
 * @param {string} store_name
 * @param {*} key
 * @return {!goog.async.Deferred}
 */
ydn.db.DbOperator.prototype.get = function(store_name, key) {};


/**
 * @param {string} store_name
 * @param {Object} obj
 * @param {*=} key
 * @return {!goog.async.Deferred}
 */
ydn.db.DbOperator.prototype.put = function(store_name, obj, key) {};



/**
 *
 * @constructor
 * @extends {ydn.db.DbOperator}
 */
ydn.db.Storage = function() {};


/**
 * @param {string=} thread
 * @param {boolean=} isSerial
 * @param {Array.<string>=} scope
 * @param {string=} mode
 * @param {number=} maxRequest
 * @return {!ydn.db.DbOperator}
 */
ydn.db.Storage.prototype.branch = function(thread, isSerial, scope, mode,
                                           maxRequest) {};

