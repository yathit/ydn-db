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
 * @param {?function((IDBTransaction|SQLTransaction|ydn.db.con.SimpleStorage))} callback callback when executor
 * is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 * @param {string} scope_name scope.
 * @param {Function=} on_completed transaction on completed handler
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
 * @param {...} opt_args optional arguments.
 */
ydn.db.tr.IThread.prototype.processTx = goog.abstractMethod;

/**
 * Threading type
 * @enum {string}
 */
ydn.db.tr.IThread.Threads = {
  ATOMIC_SERIAL: 'atomic-serial',
  OVERFLOW_SERIAL: 'overflow-serial',
  STRICT_OVERFLOW_SERIAL: 'strict-overflow-serial',
  ATOMIC_PARALLEL: 'atomic-parallel',
  OVERFLOW_PARALLEL: 'overflow-parallel',
  STRICT_OVERFLOW_PARALLEL: 'strict-overflow-parallel',
  OPEN: 'open',
  SINGLE: 'single'
};


/**
 * @const
 * @type {Array.<ydn.db.tr.IThread.Threads>}
 */
ydn.db.tr.IThread.ThreadList = [
  ydn.db.tr.IThread.Threads.ATOMIC_SERIAL,
  ydn.db.tr.IThread.Threads.OVERFLOW_SERIAL,
  ydn.db.tr.IThread.Threads.STRICT_OVERFLOW_SERIAL,
  ydn.db.tr.IThread.Threads.ATOMIC_PARALLEL,
  ydn.db.tr.IThread.Threads.OVERFLOW_PARALLEL,
  ydn.db.tr.IThread.Threads.STRICT_OVERFLOW_PARALLEL,
  ydn.db.tr.IThread.Threads.OPEN,
  ydn.db.tr.IThread.Threads.SINGLE
];

