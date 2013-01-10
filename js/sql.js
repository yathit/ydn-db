/**
 * @fileoverview Exports SQL module.
 */

goog.require('ydn.db.sql.Storage');
goog.require('ydn.db.sql.TxQueue');


goog.exportProperty(ydn.db.sql.Storage.prototype, 'executeSql',
  ydn.db.sql.Storage.prototype.executeSql);

goog.exportProperty(ydn.db.sql.TxQueue.prototype, 'executeSql',
  ydn.db.sql.TxQueue.prototype.executeSql);