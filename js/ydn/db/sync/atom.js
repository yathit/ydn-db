/**
 * @fileoverview ATOM format synchronizer.
 * 
 * @link http://www.ietf.org/rfc/rfc4287
 */


goog.provide('ydn.db.sync.Atom');
goog.require('ydn.db.sync.AbstractSynchronizer');
goog.require('ydn.atom.Link');
goog.require('ydn.json');



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
 * @param obj
 * @return {string}
 */
ydn.db.sync.Atom.prototype.getId = function(obj) {
  return obj ? obj['ID'] : '';
};


/**
 *
 * @param {Atom} obj
 * @return {string} return edit uri from the object.
 */
ydn.db.sync.Atom.prototype.getEditLink = function(obj) {
  var link = ydn.atom.Link.getLink(obj, ydn.atom.Link.Rel.EDIT);
  if (goog.DEBUG && !link) {
    this.logger.warning('Edit link missing in ' + ydn.json.toShortString(obj));
  }
  return link ? link.href : '';
};


/**
 *
 * @param {Atom} obj
 * @return {string} return edit uri from the object.
 */
ydn.db.sync.Atom.prototype.getSelfLink = function(obj) {
  var link = ydn.atom.Link.getLink(obj, ydn.atom.Link.Rel.SELF);
  if (goog.DEBUG && !link) {
    this.logger.warning('Edit link missing in ' + ydn.json.toShortString(obj));
  }
  return link ? link.href : '';
};

/**
 * Sync given object back to server.
 * @param {Object} obj
 * @param {string=} opt_uri
 * @override
 */
ydn.db.sync.Atom.prototype.addToServer = function(obj, opt_uri) {
  /**
   * @type {string}
   */
  var uri = opt_uri || this.base_uri;
  var option = {
    method: 'POST'
  };
  var me = this;
  this.transport.send(uri, function(result) {
    if (result.status == 201) {
      me.logger.finest('Successfully inserted ' + me.getId(obj));
    } else {
      var event = new ydn.db.sync.InsertConflictEvent(me.storage, 201, obj);
      me.storage.dispatchEvent(event);
    }
    obj = null;
  }, option);
};


/**
 * Sync given object back to server.
 * @param {Object} obj
 * @param {string=} opt_uri
 * @override
 */
ydn.db.sync.Atom.prototype.getFromServer = function(obj, opt_uri) {
  var atom = /** @type {!Atom} */ (obj);
  var uri = this.getSelfLink(atom);
  var etag = this.getEtag(atom);
  goog.asserts.assertString(etag, 'Etag missing in ' + ydn.json.toShortString(obj) + ' of ' + uri);
  // if the request method was GET or HEAD, the server SHOULD respond with a 304 (Not Modified) response, including
  // the cache- related header fields (particularly ETag) of one of the entities that matched. For all
  // other request methods, the server MUST respond with a status of 412 (Precondition Failed).
  var option = {
    method: 'HEAD',
    header: {'If-None-Match': etag}
  };
  var me = this;
  this.transport.send(uri, function(result) {
    if (result.status == 304) { // Not Modified
      // OK
      me.logger.finest('Verified up-date object ' + me.getId(obj));
    } else if (result.status == 412) { // Precondition Failed
      me.transport.send(uri, function(result_2) {
        var new_obj = result_2.getResponseJson();
        var event = new ydn.db.sync.UpdatedEvent(me.storage, 412, obj, new_obj);
        me.storage.dispatchEvent(event);
        me.putToDB([new_obj]);
      }, {method: 'GET'});
    } else { // invalid response
      me.logger.warning('Unexpected response: ' + result.status + ' ' + uri + ' ' +
          result.text.substr(0, 70));
    }
    obj = null;
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
  goog.asserts.assertString(etag, 'Etag missing in ' + ydn.json.toShortString(obj) + ' of ' + uri);
  var option = {
    method: 'PUT',
    header: {'If-Match': etag}
  };
  var me = this;
  this.transport.send(uri, function(result) {
    if (result.status == 409) { // conflict
      var event = new ydn.db.sync.UpdateConflictEvent(me.storage, 409, obj, result.getResponseJson());
      me.storage.dispatchEvent(event);
    }
    obj = null;
  }, option);
};



/**
 * Sync given object back to server.
 * @param {Object} obj
 * @param {string=} opt_uri
 * @override
 */
ydn.db.sync.Atom.prototype.clearToServer = function(obj, opt_uri) {
  var atom = /** @type {!Atom} */ (obj);
  var uri = this.getEditLink(atom);
  var etag = this.getEtag(atom);
  goog.asserts.assertString(etag, 'Etag missing in ' + ydn.json.toShortString(obj) + ' of ' + uri);
  var option = {
    method: 'DELETE',
    header: {'If-Match': etag}
  };
  var me = this;
  this.transport.send(uri, function(result) {
    if (result.status == 409) { // conflict
      var event = new ydn.db.sync.DeleteConflictEvent(me.storage, 409, obj, result.getResponseJson());
      me.storage.dispatchEvent(event);
    } else if (result.status == 200) {
      me.logger.finest('Successfully deleted object ' + me.getId(obj));
    }
    obj = null;
  }, option);
};