/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.IStorage');
goog.require('ydn.db.tr.IStorage');
goog.require('ydn.db.req.RequestExecutor');



/**
 * @extends {ydn.db.tr.IStorage}
 * @interface
 */
ydn.db.IStorage = function() {};



/**
 * @throws {ydn.db.ScopeError}
 * @param {function(!ydn.db.req.RequestExecutor)} callback
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'readonly'.
 */
ydn.db.IStorage.prototype.execute = goog.abstractMethod;



/**
 * @define {string} default key-value store name.
 */
ydn.db.IStorage.DEFAULT_TEXT_STORE = 'default_text_store';


/**
 * @define {boolean}
 */
ydn.db.IStorage.ENABLE_DEFAULT_TEXT_STORE = true;



/**
 * @define {boolean}
 */
ydn.db.IStorage.ENABLE_ENCRYPTION = false;