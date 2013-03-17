/**
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 */


goog.provide('ydn.db.tr.StrictOverflowParallel');
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
ydn.db.tr.StrictOverflowParallel = function(storage, ptx_no, scope_name) {

  goog.base(this, storage, ptx_no, scope_name);

};
goog.inherits(ydn.db.tr.StrictOverflowParallel, ydn.db.tr.Parallel);


/**
 * @define {boolean}
 */
ydn.db.tr.StrictOverflowParallel.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.tr.StrictOverflowParallel.prototype.reusedTx = function(scopes, mode) {
  return  this.sameScope(scopes, mode);
};



