/**
 * @fileoverview Exports for main ydn-db module.
 *
 */

goog.require('ydn.db.Storage');
goog.require('ydn.db.TxStorage');


goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);

goog.exportProperty(goog.async.Deferred.prototype, 'done',
    goog.async.Deferred.prototype.addCallback);
goog.exportProperty(goog.async.Deferred.prototype, 'fail',
    goog.async.Deferred.prototype.addErrback);
goog.exportProperty(goog.async.Deferred.prototype, 'then',
    goog.async.Deferred.prototype.addCallbacks);

//goog.exportSymbol('ydn.db.conn.Storage', ydn.db.conn.Storage);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'db',
    ydn.db.conn.Storage.prototype.getDbInstance);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'type',
    ydn.db.conn.Storage.prototype.type);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'setSchema',
    ydn.db.conn.Storage.prototype.setSchema);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'setName',
    ydn.db.conn.Storage.prototype.setName);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'getConfig',
    ydn.db.conn.Storage.prototype.getConfig);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'transaction',
    ydn.db.conn.Storage.prototype.transaction);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'close',
    ydn.db.conn.Storage.prototype.close);


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


goog.exportProperty(ydn.db.KeyRange, 'bound',
    ydn.db.KeyRange.bound);
goog.exportProperty(ydn.db.KeyRange, 'upperBound',
    ydn.db.KeyRange.upperBound);
goog.exportProperty(ydn.db.KeyRange, 'lowerBound',
    ydn.db.KeyRange.lowerBound);
goog.exportProperty(ydn.db.KeyRange, 'only',
    ydn.db.KeyRange.only);
goog.exportProperty(ydn.db.KeyRange, 'starts',
    ydn.db.KeyRange.starts);

goog.exportProperty(ydn.db.Storage.prototype, 'encrypt',
    ydn.db.Storage.prototype.encrypt);

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
goog.exportProperty(ydn.db.Storage.prototype, 'getItem',
    ydn.db.Storage.prototype.getItem);
goog.exportProperty(ydn.db.Storage.prototype, 'setItem',
    ydn.db.Storage.prototype.setItem);
goog.exportProperty(ydn.db.Storage.prototype, 'removeItem',
    ydn.db.Storage.prototype.removeItem);


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
goog.exportProperty(ydn.db.TxStorage.prototype, 'getItem',
    ydn.db.TxStorage.prototype.getItem);
goog.exportProperty(ydn.db.TxStorage.prototype, 'setItem',
    ydn.db.TxStorage.prototype.setItem);
goog.exportProperty(ydn.db.TxStorage.prototype, 'removeItem',
    ydn.db.TxStorage.prototype.removeItem);

goog.exportProperty(ydn.db.tr.Storage.prototype, 'run',
    ydn.db.tr.Storage.prototype.run);
goog.exportProperty(ydn.db.tr.TxStorage.prototype, 'run',
    ydn.db.tr.TxStorage.prototype.run);

goog.exportProperty(ydn.db.tr.TxStorage.prototype, 'getTx',
    ydn.db.tr.TxStorage.prototype.getTx);

goog.exportSymbol('ydn.db.Key', ydn.db.Key);
goog.exportProperty(ydn.db.Key.prototype, 'parent', ydn.db.Key.prototype.parent);

