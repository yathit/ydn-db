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

goog.exportProperty(ydn.db.Query.prototype, 'select',
    ydn.db.Query.prototype.select);
goog.exportProperty(ydn.db.Query.prototype, 'where',
    ydn.db.Query.prototype.where);
goog.exportProperty(ydn.db.Query.prototype, 'sum',
    ydn.db.Query.prototype.sum);
goog.exportProperty(ydn.db.Query.prototype, 'count',
    ydn.db.Query.prototype.count);
goog.exportProperty(ydn.db.Query.prototype, 'average',
    ydn.db.Query.prototype.average);


goog.exportProperty(ydn.db.Storage.prototype, 'query',
    ydn.db.Storage.prototype.query);
goog.exportProperty(ydn.db.Storage.prototype, 'key',
    ydn.db.Storage.prototype.key);
goog.exportProperty(ydn.db.Storage.prototype, 'get',
    ydn.db.Storage.prototype.get);
goog.exportProperty(ydn.db.Storage.prototype, 'put',
    ydn.db.Storage.prototype.put);
goog.exportProperty(ydn.db.Storage.prototype, 'clear',
    ydn.db.Storage.prototype.clear);
goog.exportProperty(ydn.db.Storage.prototype, 'fetch',
    ydn.db.Storage.prototype.fetch);


goog.exportProperty(ydn.db.TxStorage.prototype, 'query',
    ydn.db.TxStorage.prototype.query);
goog.exportProperty(ydn.db.TxStorage.prototype, 'key',
    ydn.db.TxStorage.prototype.key);
goog.exportProperty(ydn.db.TxStorage.prototype, 'get',
    ydn.db.TxStorage.prototype.get);
goog.exportProperty(ydn.db.TxStorage.prototype, 'put',
    ydn.db.TxStorage.prototype.put);
goog.exportProperty(ydn.db.TxStorage.prototype, 'clear',
    ydn.db.TxStorage.prototype.clear);
goog.exportProperty(ydn.db.TxStorage.prototype, 'fetch',
    ydn.db.TxStorage.prototype.fetch);


