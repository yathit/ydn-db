/**
 * @fileoverview Exports for core ydn-db module.
 *
 */

goog.require('ydn.db.core.Storage');
goog.require('ydn.db.core.TxStorage');
goog.require('ydn.db');


goog.exportSymbol('ydn.db.core.Storage', ydn.db.core.Storage);

goog.exportProperty(ydn.db.core.Storage.prototype, 'get',
    ydn.db.core.Storage.prototype.get);
goog.exportProperty(ydn.db.core.Storage.prototype, 'list',
  ydn.db.core.Storage.prototype.list);
goog.exportProperty(ydn.db.core.Storage.prototype, 'put',
    ydn.db.core.Storage.prototype.put);
goog.exportProperty(ydn.db.core.Storage.prototype, 'clear',
    ydn.db.core.Storage.prototype.clear);
goog.exportProperty(ydn.db.core.Storage.prototype, 'count',
  ydn.db.core.Storage.prototype.count);

goog.exportProperty(ydn.db.core.TxStorage.prototype, 'get',
    ydn.db.core.TxStorage.prototype.get);
goog.exportProperty(ydn.db.core.TxStorage.prototype, 'list',
  ydn.db.core.TxStorage.prototype.list);
goog.exportProperty(ydn.db.core.TxStorage.prototype, 'put',
    ydn.db.core.TxStorage.prototype.put);
goog.exportProperty(ydn.db.core.TxStorage.prototype, 'clear',
    ydn.db.core.TxStorage.prototype.clear);
goog.exportProperty(ydn.db.core.TxStorage.prototype, 'count',
  ydn.db.core.TxStorage.prototype.count);

goog.exportSymbol('ydn.db.cmp', ydn.db.cmp);

goog.exportSymbol('ydn.db.Key', ydn.db.Key );
goog.exportProperty(ydn.db.Key.prototype, 'id', ydn.db.Key.prototype.getId);
goog.exportProperty(ydn.db.Key.prototype, 'parent',
  ydn.db.Key.prototype.getParent);
goog.exportProperty(ydn.db.Key.prototype, 'storeName',
  ydn.db.Key.prototype.getStoreName);


goog.exportSymbol('ydn.db.KeyRange', ydn.db.KeyRange );
goog.exportProperty(ydn.db.KeyRange, 'upperBound', ydn.db.KeyRange.upperBound);
goog.exportProperty(ydn.db.KeyRange, 'lowerBound', ydn.db.KeyRange.lowerBound);
goog.exportProperty(ydn.db.KeyRange, 'bound', ydn.db.KeyRange.bound);
goog.exportProperty(ydn.db.KeyRange, 'only', ydn.db.KeyRange.only);
goog.exportProperty(ydn.db.KeyRange, 'starts', ydn.db.KeyRange.starts);



