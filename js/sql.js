/**
 * @fileoverview Exports SQL module.
 */

goog.require('ydn.db.sql.Storage');
goog.require('ydn.db.sql.TxStorage');


goog.exportProperty(ydn.db.sql.Storage.prototype, 'executeSql',
  ydn.db.sql.Storage.prototype.executeSql);

goog.exportProperty(ydn.db.sql.TxStorage.prototype, 'executeSql',
  ydn.db.sql.TxStorage.prototype.executeSql);