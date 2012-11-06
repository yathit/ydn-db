/**
 * @fileoverview Exports for main ydn-db module.
 *
 */

goog.require('ydn.db.Storage');
goog.require('ydn.db.TxStorage');


goog.exportSymbol('ydn.db.Query', ydn.db.Query);
goog.exportProperty(ydn.db.Query.prototype, 'continued',
    ydn.db.Query.prototype.continued);
goog.exportProperty(ydn.db.Query.prototype, 'count',
    ydn.db.Query.prototype.count);
goog.exportProperty(ydn.db.Query.prototype, 'done',
  ydn.db.Query.prototype.done);
goog.exportProperty(ydn.db.Query.prototype, 'filter',
  ydn.db.Query.prototype.filter);
goog.exportProperty(ydn.db.Query.prototype, 'key',
  ydn.db.Query.prototype.key);
goog.exportProperty(ydn.db.Query.prototype, 'indexKey',
  ydn.db.Query.prototype.indexKey);

goog.exportSymbol('ydn.db.Sql', ydn.db.Sql);
goog.exportProperty(ydn.db.Sql.prototype, 'project',
    ydn.db.Sql.prototype.project);
goog.exportProperty(ydn.db.Sql.prototype, 'reduce',
  ydn.db.Sql.prototype.reduce);
goog.exportProperty(ydn.db.Sql.prototype, 'where',
    ydn.db.Sql.prototype.where);
goog.exportProperty(ydn.db.Sql.prototype, 'from',
    ydn.db.Sql.prototype.from);
goog.exportProperty(ydn.db.Sql.prototype, 'limit',
  ydn.db.Sql.prototype.limit);
goog.exportProperty(ydn.db.Sql.prototype, 'order',
  ydn.db.Sql.prototype.order);
goog.exportProperty(ydn.db.Sql.prototype, 'offset',
  ydn.db.Sql.prototype.offset);
goog.exportProperty(ydn.db.Sql.prototype, 'reverse',
  ydn.db.Sql.prototype.reverse);
goog.exportProperty(ydn.db.Sql.prototype, 'unique',
  ydn.db.Sql.prototype.unique);


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

