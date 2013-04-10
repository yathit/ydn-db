/**
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 */


goog.provide('ydn.db.tr.StrictOverflowSerial');
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
 * @constructor
 * @extends {ydn.db.tr.Serial}
 */
ydn.db.tr.StrictOverflowSerial = function(storage, ptx_no) {

  goog.base(this, storage, ptx_no);

};
goog.inherits(ydn.db.tr.StrictOverflowSerial, ydn.db.tr.Serial);


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.StrictOverflowSerial.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.StrictOverflowSerial.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.tr.StrictOverflowSerial');


/**
 * @inheritDoc
 */
ydn.db.tr.StrictOverflowSerial.prototype.reusedTx = function(
    store_names, mode) {
  return this.getMuTx().sameScope(store_names, mode);
};


/**
 * @inheritDoc
 */
ydn.db.tr.StrictOverflowSerial.prototype.isNextTxCompatible = function() {
  var mu_tx = this.getMuTx();
  return !!mu_tx && mu_tx.sameScope(this.peekScopes(), this.peekMode());
};

