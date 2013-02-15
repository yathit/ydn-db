/**
 * @fileoverview ATOM format synchronizer.
 * 
 * @link http://www.ietf.org/rfc/rfc4287
 */


goog.provide('ydn.db.sync.Atom');
goog.require('ydn.db.sync.AbstractSynchronizer');



/**
 *
 * @param {ydn.db.core.Storage} storage
 * @param {ydn.http.Transport} tr
 * @param {string} base_uri
 * @constructor
 * @extends {ydn.db.sync.AbstractSynchronizer}
 */
ydn.db.sync.Atom = function(storage, tr, base_uri) {
  goog.base(this, storage, tr);
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
 * @param {Object} obj
 * @return {string} return etag from the object.
 */
ydn.db.sync.Atom.prototype.getEtag = function(obj) {
  return obj['etag'];
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
 * @param {string} uri
 * @param {Object} object
 */
ydn.db.sync.Atom.prototype.put = function(uri, object) {
  var etag = this.getEtag(object);
  goog.asserts.assertString(etag, 'Etag missing in ' + object + ' of ' + uri);
  var option = {
    method: 'PUT',
    header: {'If-Match': etag}
  };
  var me = this;
  this.transport.send(uri, function(result) {
    if (result.status == 409) { // conflict
      var event = new ydn.db.sync.ConflictEvent(me.storage, object, result.getResponseJson());
      me.storage.dispatchEvent(event);
    }
    object = null;
  }, option);
};
