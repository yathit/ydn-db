/**
 * @fileoverview Exports for sync module.
 *
 */


goog.require('ydn.db.sync');
goog.require('ydn.db.sync.Event');


goog.exportSymbol('ydn.db.sync.Event', ydn.db.sync.Event);

goog.exportProperty(ydn.db.sync.Event.prototype, 'getStatus',
  ydn.db.sync.Event.prototype.getStatus);
goog.exportProperty(ydn.db.sync.Event.prototype, 'getClientData',
  ydn.db.sync.Event.prototype.getClientData);
goog.exportProperty(ydn.db.sync.Event.prototype, 'getServerData',
  ydn.db.sync.Event.prototype.getServerData);


