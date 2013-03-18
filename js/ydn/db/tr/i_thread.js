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
 * @param {!goog.async.Deferred} df deferred object to intersect the request
 * @param {?function(!goog.async.Deferred,
 *   (IDBTransaction|SQLTransaction|ydn.db.con.SimpleStorage))} callback
 *   callback when executor is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 * @param {string} scope_name scope.
 * @param {function(ydn.db.base.TransactionEventTypes, *)=} oncompleted handler.
 */
ydn.db.tr.IThread.prototype.exec = goog.abstractMethod;


/**
 * Abort an active transaction.
 */
ydn.db.tr.IThread.prototype.abort = goog.abstractMethod;


/**
 *
 * @return {number}
 */
ydn.db.tr.IThread.prototype.getTxNo = goog.abstractMethod;


/**
 * Create a new isolated transaction. After creating a transaction, use
 * {@link #getTx} to received an active transaction. If transaction is not
 * active, it return null. In this case a new transaction must re-create.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TransactionEventTypes, *)=} oncompleted handler.
 */
ydn.db.tr.IThread.prototype.processTx = goog.abstractMethod;

/**
 * Threading type
 * @enum {string}
 */
ydn.db.tr.IThread.Threads = {
  SERIAL: 'serial',
  PARALLEL: 'parallel',
  ATOMIC_SERIAL: 'atomic-serial',
  MULTI_REQUEST_SERIAL: 'multirequest-serial',
  SAME_SCOPE_MULTI_REQUEST_SERIAL: 'samescope-multirequest-serial',
  ATOMIC_PARALLEL: 'atomic-parallel',
  OVERFLOW_PARALLEL: 'multirequest-parallel',
  SAME_SCOPE_MULTI_REQUEST_PARALLEL: 'samescope-multirequest-parallel',
  OPEN: 'open',
  SINGLE: 'single'
};


/**
 * @const
 * @type {Array.<ydn.db.tr.IThread.Threads>}
 */
ydn.db.tr.IThread.ThreadList = [
  ydn.db.tr.IThread.Threads.SERIAL,
  ydn.db.tr.IThread.Threads.PARALLEL,
  ydn.db.tr.IThread.Threads.ATOMIC_SERIAL,
  ydn.db.tr.IThread.Threads.MULTI_REQUEST_SERIAL,
  ydn.db.tr.IThread.Threads.SAME_SCOPE_MULTI_REQUEST_SERIAL,
  ydn.db.tr.IThread.Threads.ATOMIC_PARALLEL,
  ydn.db.tr.IThread.Threads.OVERFLOW_PARALLEL,
  ydn.db.tr.IThread.Threads.SAME_SCOPE_MULTI_REQUEST_PARALLEL,
  ydn.db.tr.IThread.Threads.OPEN,
  ydn.db.tr.IThread.Threads.SINGLE
];

