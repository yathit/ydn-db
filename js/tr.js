/**
 * @fileoverview Exports for tr-ydn-db module.
 */

goog.require('ydn.db.tr.Storage');
goog.require('ydn.db.tr.DbOperator');


goog.exportProperty(ydn.db.tr.Storage.prototype, 'run',
    ydn.db.tr.Storage.prototype.run);
goog.exportProperty(ydn.db.tr.DbOperator.prototype, 'run',
   ydn.db.tr.DbOperator.prototype.run);
goog.exportProperty(ydn.db.tr.DbOperator.prototype, 'abort',
  ydn.db.tr.DbOperator.prototype.abort);


