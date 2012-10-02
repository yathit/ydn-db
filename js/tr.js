/**
 * @fileoverview Exports for tr-ydn-db module.
 */

goog.require('ydn.db.tr.Storage');
goog.require('ydn.db.conn.Storage');


goog.exportSymbol('ydn.db.tr.Storage', ydn.db.tr.Storage);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'type',
  ydn.db.conn.Storage.prototype.type);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'setName',
  ydn.db.conn.Storage.prototype.setName);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'getConfig',
  ydn.db.conn.Storage.prototype.getConfig);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'transaction',
  ydn.db.conn.Storage.prototype.transaction);
goog.exportProperty(ydn.db.conn.Storage.prototype, 'close',
  ydn.db.conn.Storage.prototype.close);
// for hacker.
goog.exportProperty(ydn.db.conn.Storage.prototype, 'db',
  ydn.db.conn.Storage.prototype.getDbInstance);
