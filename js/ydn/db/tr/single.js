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
 * @constructor
 * @extends {ydn.db.tr.Parallel}
 */
ydn.db.tr.Single = function(storage, ptx_no) {

  goog.base(this, storage, ptx_no, 1);

};
goog.inherits(ydn.db.tr.Single, ydn.db.tr.Parallel);



