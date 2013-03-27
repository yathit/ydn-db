/**
 * @fileoverview Transaction queue.
 *
 * Only one transaction is ever created.
 */


goog.provide('ydn.db.tr.Single');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.db.tr.Parallel');
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
 * @extends {ydn.db.tr.Parallel}
 */
ydn.db.tr.Single = function(storage, ptx_no, scope_name) {

  goog.base(this, storage, ptx_no, scope_name);

  this.done_ = false;

};
goog.inherits(ydn.db.tr.Single, ydn.db.tr.Parallel);


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.Single.DEBUG = false;


/**
 *
 * @type {boolean}
 * @private
 */
ydn.db.tr.Single.prototype.done_ = false;



/**
 * @inheritDoc
 */
ydn.db.tr.Single.prototype.exec = function (df, callback, store_names, mode,
                                   scope, on_completed) {

  var me = this;
  var tx_callback = function (tx) {
    /**
     *
     * @param {*} result
     * @param {boolean=} is_error
     */
    var resultCallback = function(result, is_error) {
      me.request_tx_ = tx; // so that we can abort it.
      if (is_error) {
        df.errback(result);
      } else {
        df.callback(result);
      }
      me.request_tx_ = null;
      resultCallback = /** @type {function (*, boolean=)} */ (null);
    };
    callback(tx, me.getTxNo(), resultCallback);
    callback = null;
  };

  if (this.isActive()) {
    this.getPlTx().executeTx(tx_callback, on_completed);
  } else if (this.done_) {
    this.logger.severe(
      'single thread has already committed the transaction');
    throw new ydn.db.InvalidStateError();
  } else {
    this.done_ = true;
    this.processTx(tx_callback, store_names, mode, on_completed);
  }
};


