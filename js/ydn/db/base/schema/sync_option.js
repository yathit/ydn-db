/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 24/2/13
 */

goog.provide('ydn.db.schema.SyncOption');
goog.require('ydn.debug.error.ArgumentException');


/**
 *
 * @type {!StoreSyncOptionJson} json sync option in json format 
 * @constructor
 */
ydn.db.schema.SyncOption = function(json) {
  this.format = json['format'];
  if (goog.DEBUG && ['atom', 'gdata', 'odata'].indexOf(this.format) == -1) {
    throw new ydn.debug.error.ArgumentException('Invalid sync option format: ' +
        this.format);
  }
  this.readRequestTimeout = json['readRequestTimeout'] ||
      ydn.db.schema.SyncOption.DEFAULT_READ_REQUEST_TIMEOUT;
  this.writeRequestTimeout = json['writeRequestTimeout'] ||
      ydn.db.schema.SyncOption.DEFAULT_WRITE_REQUEST_TIMEOUT;
  this.writeRequestTimeout = json['fetchStrategies'] || [];
  if (json['transport']) {

  }
};


/**
 * @const
 * @type {number} read request time out.
 */
ydn.db.schema.SyncOption.DEFAULT_READ_REQUEST_TIMEOUT = 200;

/**
 * @const
 * @type {number} write request time out.
 */
ydn.db.schema.SyncOption.DEFAULT_WRITE_REQUEST_TIMEOUT = 30000;



/**
 * @enum {string}
 */
ydn.db.schema.SyncOption.FetchStrategy = {
  LAST_UPDATED: 'last-updated',
  ASCENDING_KEY: 'ascending-key',
  DESCENDING_KEY: 'descending-key'
};


/**
 * @const
 * @type {Array.<ydn.db.schema.Store.FetchStrategy>}
 */
ydn.db.schema.SyncOption.FetchStrategies = [
  ydn.db.schema.Store.FetchStrategy.LAST_UPDATED,
  ydn.db.schema.Store.FetchStrategy.DESCENDING_KEY];


/**
 * @enum {string}
 */
ydn.db.schema.SyncOption.KeyPath = {
  ID: 'id',
  ETAG: 'et',
  UPDATED: 'up',
  NEXT: 'nt'
};


/**
 * @type {string}
 * @private
 */
ydn.db.schema.SyncOption.prototype.format;

/**
 * @type {?number}
 * @private
 */
ydn.db.schema.SyncOption.prototype.readRequestTimeout;

/**
 * @type {?number}
 * @private
 */
ydn.db.schema.SyncOption.prototype.writeRequestTimeout;

/**
 * @type {Array.<string>}
 * @private
 */
ydn.db.schema.SyncOption.prototype.fetchStrategies;


/**
 * @type {Object.<!Array.<string>>}
 * @private
 */
ydn.db.schema.SyncOption.prototype.keyPaths;


/**
 * @type {ydn.http.ITransport}
 * @private
 */
ydn.db.schema.SyncOption.prototype.transport;


/**
 * @param {ydn.db.schema.SyncOption.KeyPath} key
 * @return {!Array.<string>}
 */
ydn.db.schema.SyncOption.prototype.getKeyPath = function(key) {
  var v = this.keyPaths[key];
  goog.asserts.assertArray(v, 'SyncOption keyPath: ' + key +
      ' must be defined.');
  return v;
};

