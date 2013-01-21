/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 20/1/13
 */

goog.provide('ydn.db.tr.IThread');
goog.provide('ydn.db.tr.IThread.Threads');

/**
 * @interface
 */
ydn.db.tr.IThread = function() {};


/**
 * @protected
 * @param {function((IDBTransaction|SQLTransaction|ydn.db.con.SimpleStorage))} callback callback when executor
 * is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 * @param {string} scope_name scope.
 */
ydn.db.tr.IThread.prototype.exec = goog.abstractMethod;


/**
 * Abort an active transaction.
 */
ydn.db.tr.IThread.prototype.abort = goog.abstractMethod;




/**
 * Threading type
 * @enum {string}
 */
ydn.db.tr.IThread.Threads = {
  SERIAL: 'serial',
  PARALLEL: 'parallel',
  OPEN: 'open',
  SINGLE: 'single'
};

