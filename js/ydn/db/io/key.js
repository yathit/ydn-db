/**
 * @fileoverview Mutable key with transaction context.
 */

goog.provide('ydn.db.io.Key');
goog.require('ydn.db.Key');



/**
 * Builds a new Key object of known id.
 *
 * @param {!ydn.db.io.QueryService} db db instance.
 * @param {string|!ydn.db.Key.Json} store_name
 * @param {(string|number)=} id
 * @param {ydn.db.Key=} opt_parent
 * @extends {ydn.db.Key}
 * @constructor
 */
ydn.db.io.Key = function(db, store_name, id, opt_parent) {
  goog.base(this, store_name, id, opt_parent);
  /**
   * @final
   * @protected
   * @type {!ydn.db.io.QueryService}
   */
  this.dbp = db;
};
goog.inherits(ydn.db.io.Key, ydn.db.Key);


/**
 *
 * @return {!goog.async.Deferred}
 */
ydn.db.io.Key.prototype.get = function() {
  return this.dbp.get(this);
};

/**
 * @param {!Object} obj
 * @param {string|number|!Array.<(string|number)>=} opt_keys out-of-line keys
 * @return {!goog.async.Deferred}
 */
ydn.db.io.Key.prototype.put = function(obj, opt_keys) {
  return this.dbp.put(this.getStoreName(), obj, opt_keys);
};