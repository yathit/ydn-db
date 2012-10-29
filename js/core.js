/**
 * @fileoverview Exports for core ydn-db module.
 *
 */

goog.require('ydn.db.core.Storage');
goog.require('ydn.db.core.TxStorage');


goog.exportSymbol('ydn.db.core.Storage', ydn.db.core.Storage);

goog.exportProperty(ydn.db.core.Storage.prototype, 'get',
    ydn.db.core.Storage.prototype.get);
goog.exportProperty(ydn.db.core.Storage.prototype, 'put',
    ydn.db.core.Storage.prototype.put);
goog.exportProperty(ydn.db.core.Storage.prototype, 'clear',
    ydn.db.core.Storage.prototype.clear);
goog.exportProperty(ydn.db.core.Storage.prototype, 'count',
  ydn.db.core.Storage.prototype.count);

goog.exportProperty(ydn.db.core.TxStorage.prototype, 'get',
    ydn.db.core.TxStorage.prototype.get);
goog.exportProperty(ydn.db.core.TxStorage.prototype, 'put',
    ydn.db.core.TxStorage.prototype.put);
goog.exportProperty(ydn.db.core.TxStorage.prototype, 'clear',
    ydn.db.core.TxStorage.prototype.clear);
goog.exportProperty(ydn.db.core.TxStorage.prototype, 'count',
  ydn.db.core.TxStorage.prototype.count);


goog.exportSymbol('ydn.db.Key', ydn.db.Key );
goog.exportProperty(ydn.db.Key.prototype, 'id', ydn.db.Key.prototype.getId);
goog.exportProperty(ydn.db.Key.prototype, 'parent',
  ydn.db.Key.prototype.getParent);
goog.exportProperty(ydn.db.Key.prototype, 'storeName',
  ydn.db.Key.prototype.getStoreName);

