/**
 * @fileoverview GData synchronizer.
 * 
 * @link https://developers.google.com/gdata/docs/2.0/reference
 */


goog.provide('ydn.db.sync.GData');
goog.require('ydn.db.sync.Atom');
goog.require('ydn.atom.Atom');
goog.require('ydn.atom.Link');



/**
 *
 * @param {ydn.db.core.Storage} storage
 * @param {ydn.db.schema.Store} store
 * @param {ydn.http.Transport} tr
 * @param {!GDataOptions} options
 * @constructor
 * @extends {ydn.db.sync.Atom}
 */
ydn.db.sync.GData = function(storage, store, tr, options) {
  goog.base(this, storage, store, tr, options);
};
goog.inherits(ydn.db.sync.GData, ydn.db.sync.Atom);


/**
 *
 * @inheritDoc
 */
ydn.db.sync.GData.prototype.getId = function(obj) {
  return obj ? obj['id'] ? obj['id']['$t'] : '' : '';
};


/**
 *
 * @inheritDoc
 */
ydn.db.sync.GData.prototype.getEtag = function(obj) {
  return obj['gd$etag'] || obj['etag'];
};


/**
 * @inheritDoc
 */
ydn.db.sync.GData.prototype.getFetchUrl = function(last_updated) {
  var url = this.base_uri + '?alt=json';
  if (last_updated) {
    url += '&updated-min=' + last_updated;
  }
  return url;
};


/**
 * @inheritDoc
 */
ydn.db.sync.GData.prototype.getUpdated = function(obj) {
  var atom = new ydn.atom.Atom(/** @type {!Atom} */ (obj));
  return atom.getUpdated();
};
