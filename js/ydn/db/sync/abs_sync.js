/**
 * @fileoverview Base synchronizer.
 *
 * Synchronization is initiated by the client database to server database. Conflict is fully
 * resolved in client side.
 *
 * @author Kyaw Tun <kyawtun@yathit.com>
 */


goog.provide('ydn.db.sync.AbstractSynchronizer');
goog.require('ydn.http');
goog.require('ydn.http.Transport');
goog.require('goog.debug.Logger');
goog.require('ydn.db.sync.EventTypes');


/**
 * @param {ydn.db.core.Storage} storage
 * @param {ydn.http.Transport} tr
 * @constructor
 */
ydn.db.sync.AbstractSynchronizer = function(storage, tr) {

  /**
   * @final
   */
  this.storage = storage;

  this.transport = tr;
};


/**
 *
 * @type {ydn.db.core.Storage}
 * @protected
 */
ydn.db.sync.AbstractSynchronizer.prototype.storage;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.sync.AbstractSynchronizer.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.sync.AbstractSynchronizer');


/**
 *
 * @type {ydn.http.Transport}
 * @protected
 */
ydn.db.sync.AbstractSynchronizer.prototype.transport = null;


/**
 *
 * @param {string} uri
 * @return {ydn.http.Transport}
 * @protected
 */
ydn.db.sync.AbstractSynchronizer.prototype.getTransport = function(uri) {
  return this.transport || ydn.http.getTransport(uri);
};


ydn.db.sync.AbstractSynchronizer.prototype.putToDB = function (object) {

};


/**
 * Sync given object back to server.
 * @param {!Object} object
 * @param {string=} uri
 */
ydn.db.sync.AbstractSynchronizer.prototype.addToServer = goog.abstractMethod;
