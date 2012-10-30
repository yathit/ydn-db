/**
 * @fileoverview Exports for main ydn-db module.
 *
 */

goog.require('ydn.db.Storage');
goog.require('ydn.db.TxStorage');


goog.exportSymbol('ydn.db.Cursor', ydn.db.Cursor);
goog.exportProperty(ydn.db.Cursor.prototype, 'continued',
    ydn.db.Cursor.prototype.continued);
goog.exportProperty(ydn.db.Cursor.prototype, 'count',
    ydn.db.Cursor.prototype.count);
goog.exportProperty(ydn.db.Cursor.prototype, 'done',
  ydn.db.Cursor.prototype.done);
goog.exportProperty(ydn.db.Cursor.prototype, 'filter',
  ydn.db.Cursor.prototype.filter);
goog.exportProperty(ydn.db.Cursor.prototype, 'key',
  ydn.db.Cursor.prototype.key);
goog.exportProperty(ydn.db.Cursor.prototype, 'indexKey',
  ydn.db.Cursor.prototype.indexKey);

goog.exportSymbol('ydn.db.Query', ydn.db.Query);
goog.exportProperty(ydn.db.Query.prototype, 'map',
    ydn.db.Query.prototype.map);
goog.exportProperty(ydn.db.Query.prototype, 'reduce',
  ydn.db.Query.prototype.reduce);
goog.exportProperty(ydn.db.Query.prototype, 'where',
    ydn.db.Query.prototype.where);
goog.exportProperty(ydn.db.Query.prototype, 'from',
    ydn.db.Query.prototype.from);
goog.exportProperty(ydn.db.Query.prototype, 'limit',
  ydn.db.Query.prototype.limit);
goog.exportProperty(ydn.db.Query.prototype, 'order',
  ydn.db.Query.prototype.order);
goog.exportProperty(ydn.db.Query.prototype, 'offset',
  ydn.db.Query.prototype.offset);
goog.exportProperty(ydn.db.Query.prototype, 'reverse',
  ydn.db.Query.prototype.reverse);
goog.exportProperty(ydn.db.Query.prototype, 'unique',
  ydn.db.Query.prototype.unique);


goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);

//goog.exportProperty(ydn.db.Storage.prototype, 'iterate',
//  ydn.db.Storage.prototype.iterate);
//goog.exportProperty(ydn.db.Storage.prototype, 'map',
//  ydn.db.Storage.prototype.map);
//goog.exportProperty(ydn.db.Storage.prototype, 'reduce',
//  ydn.db.Storage.prototype.reduce);
//goog.exportProperty(ydn.db.Storage.prototype, 'execute',
//  ydn.db.Storage.prototype.execute);
goog.exportProperty(ydn.db.Storage.prototype, 'fetch',
    ydn.db.Storage.prototype.fetch);
goog.exportProperty(ydn.db.Storage.prototype, 'setItem',
    ydn.db.Storage.prototype.setItem);
goog.exportProperty(ydn.db.Storage.prototype, 'getItem',
    ydn.db.Storage.prototype.getItem);

//goog.exportProperty(ydn.db.TxStorage.prototype, 'iterate',
//  ydn.db.TxStorage.prototype.iterate);
//goog.exportProperty(ydn.db.TxStorage.prototype, 'map',
//  ydn.db.TxStorage.prototype.map);
//goog.exportProperty(ydn.db.TxStorage.prototype, 'reduce',
//  ydn.db.TxStorage.prototype.reduce);
//goog.exportProperty(ydn.db.TxStorage.prototype, 'execute',
//  ydn.db.TxStorage.prototype.execute);
goog.exportProperty(ydn.db.TxStorage.prototype, 'fetch',
    ydn.db.TxStorage.prototype.fetch);
goog.exportProperty(ydn.db.TxStorage.prototype, 'setItem',
    ydn.db.TxStorage.prototype.setItem);
goog.exportProperty(ydn.db.TxStorage.prototype, 'getItem',
    ydn.db.TxStorage.prototype.getItem);


goog.exportSymbol('ydn.db.KeyRange', ydn.db.KeyRange );
goog.exportProperty(ydn.db.KeyRange, 'upperBound', ydn.db.KeyRange.upperBound);
goog.exportProperty(ydn.db.KeyRange, 'lowerBound', ydn.db.KeyRange.lowerBound);
goog.exportProperty(ydn.db.KeyRange, 'bound', ydn.db.KeyRange.bound);
goog.exportProperty(ydn.db.KeyRange, 'only', ydn.db.KeyRange.only);
goog.exportProperty(ydn.db.KeyRange, 'starts', ydn.db.KeyRange.starts);

