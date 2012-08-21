/**
 * @fileoverview Key with database instance.
 */


goog.provide('ydn.db.ActiveKey');
goog.require('ydn.db.Key');


/**
 * @extends {ydn.db.Key}
 * @param {!ydn.db.QueryServiceProvider} dbp
 * @param {string} store
 * @param {(string|number)}id
 * @param {ydn.db.Key=} opt_parent
 * @constructor
 */
ydn.db.ActiveKey = function(dbp, store, id, opt_parent) {
  goog.base(this, store, id, opt_parent);

  /**
   * Database instance
   * @final
   * @protected
   * @type {ydn.db.QueryServiceProvider}
   */
  this.dbp = dbp;

};
goog.inherits(ydn.db.ActiveKey, ydn.db.Key);
