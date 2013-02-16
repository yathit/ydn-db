/**
 * @fileoverview OData format synchronizer.
 * 
 * @link http://www.odata.org/media/30002/OData%20JSON%20Verbose%20Format.html
 */


goog.provide('ydn.db.sync.OData');
goog.require('ydn.db.sync.Atom');
goog.require('ydn.atom.Atom');
goog.require('ydn.atom.Link');



/**
 *
 * @param {ydn.db.core.Storage} storage
 * @param {ydn.db.schema.Store} store
 * @param {ydn.http.Transport} tr
 * @param {!ODataOptions} options
 * @constructor
 * @extends {ydn.db.sync.Atom}
 */
ydn.db.sync.OData = function(storage, store, tr, options) {
  goog.base(this, storage, store, tr, options);
  /**
   * @final
   */
  this.options = options;
};
goog.inherits(ydn.db.sync.OData, ydn.db.sync.Atom);


/**
 *
 * @type {ODataOptions}
 */
ydn.db.sync.OData.prototype.options = null;

/**
 *
 * @inheritDoc
 */
ydn.db.sync.OData.prototype.getId = function(obj) {
  return /** @type {string} */ (goog.object.getValueByKeys(obj, this.options.pathId));
};


/**
 *
 * @inheritDoc
 */
ydn.db.sync.OData.prototype.getEtag = function(obj) {
  return /** @type {string} */ (goog.object.getValueByKeys(obj, this.options.pathEtag));
};


/**
 * @inheritDoc
 */
ydn.db.sync.OData.prototype.getFetchUrl = function(last_updated) {
  var url = this.base_uri + '?alt=json';
  if (last_updated) {
    url += '&updated-min=' + last_updated;
  }
  return url;
};


/**
 * @inheritDoc
 */
ydn.db.sync.OData.prototype.getUpdated = function(obj) {
  return /** @type {string} */ (goog.object.getValueByKeys(obj, this.options.pathUpdated));
};
