/**
 * @fileoverview Exports for core ydn-db module.
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

goog.exportProperty(ydn.db.Storage.prototype, 'key',
    ydn.db.Storage.prototype.key);
goog.exportProperty(ydn.db.Storage.prototype, 'get',
    ydn.db.Storage.prototype.get);
goog.exportProperty(ydn.db.Storage.prototype, 'put',
    ydn.db.Storage.prototype.put);
goog.exportProperty(ydn.db.Storage.prototype, 'clear',
    ydn.db.Storage.prototype.clear);

goog.exportProperty(ydn.db.TxStorage.prototype, 'key',
    ydn.db.TxStorage.prototype.key);
goog.exportProperty(ydn.db.TxStorage.prototype, 'get',
    ydn.db.TxStorage.prototype.get);
goog.exportProperty(ydn.db.TxStorage.prototype, 'put',
    ydn.db.TxStorage.prototype.put);
goog.exportProperty(ydn.db.TxStorage.prototype, 'clear',
    ydn.db.TxStorage.prototype.clear);

goog.exportProperty(ydn.db.tr.Storage.prototype, 'run',
    ydn.db.tr.Storage.prototype.run);
goog.exportProperty(ydn.db.tr.TxStorage.prototype, 'run',
    ydn.db.tr.TxStorage.prototype.run);

goog.exportProperty(ydn.db.tr.TxStorage.prototype, 'getTx',
    ydn.db.tr.TxStorage.prototype.getTx);

goog.exportSymbol('ydn.db.Key', ydn.db.Key);
goog.exportProperty(ydn.db.Key.prototype, 'parent', ydn.db.Key.prototype.parent);

