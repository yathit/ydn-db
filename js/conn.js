/**
 * @fileoverview Exports for conn-ydn-db module.
 */

goog.require('ydn.db');
goog.require('ydn.db.con.Storage');
goog.require('goog.async.Deferred');
goog.require('ydn.base');
goog.require('ydn.db.events.StorageEvent');

goog.exportSymbol('ydn.db.con.Storage', ydn.db.con.Storage);

goog.exportProperty(ydn.db.con.Storage.prototype, 'getType',
  ydn.db.con.Storage.prototype.getType);
goog.exportProperty(ydn.db.con.Storage.prototype, 'setName',
  ydn.db.con.Storage.prototype.setName);
goog.exportProperty(ydn.db.con.Storage.prototype, 'getName',
    ydn.db.con.Storage.prototype.getName);
goog.exportProperty(ydn.db.con.Storage.prototype, 'getSchema',
  ydn.db.con.Storage.prototype.getSchema);
goog.exportProperty(ydn.db.con.Storage.prototype, 'transaction',
  ydn.db.con.Storage.prototype.transaction);
goog.exportProperty(ydn.db.con.Storage.prototype, 'close',
  ydn.db.con.Storage.prototype.close);

// for hacker only. This method should not document this, since this will change
// transaction state.
//goog.exportProperty(ydn.db.con.Storage.prototype, 'db',
//    ydn.db.con.Storage.prototype.getDbInstance);

goog.exportSymbol('ydn.db.deleteDatabase', ydn.db.deleteDatabase);

goog.exportProperty(ydn.db.events.StorageEvent.prototype, 'name',
    ydn.db.events.StorageEvent.prototype.name);
goog.exportProperty(ydn.db.events.StorageEvent.prototype, 'getVersion',
  ydn.db.events.StorageEvent.prototype.getVersion);
goog.exportProperty(ydn.db.events.StorageEvent.prototype, 'getOldVersion',
    ydn.db.events.StorageEvent.prototype.getOldVersion);


