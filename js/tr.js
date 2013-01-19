/**
 * @fileoverview Exports for tr-ydn-db module.
 */

goog.require('ydn.db.tr.Storage');
goog.require('ydn.db.tr.TxQueue');

goog.exportSymbol('ydn.db.tr.Storage', ydn.db.tr.Storage);

goog.exportProperty(ydn.db.tr.Storage.prototype, 'begin',
    ydn.db.tr.Storage.prototype.begin);
goog.exportProperty(ydn.db.tr.TxQueue.prototype, 'abort',
  ydn.db.tr.TxQueue.prototype.abort);


