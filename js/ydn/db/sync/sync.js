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
  if (option.format == 'atom') {
    store.synchronizer = new ydn.db.sync.Atom(this, null, '');
  }
};


/**
 * Receive updated object from the server.
 * @param {!Array} objs
 */
ydn.db.schema.Store.prototype.receiveObjects = function(objs) {

//  var on_completed = function(type, e) {
//
//  };
//
//  this.getStorage().transaction(function(tx) {
//
//  }, [this.store_name], ydn.db.base.TransactionMode.READ_WRITE, on_completed);
};