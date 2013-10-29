/**
 * @fileoverview Exports for coroutine module.
 *
 */

goog.provide('ydn.db.tr.cor.exports');
goog.require('ydn.db.tr.Storage');


goog.exportProperty(ydn.db.tr.Storage.prototype, 'spawn',
    ydn.db.tr.Storage.prototype.spawn);

