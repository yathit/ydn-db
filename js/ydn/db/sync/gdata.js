/**
 * @fileoverview ATOM format synchronizer.
 * 
 * @link http://www.ietf.org/rfc/rfc4287
 */


goog.provide('ydn.db.sync.GData');
goog.require('ydn.db.sync.Atom');
goog.require('ydn.atom.Link');



/**
 *
 * @param {ydn.db.core.Storage} storage
 * @param {ydn.db.schema.Store} store
 * @param {ydn.http.Transport} tr
 * @param {string} base_uri
 * @constructor
 * @extends {ydn.db.sync.Atom}
 */
ydn.db.sync.GData = function(storage, store, tr, base_uri) {
  goog.base(this, storage, store, tr, base_uri);
};
goog.inherits(ydn.db.sync.GData, ydn.db.sync.Atom);


/**
 *
 * @inheritDoc
 */
ydn.db.sync.GData.prototype.getEtag = function(obj) {
  return obj['gd$etag'] || obj['etag'];
};



