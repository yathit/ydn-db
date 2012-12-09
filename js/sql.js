/**
 * @fileoverview Exports SQL module.
 */

goog.require('ydn.db.sql.Storage');
goog.require('ydn.db.sql.TxStorage');


goog.exportProperty(ydn.db.sql.Storage.prototype, 'execute',
  ydn.db.sql.Storage.prototype.execute);

goog.exportProperty(ydn.db.sql.TxStorage.prototype, 'execute',
  ydn.db.sql.TxStorage.prototype.execute);