/**
 * @fileoverview About this file
 */

goog.provide('ydn.db.query.exports');
goog.require('ydn.db.Query');
goog.require('ydn.db.core.Storage');
goog.require('ydn.db.query.RestrictionCursor');


goog.exportProperty(ydn.db.Query.prototype, 'copy',
    ydn.db.Query.prototype.copy);
goog.exportProperty(ydn.db.Query.prototype, 'count',
    ydn.db.Query.prototype.count);
goog.exportProperty(ydn.db.Query.prototype, 'list',
    ydn.db.Query.prototype.list);
goog.exportProperty(ydn.db.Query.prototype, 'order',
    ydn.db.Query.prototype.order);
goog.exportProperty(ydn.db.Query.prototype, 'patch',
    ydn.db.Query.prototype.patch);
goog.exportProperty(ydn.db.Query.prototype, 'reverse',
    ydn.db.Query.prototype.reverse);
goog.exportProperty(ydn.db.Query.prototype, 'where',
    ydn.db.Query.prototype.where);

goog.exportProperty(ydn.db.core.Storage.prototype, 'from',
    ydn.db.core.Storage.prototype.from);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'from',
    ydn.db.core.DbOperator.prototype.from);

goog.exportProperty(ydn.db.query.RestrictionCursor.prototype, 'getKey',
    ydn.db.query.RestrictionCursor.prototype.getKey);
goog.exportProperty(ydn.db.query.RestrictionCursor.prototype, 'getPrimaryKey',
    ydn.db.query.RestrictionCursor.prototype.getPrimaryKey);
goog.exportProperty(ydn.db.query.RestrictionCursor.prototype, 'getValue',
    ydn.db.query.RestrictionCursor.prototype.getValue);
goog.exportProperty(ydn.db.query.RestrictionCursor.prototype, 'update',
    ydn.db.query.RestrictionCursor.prototype.update);
goog.exportProperty(ydn.db.query.RestrictionCursor.prototype, 'clear',
    ydn.db.query.RestrictionCursor.prototype.clear);
