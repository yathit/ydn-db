/**
 * @fileoverview List require file for JsTestDriver.
 *
 */

goog.require('goog.debug.Console');
goog.require('goog.debug.Logger');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.Storage');
goog.require('ydn.db.TxStorage');

var c = new goog.debug.Console();
c.setCapturing(true);
goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.INFO);



goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);
goog.exportProperty(goog.async.Deferred.prototype, 'success',
  goog.async.Deferred.prototype.addCallback);
goog.exportProperty(goog.async.Deferred.prototype, 'error',
  goog.async.Deferred.prototype.addErrback);

//goog.exportProperty(ydn.db.core.Storage.prototype, 'isReady',
//  ydn.db.core.Storage.prototype.isReady);
goog.exportProperty(ydn.db.core.Storage.prototype, 'type',
  ydn.db.core.Storage.prototype.type);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setSchema',
  ydn.db.core.Storage.prototype.setSchema);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setName',
  ydn.db.core.Storage.prototype.setName);
goog.exportProperty(ydn.db.core.Storage.prototype, 'getConfig',
  ydn.db.core.Storage.prototype.getConfig);
// ActiveQuery do not need fetch, it is confusing if fetch in db.
//goog.exportProperty(ydn.db.core.Storage.prototype, 'fetch',
//  ydn.db.core.Storage.prototype.fetch);
goog.exportProperty(ydn.db.tr.Storage.prototype, 'transaction',
  ydn.db.tr.Storage.prototype.transaction);
goog.exportProperty(ydn.db.core.Storage.prototype, 'close',
  ydn.db.core.Storage.prototype.close);
// for hacker


goog.exportProperty(ydn.db.Storage.prototype, 'query',
  ydn.db.Storage.prototype.query);
goog.exportProperty(ydn.db.Storage.prototype, 'key',
  ydn.db.Storage.prototype.key);
goog.exportProperty(ydn.db.Storage.prototype, 'encrypt',
  ydn.db.Storage.prototype.encrypt);

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

//goog.exportProperty(ydn.db.ActiveKey.prototype, 'clear',
//  ydn.db.ActiveKey.prototype.clear);

goog.exportProperty(ydn.db.KeyRange, 'bound',
  ydn.db.KeyRange.bound);
goog.exportProperty(ydn.db.KeyRange, 'upperBound',
  ydn.db.KeyRange.upperBound);
goog.exportProperty(ydn.db.KeyRange, 'lowerBound',
  ydn.db.KeyRange.lowerBound);
goog.exportProperty(ydn.db.KeyRange, 'only',
  ydn.db.KeyRange.only);

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

goog.exportSymbol('ydn.async', ydn.async);
goog.exportProperty(ydn.async, 'dfl', ydn.async.dfl);

goog.exportSymbol('ydn.db.Key', ydn.db.Key);
goog.exportProperty(ydn.db.Key.prototype, 'parent', ydn.db.Key.prototype.parent);

