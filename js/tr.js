/**
 * @fileoverview Exports for tr-ydn-db module.
 */

goog.require('ydn.db.tr.Storage');
goog.require('ydn.db.con.Storage');


goog.exportSymbol('ydn.db.tr.Storage', ydn.db.tr.Storage);
goog.exportProperty(ydn.db.con.Storage.prototype, 'type',
  ydn.db.con.Storage.prototype.type);
goog.exportProperty(ydn.db.con.Storage.prototype, 'setName',
  ydn.db.con.Storage.prototype.setName);
goog.exportProperty(ydn.db.con.Storage.prototype, 'getConfig',
  ydn.db.con.Storage.prototype.getConfig);
goog.exportProperty(ydn.db.con.Storage.prototype, 'transaction',
  ydn.db.con.Storage.prototype.transaction);
goog.exportProperty(ydn.db.con.Storage.prototype, 'close',
  ydn.db.con.Storage.prototype.close);
// for hacker.
goog.exportProperty(ydn.db.con.Storage.prototype, 'db',
  ydn.db.con.Storage.prototype.getDbInstance);
