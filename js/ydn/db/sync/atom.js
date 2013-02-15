/**
 * @fileoverview ATOM format synchronizer.
 * 
 * @link http://www.ietf.org/rfc/rfc4287
 */


goog.provide('ydn.db.sync.Atom');
goog.require('ydn.db.sync.AbstractSynchronizer');
goog.require('ydn.atom.Link');



/**
 *
 * @param {ydn.db.core.Storage} storage
 * @param {ydn.db.schema.Store} store
 * @param {ydn.http.Transport} tr
 * @param {string} base_uri
 * @constructor
 * @extends {ydn.db.sync.AbstractSynchronizer}
 */
ydn.db.sync.Atom = function(storage, store, tr, base_uri) {
  goog.base(this, storage, store, tr);
  this.base_uri = base_uri;
};
goog.inherits(ydn.db.sync.Atom, ydn.db.sync.AbstractSynchronizer);


/**
 * @type {string}
 * @protected
 */
ydn.db.sync.Atom.prototype.base_uri;



/**
 *
 * @param {!Object} obj
 * @return {string} return etag from the object.
 */
ydn.db.sync.Atom.prototype.getEtag = function(obj) {
  return obj['etag'];
};


/**
 *
 * @param {Atom} obj
 * @return {string} return edit uri from the object.
 */
ydn.db.sync.Atom.prototype.getEditLink = function(obj) {
  var link = ydn.atom.Link.getLink(obj, ydn.atom.Link.Rel.EDIT);
  goog.asserts.assertObject(link);
  return link.href;
};


/**
 * Sync given object back to server.
 * @param {Object} object
 * @param {string=} opt_uri
 * @override
 */
ydn.db.sync.Atom.prototype.addToServer = function(object, opt_uri) {
  /**
   * @type {string}
   */
  var uri = opt_uri || this.base_uri;
  var option = {
    method: 'POST'
  };
  var me = this;
  this.transport.send(uri, function(result) {
    if (result.status != 201) {
      var event = new ydn.db.sync.InsertErrorEvent(me.storage, object);
      me.storage.dispatchEvent(event);
    }
    object = null;
  }, option);
};

/**
 * Sync given object back to server.
 * @param {Object} obj
 * @param {string=} opt_uri
 * @override
 */
ydn.db.sync.Atom.prototype.putToServer = function(obj, opt_uri) {
  var atom = /** @type {!Atom} */ (obj);
  var uri = this.getEditLink(atom);
  var etag = this.getEtag(atom);
  goog.asserts.assertString(etag, 'Etag missing in ' + obj + ' of ' + uri);
  var option = {
    method: 'PUT',
    header: {'If-Match': etag}
  };
  var me = this;
  this.transport.send(uri, function(result) {
    if (result.status == 409) { // conflict
      var event = new ydn.db.sync.ConflictEvent(me.storage, obj, result.getResponseJson());
      me.storage.dispatchEvent(event);
    }
    obj = null;
  }, option);
};
