/**
 * @filevoerview Exports for core-ydn-db module.
 */

goog.require('ydn.db.core.Storage');


goog.exportSymbol('ydn.db.core.Storage', ydn.db.core.Storage);
goog.exportProperty(ydn.db.core.Storage.prototype, 'type',
  ydn.db.core.Storage.prototype.type);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setName',
  ydn.db.core.Storage.prototype.setName);
goog.exportProperty(ydn.db.core.Storage.prototype, 'getConfig',
  ydn.db.core.Storage.prototype.getConfig);
goog.exportProperty(ydn.db.core.Storage.prototype, 'transaction',
  ydn.db.core.Storage.prototype.transaction);
goog.exportProperty(ydn.db.core.Storage.prototype, 'close',
  ydn.db.core.Storage.prototype.close);
// for hacker only. This method should not document this, since this will change
// transaction state.
goog.exportProperty(ydn.db.core.Storage.prototype, 'onReady',
  ydn.db.core.Storage.prototype.onReady);
