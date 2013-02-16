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
 * @param {AtomOptions=} options
 * @constructor
 * @extends {ydn.db.sync.AbstractSynchronizer}
 */
ydn.db.sync.Atom = function(storage, store, tr, options) {
  goog.base(this, storage, store, tr);
  /**
   * @final
   */
  this.base_uri = options ? options.baseUri : '';

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
 * Return URI to fetch all collection.
 * @param {string=} last_updated last updated date
 * @return {string} uri
 */
ydn.db.sync.Atom.prototype.getFetchUrl = function(last_updated) {
  if (last_updated) {
    return this.base_uri + '?updated=' + last_updated;
  } else {
    return this.base_uri;
  }
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
 * @param obj
 * @return {string} Return updated value from the Atom object.
 */
ydn.db.sync.Atom.prototype.getUpdated = function(obj) {
  return obj['updated'];
};


/**
 *
 * @param feed_json
 * @return {!Array} list of entries in the feed
 */
ydn.db.sync.Atom.prototype.getEntryFromFeed = function(feed_json) {
  var entry = feed_json['entry'];
  if (goog.isArray(entry)) {
    return entry;
  } else if (entry) {
    return [entry];
  } else {
    return [];
  }
};


/**
 *
 * @param feed_json
 * @return {string|undefined} next fetch link
 */
ydn.db.sync.Atom.prototype.getNextLink = function(feed_json) {
  var next = ydn.atom.Link.getLink(feed_json, ydn.atom.Link.Rel.NEXT);
  return next ? next.href : undefined;
};


/**
 *
 * @param {Atom} obj
 * @return {string|undefined} return edit uri from the object.
 */
ydn.db.sync.Atom.prototype.getSelfLink = function(obj) {
  var link = ydn.atom.Link.getLink(obj, ydn.atom.Link.Rel.SELF);
  if (goog.DEBUG && !link) {
    this.logger.warning('Edit link missing in ' + ydn.json.toShortString(obj));
  }
  return link ? link.href : undefined;
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
  var uri = /** @type {string} */ (this.getSelfLink(atom));
  goog.asserts.assertString(uri, 'Self link missing in ' + ydn.json.toShortString(obj) + ' of ' + uri);
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
 * Fetch the feed recursively and dump to the database.
 * @param {string} url
 * @param {number=} cnt
 */
ydn.db.sync.Atom.prototype.fetchFeed = function(url, cnt) {
  cnt = cnt || 0;
  var option = {
    method: 'GET'
  };
  var me = this;
  this.transport.send(url, function(result) {
    if (result.status == 200) {
      var json = result.getResponseJson();
      if (json) {
        var entries = me.getEntryFromFeed(json);
        me.putToDB(entries);
        var next = me.getNextLink(json);
        if (next) {
          cnt += entries.length;
          me.logger.finest(entries.length + ' entries received, continuing: ' + next);
          me.fetchFeed(next, cnt);
        } else {
          me.logger.finest(cnt + ' entries updated on ' + ' feed: ' + url);
        }
      } else {
        me.logger.warning('Feed request return empty content. status: ' + result.status + ' url: ' + result.uri);
      }

    } else { // invalid response
      me.logger.warning('Unexpected response for GET: ' + result.status + ' ' + url + ' ' +
          result.text.substr(0, 70));
    }
  }, option);
};


/**
 * Fetch collection of objects from server.
 * Caveat: The list of object is in ascending order of updated time.
 * @param {!Array} objs
 * @param {string=} opt_uri
 * @override
 */
ydn.db.sync.Atom.prototype.fetchFromServer = function(objs, opt_uri) {

  var last_updated;
  for (var i = 0, n = objs.length; i < n; i++) {
    var updated_date = this.getUpdated(objs[i]);
    if (!last_updated || updated_date > last_updated) {
      // updated_date is RFC 3339 string, we can compare directly,
      // see http://www.ietf.org/rfc/rfc3339.txt Section 5.1
      last_updated = updated_date;
    }
  }
  var url = this.getFetchUrl(last_updated);
  this.fetchFeed(url);

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
    } else if (result.status == 200) {

    } else {
      me.logger.warning('Unexpected response for PUT: ' + result.status + ' ' + uri + ' ' +
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
    } else {
      me.logger.warning('Unexpected response for DELETE: ' + result.status + ' ' + uri + ' ' +
          result.text.substr(0, 70));
    }
    obj = null;
  }, option);
};