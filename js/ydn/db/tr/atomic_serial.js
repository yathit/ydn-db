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
  goog.base(this, 'exec', df, callback, store_names, mode,
      scope, on_completed);
};


