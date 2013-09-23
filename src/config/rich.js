/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 19/1/13
 */

goog.require('ydn.db.rich.Storage');

goog.exportProperty(ydn.db.crud.Storage.prototype, 'encrypt',
    ydn.db.crud.Storage.prototype.encrypt);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'setItem',
    ydn.db.crud.Storage.prototype.setItem);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'getItem',
    ydn.db.crud.Storage.prototype.getItem);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'removeItem',
    ydn.db.crud.Storage.prototype.removeItem);