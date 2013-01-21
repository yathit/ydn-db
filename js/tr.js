/**
 * @fileoverview Exports for tr-ydn-db module.
 */

goog.require('ydn.db.tr.Storage');
goog.require('ydn.db.tr.AtomicSerial');

goog.exportSymbol('ydn.db.tr.Storage', ydn.db.tr.Storage);

goog.exportProperty(ydn.db.tr.Storage.prototype, 'run',
    ydn.db.tr.Storage.prototype.run);
goog.exportProperty(ydn.db.tr.AtomicSerial.prototype, 'abort',
  ydn.db.tr.AtomicSerial.prototype.abort);


