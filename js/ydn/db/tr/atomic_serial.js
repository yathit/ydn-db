/**
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 */


goog.provide('ydn.db.tr.AtomicSerial');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.db.tr.Serial');
goog.require('ydn.error.NotSupportedException');


/**
 * Create transaction queue providing methods to run in non-overlapping
 * transactions.
 *
 * @implements {ydn.db.tr.IThread}
 * @param {!ydn.db.tr.Storage} storage base storage.
 * @param {number} ptx_no transaction queue number.
 * @param {string=} scope_name scope name.
 * @constructor
 * @extends {ydn.db.tr.Serial}
 */
ydn.db.tr.AtomicSerial = function(storage, ptx_no, scope_name) {

  goog.base(this, storage, ptx_no, scope_name);

};
goog.inherits(ydn.db.tr.AtomicSerial, ydn.db.tr.Serial);


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.AtomicSerial.DEBUG = false;



/**
 * @inheritDoc
 */
ydn.db.tr.AtomicSerial.prototype.exec = function (df, callback, store_names, mode,
                                   scope, on_completed) {
  var me = this;
  var mu_tx = this.getMuTx();

  //console.log('creating new tx for ' + scope);

  var blocked_on_complete = function (type, e) {
    //console.log('tx ' + scope + ' completed');
    if (goog.isFunction(on_completed)) {
      on_completed(type, e);
      on_completed = undefined; // release circular reference.
    }
  };

  //
  // create a new transaction and close for invoke in non-transaction context
  var blocked_tx_callback = function (idb) {
    //console.log('tx running for ' + scope);
    me.not_ready_ = true;
    // transaction should be active now
    if (!mu_tx.isActive()) {
      throw new ydn.db.InternalError('Tx not active for scope: ' + scope);
    }
    if (!mu_tx.isAvailable()) {
      throw new ydn.db.InternalError('Tx not available for scope: ' +
        scope);
    }

    callback(df, mu_tx.getTx());
    callback = null; // release circular reference.
    mu_tx.lock(); // for blocking tx.
  };
  //var cbFn = goog.partial(tx_callback, callback);
  if (goog.DEBUG) {
    blocked_tx_callback.name = scope; // scope name
  }
  //window.console.log(mu_tx.getScope() +  ' active: ' + mu_tx.isActive() + '
  // locked: ' + mu_tx.isSetDone());
  me.processTx(blocked_tx_callback, store_names, mode, blocked_on_complete);

  // need to think about handling oncompleted and onerror callback of the
  // transaction. after executed all the requests, the transaction is not
  // completed. consider this case
  // db.put(data).addCallback(function(id) {
  //    // at this stage, transaction for put request is not grantee finished.
  //    db.get(id);
  //    // but practically, when next transaction is open,
  //    // the previous transaction should be finished anyways,
  //    // due to 'readwrite' lock.
  //    // so seems like OK. it is not necessary to listen oncompleted
  //    // callback.
  // });
  // also notice, there is transaction overlap problem in mutex class.

};


