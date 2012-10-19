/**
 * @fileoverview Exports for main ydn-db module.
 *
 */

goog.require('ydn.db.Storage');
goog.require('ydn.db.TxStorage');


goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);

goog.exportProperty(ydn.db.io.Query.prototype, 'fetch',
    ydn.db.io.Query.prototype.fetch);
goog.exportProperty(ydn.db.io.Query.prototype, 'get',
    ydn.db.io.Query.prototype.get);

goog.exportProperty(ydn.db.io.Cursor.prototype, 'fetch',
  ydn.db.io.Cursor.prototype.fetch);
goog.exportProperty(ydn.db.io.Cursor.prototype, 'get',
  ydn.db.io.Cursor.prototype.get);
goog.exportProperty(ydn.db.io.Cursor.prototype, 'iterate',
  ydn.db.io.Cursor.prototype.iterate);

goog.exportSymbol('ydn.db.Cursor', ydn.db.Cursor);
goog.exportProperty(ydn.db.Cursor.prototype, 'filter',
    ydn.db.Cursor.prototype.filter);
goog.exportProperty(ydn.db.Cursor.prototype, 'reduce',
    ydn.db.Cursor.prototype.reduce);
goog.exportProperty(ydn.db.Cursor.prototype, 'map',
    ydn.db.Cursor.prototype.map);
goog.exportProperty(ydn.db.Cursor.prototype, 'initial',
    ydn.db.Cursor.prototype.initial);
goog.exportProperty(ydn.db.Cursor.prototype, 'continued',
    ydn.db.Cursor.prototype.continued);
goog.exportProperty(ydn.db.Cursor.prototype, 'finalize',
    ydn.db.Cursor.prototype.finalize);

goog.exportSymbol('ydn.db.Query', ydn.db.Query);
goog.exportProperty(ydn.db.Query.prototype, 'select',
    ydn.db.Query.prototype.select);
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

goog.exportProperty(ydn.db.Storage.prototype, 'cursor',
    ydn.db.Storage.prototype.cursor);
goog.exportProperty(ydn.db.Storage.prototype, 'query',
    ydn.db.Storage.prototype.query);
goog.exportProperty(ydn.db.Storage.prototype, 'fetch',
    ydn.db.Storage.prototype.fetch);
goog.exportProperty(ydn.db.Storage.prototype, 'setItem',
    ydn.db.Storage.prototype.setItem);
goog.exportProperty(ydn.db.Storage.prototype, 'getItem',
    ydn.db.Storage.prototype.getItem);

goog.exportProperty(ydn.db.TxStorage.prototype, 'cursor',
    ydn.db.TxStorage.prototype.cursor);
goog.exportProperty(ydn.db.TxStorage.prototype, 'query',
    ydn.db.TxStorage.prototype.query);
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

