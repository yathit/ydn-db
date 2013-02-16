/**
 * @fileoverview Synchronize with RESTful backend service.
 *
 * This module is written in injector pattern (split source code) so that some compilation
 * can eliminate this module.
 *
 * @author Kyaw Tun <kyawtun@yathit.com>
 */


goog.provide('ydn.db.sync');
goog.require('ydn.db.schema.Store');
goog.require('ydn.db.core.Storage');
goog.require('ydn.db.sync.Atom');
goog.require('ydn.db.sync.GData');
goog.require('ydn.db.sync.OData');
goog.require('ydn.debug.error.NotSupportedException');



ydn.db.schema.Store.prototype.synchronizer_ = null;


/**
 * Synchronized given object to backend server.
 * @param {ydn.db.schema.Store.SyncMethod} method one of 'get', 'add', 'put', 'delete'
 * @param {!Object} object
 * @param {*=} key this is not used in ATOM format
 */
ydn.db.schema.Store.prototype.syncObject = function(method, object, key) {
  if (this.synchronizer) {
    if (method == ydn.db.schema.Store.SyncMethod.ADD) {
      this.synchronizer.addToServer(object);
    } else if (method == ydn.db.schema.Store.SyncMethod.PUT) {
      this.synchronizer.putToServer(object);
    } else if (method == ydn.db.schema.Store.SyncMethod.CLEAR) {
      this.synchronizer.clearToServer(object);
    } else if (method == ydn.db.schema.Store.SyncMethod.GET) {
      this.synchronizer.getFromServer(object);
    }
  }
};


/**
 * Synchronized given collection of object to backend server.
 * @param {ydn.db.schema.Store.SyncMethod} method one of 'get', 'add', 'put', 'delete'
 * @param {!Array.<!Object>} object
 * @param {!Array.<*>=} key
 */
ydn.db.schema.Store.prototype.syncObjects = function(method, object, key) {
  if (method == ydn.db.schema.Store.SyncMethod.GET) {
    this.synchronizer.fetchFromServer(object);
  } // others are ignored
};


/**
 *
 * @type {ydn.db.sync.AbstractSynchronizer}
 */
ydn.db.schema.Store.prototype.synchronizer = null;


/**
 *
 * @param {ydn.db.schema.Store} store
 * @param {StoreSyncOptions} option
 * @override
 */
ydn.db.core.Storage.prototype.addSynchronizer = function(store, option) {
  if (option.format == 'gdata') {
    store.synchronizer = new ydn.db.sync.GData(this, store, null, /** @type {!GDataOptions} */ (option));
  } else if (option.format == 'odata') {
    store.synchronizer = new ydn.db.sync.OData(this, store, null, /** @type {!ODataOptions} */ (option));
  } else if (option.format == 'atom') {
    store.synchronizer = new ydn.db.sync.Atom(this, store, null, /** @type {!AtomOptions} */ (option));
  } else {
    throw new ydn.debug.error.NotSupportedException('Sync format: ' + option.format)
  }
};

