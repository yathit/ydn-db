/**
 * @fileoverview Exports for ydn-db core module.
 *
 * Exporting variable are defined in separate namespace so that closure
 * project can use this library without exporting any of ydn-db properties.
 * Project that want to export ydn-db properties should require this namespace.
 */


goog.provide('ydn.db.core.exports');
goog.require('ydn.db.core.Storage');



goog.exportProperty(ydn.db.core.Storage.prototype, 'scan',
    ydn.db.core.Storage.prototype.scan);
goog.exportProperty(ydn.db.core.Storage.prototype, 'map',
    ydn.db.core.Storage.prototype.map);
goog.exportProperty(ydn.db.core.Storage.prototype, 'reduce',
    ydn.db.core.Storage.prototype.reduce);
goog.exportProperty(ydn.db.core.Storage.prototype, 'open',
    ydn.db.core.Storage.prototype.open);

goog.exportProperty(ydn.db.core.DbOperator.prototype, 'scan',
    ydn.db.core.DbOperator.prototype.scan);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'map',
    ydn.db.core.DbOperator.prototype.map);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'reduce',
    ydn.db.core.DbOperator.prototype.reduce);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'open',
    ydn.db.core.DbOperator.prototype.open);

goog.exportProperty(ydn.db.Cursor.prototype, 'getKey',
    ydn.db.Cursor.prototype.getKey);
goog.exportProperty(ydn.db.Cursor.prototype, 'getPrimaryKey',
    ydn.db.Cursor.prototype.getPrimaryKey);
goog.exportProperty(ydn.db.Cursor.prototype, 'getValue',
    ydn.db.Cursor.prototype.getValue);
goog.exportProperty(ydn.db.Cursor.prototype, 'update',
    ydn.db.Cursor.prototype.update);
goog.exportProperty(ydn.db.Cursor.prototype, 'clear',
    ydn.db.Cursor.prototype.clear);

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
goog.exportSymbol('ydn.db.KeyCursors', ydn.db.KeyCursors);
goog.exportSymbol('ydn.db.ValueCursors', ydn.db.ValueCursors);
goog.exportSymbol('ydn.db.Cursors', ydn.db.Cursors);
goog.exportSymbol('ydn.db.IndexValueCursors', ydn.db.IndexValueCursors);


goog.exportProperty(ydn.db.Iterator.prototype, 'getState',
    ydn.db.Iterator.prototype.getState);
goog.exportProperty(ydn.db.Iterator.prototype, 'getKeyRange',
    ydn.db.Iterator.prototype.getKeyRange);
goog.exportProperty(ydn.db.Iterator.prototype, 'getIndexName',
    ydn.db.Iterator.prototype.getIndexName);
goog.exportProperty(ydn.db.Iterator.prototype, 'getStoreName',
    ydn.db.Iterator.prototype.getStoreName);
goog.exportProperty(ydn.db.Iterator.prototype, 'isReversed',
    ydn.db.Iterator.prototype.isReversed);
goog.exportProperty(ydn.db.Iterator.prototype, 'isUnique',
    ydn.db.Iterator.prototype.isUnique);
goog.exportProperty(ydn.db.Iterator.prototype, 'isKeyIterator',
    ydn.db.Iterator.prototype.isKeyIterator);
goog.exportProperty(ydn.db.Iterator.prototype, 'isIndexIterator',
    ydn.db.Iterator.prototype.isIndexIterator);
goog.exportProperty(ydn.db.Iterator.prototype, 'getPrimaryKey',
    ydn.db.Iterator.prototype.getPrimaryKey);
goog.exportProperty(ydn.db.Iterator.prototype, 'getKey',
    ydn.db.Iterator.prototype.getKey);
goog.exportProperty(ydn.db.Iterator.prototype, 'resume',
    ydn.db.Iterator.prototype.resume);
goog.exportProperty(ydn.db.Iterator.prototype, 'reset',
    ydn.db.Iterator.prototype.reset);
goog.exportProperty(ydn.db.Iterator.prototype, 'reverse',
    ydn.db.Iterator.prototype.reverse);

goog.exportProperty(ydn.db.KeyCursors, 'where', ydn.db.KeyCursors.where);
goog.exportProperty(ydn.db.ValueCursors, 'where', ydn.db.ValueCursors.where);
goog.exportProperty(ydn.db.Cursors, 'where', ydn.db.Cursors.where);
goog.exportProperty(ydn.db.IndexValueCursors, 'where',
    ydn.db.IndexValueCursors.where);

goog.exportSymbol('ydn.db.Streamer', ydn.db.Streamer);
goog.exportProperty(ydn.db.Streamer.prototype, 'push',
    ydn.db.Streamer.prototype.push);
goog.exportProperty(ydn.db.Streamer.prototype, 'collect',
    ydn.db.Streamer.prototype.collect);
goog.exportProperty(ydn.db.Streamer.prototype, 'setSink',
    ydn.db.Streamer.prototype.setSink);
