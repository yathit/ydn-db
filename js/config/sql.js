/**
 * @fileoverview Exports SQL module.
 */

goog.require('ydn.db.sql.Storage');
goog.require('ydn.db.sql.DbOperator');

goog.exportProperty(ydn.db.sql.Storage.prototype, 'branch',
  ydn.db.sql.Storage.prototype.branch);

goog.exportProperty(ydn.db.sql.Storage.prototype, 'executeSql',
  ydn.db.sql.Storage.prototype.executeSql);

goog.exportProperty(ydn.db.sql.DbOperator.prototype, 'executeSql',
  ydn.db.sql.DbOperator.prototype.executeSql);