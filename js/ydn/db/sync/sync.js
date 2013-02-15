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
goog.require('ydn.debug.error.NotSupportedException');



ydn.db.schema.Store.prototype.synchronizer_ = null;


/**
 * Synchronized given object to backend server.
 * Currently only ATOM format is supported.
 * @link http://www.ietf.org/rfc/rfc4287
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
    }
  }
};


/**
 *  Synchronized given collection of object to backend server.
 * @param {ydn.db.schema.Store.SyncMethod} method one of 'get', 'add', 'put', 'delete'
 * @param {!Array.<!Object>} object
 * @param {!Array.<*>=} key
 */
ydn.db.schema.Store.prototype.syncObjects = function(method, object, key) {
  // currently we assume ATOM format

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
    store.synchronizer = new ydn.db.sync.GData(this, store, null, '');
  } else if (option.format == 'atom') {
    store.synchronizer = new ydn.db.sync.Atom(this, store, null, '');
  } else {
    throw new ydn.debug.error.NotSupportedException('Sync format: ' + option.format)
  }
};

