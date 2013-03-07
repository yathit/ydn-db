/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 19/1/13
 */

goog.require('ydn.db.rich.Storage');

goog.exportProperty(ydn.db.core.Storage.prototype, 'encrypt',
    ydn.db.core.Storage.prototype.encrypt);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setItem',
    ydn.db.core.Storage.prototype.setItem);
goog.exportProperty(ydn.db.core.Storage.prototype, 'getItem',
    ydn.db.core.Storage.prototype.getItem);
goog.exportProperty(ydn.db.core.Storage.prototype, 'removeItem',
    ydn.db.core.Storage.prototype.removeItem);