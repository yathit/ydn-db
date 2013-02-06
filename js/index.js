/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 19/1/13
 */

goog.require('ydn.db.index.Storage');
goog.require('ydn.db.index.DbOperator');
goog.require('ydn.db.index.req.IDBCursor');
goog.require('ydn.math.Expression');

goog.exportProperty(ydn.db.index.Storage.prototype, 'thread',
  ydn.db.index.Storage.prototype.thread);

goog.exportProperty(ydn.db.index.Storage.prototype, 'scan',
    ydn.db.index.Storage.prototype.scan);
goog.exportProperty(ydn.db.index.Storage.prototype, 'map',
    ydn.db.index.Storage.prototype.map);
goog.exportProperty(ydn.db.index.Storage.prototype, 'reduce',
    ydn.db.index.Storage.prototype.reduce);
goog.exportProperty(ydn.db.index.Storage.prototype, 'open',
    ydn.db.index.Storage.prototype.open);


goog.exportProperty(ydn.db.index.DbOperator.prototype.open, 'scan',
    ydn.db.index.DbOperator.prototype.scan);
goog.exportProperty(ydn.db.index.DbOperator.prototype.open, 'map',
    ydn.db.index.DbOperator.prototype.map);
goog.exportProperty(ydn.db.index.DbOperator.prototype.open, 'reduce',
    ydn.db.index.DbOperator.prototype.reduce);
goog.exportProperty(ydn.db.index.DbOperator.prototype.open, 'open',
    ydn.db.index.DbOperator.prototype.open);


goog.exportProperty(ydn.db.index.req.IDBCursor.prototype, 'key',
    ydn.db.index.req.IDBCursor.prototype.getEffectiveKey);
goog.exportProperty(ydn.db.index.req.IDBCursor.prototype, 'primaryKey',
    ydn.db.index.req.IDBCursor.prototype.getPrimaryKey);
goog.exportProperty(ydn.db.index.req.IDBCursor.prototype, 'value',
    ydn.db.index.req.IDBCursor.prototype.getValue);
goog.exportProperty(ydn.db.index.req.IDBCursor.prototype, 'update',
    ydn.db.index.req.IDBCursor.prototype.update);
goog.exportProperty(ydn.db.index.req.IDBCursor.prototype, 'clear',
    ydn.db.index.req.IDBCursor.prototype.clear);

goog.exportSymbol('ydn.math.Expression', ydn.math.Expression);
goog.exportProperty(ydn.math.Expression.prototype, 'evaluate',
    ydn.math.Expression.prototype.evaluate);
goog.exportProperty(ydn.math.Expression.prototype, 'compile',
    ydn.math.Expression.prototype.compile);
goog.exportProperty(ydn.math.Expression, 'parseRpn',
    ydn.math.Expression.parseRpn);
goog.exportProperty(ydn.math.Expression, 'parseInfix',
    ydn.math.Expression.parseInfix);


goog.exportSymbol('ydn.db.Iterator', ydn.db.Iterator);
goog.exportSymbol('ydn.db.KeyIterator', ydn.db.KeyIterator);
goog.exportSymbol('ydn.db.ValueIterator', ydn.db.ValueIterator);
goog.exportSymbol('ydn.db.KeyIndexIterator', ydn.db.KeyIndexIterator);
goog.exportSymbol('ydn.db.ValueIndexIterator', ydn.db.ValueIndexIterator);

goog.exportProperty(ydn.db.Iterator.prototype, 'count',
    ydn.db.Iterator.prototype.count);
goog.exportProperty(ydn.db.Iterator.prototype, 'done',
    ydn.db.Iterator.prototype.done);
goog.exportProperty(ydn.db.Iterator.prototype, 'getKeyRange',
    ydn.db.Iterator.prototype.getKeyRange);
goog.exportProperty(ydn.db.Iterator.prototype, 'getIndexName',
    ydn.db.Iterator.prototype.getIndexName);
goog.exportProperty(ydn.db.Iterator.prototype, 'getStoreName',
    ydn.db.Iterator.prototype.getStoreName);
goog.exportProperty(ydn.db.Iterator.prototype, 'indexKey',
    ydn.db.Iterator.prototype.indexKey);
goog.exportProperty(ydn.db.Iterator.prototype, 'isReversed',
    ydn.db.Iterator.prototype.isReversed);
goog.exportProperty(ydn.db.Iterator.prototype, 'isUnique',
    ydn.db.Iterator.prototype.isUnique);
goog.exportProperty(ydn.db.Iterator.prototype, 'isKeyOnly',
    ydn.db.Iterator.prototype.isKeyOnly);
goog.exportProperty(ydn.db.Iterator.prototype, 'key',
    ydn.db.Iterator.prototype.key);
goog.exportProperty(ydn.db.Iterator.prototype, 'resume',
    ydn.db.Iterator.prototype.resume);
goog.exportProperty(ydn.db.Iterator.prototype, 'reset',
    ydn.db.Iterator.prototype.reset);

goog.exportProperty(ydn.db.KeyIterator, 'where',
  ydn.db.KeyIterator.where);
goog.exportProperty(ydn.db.ValueIterator, 'where',
  ydn.db.ValueIterator.where);
goog.exportProperty(ydn.db.KeyIndexIterator, 'where',
  ydn.db.KeyIndexIterator.where);
goog.exportProperty(ydn.db.ValueIndexIterator, 'where',
  ydn.db.ValueIndexIterator.where);