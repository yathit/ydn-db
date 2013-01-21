/**
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 */


goog.provide('ydn.db.tr.OverflowSerial');
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
ydn.db.tr.OverflowSerial = function(storage, ptx_no, scope_name) {

  goog.base(this, storage, ptx_no, scope_name);

};
goog.inherits(ydn.db.tr.OverflowSerial, ydn.db.tr.Serial);


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.OverflowSerial.DEBUG = false;



/**
 * @inheritDoc
 */
ydn.db.tr.OverflowSerial.prototype.exec = function (callback, store_names, opt_mode, scope) {
  var mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;
  var me = this;
  var mu_tx = this.getMuTx();
  if (mu_tx.isActiveAndAvailable() && mu_tx.subScope(store_names, mode)) {
    //console.log(mu_tx.getScope() + ' continuing tx for ' + scope);
    // call within a transaction
    // continue to use existing transaction
    callback(mu_tx.getTx());
  } else {

    var on_complete = function () {
      //console.log('tx ' + scope + ' completed');
    };

    //
    // create a new transaction and close for invoke in non-transaction context
    var tx_callback = function (idb) {
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
      callback(mu_tx.getTx());
    };
    //var cbFn = goog.partial(tx_callback, callback);
    tx_callback.name = scope; // scope name
    //window.console.log(mu_tx.getScope() +  ' active: ' + mu_tx.isActive() + '
    // locked: ' + mu_tx.isSetDone());
    me.run(tx_callback, store_names, mode, on_complete);
  }
};

