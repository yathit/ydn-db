/**
 * @fileoverview Mutable key with transaction context.
 */

goog.provide('ydn.db.io.Key');
goog.require('ydn.db.Key');



/**
 * Builds a new Key object of known id.
 *
 * @param {
 * @param {string|!ydn.db.Key.Json} store_or_json_or_value
 * @param {(string|number)=}id
 * @param {ydn.db.Key=} opt_parent
 * @extends {ydn.db.Key}
 * @constructor
 */
ydn.db.io.Key = function(db, store_or_json_or_value, id, opt_parent) {
  goog.base(this, store_or_json_or_value, id, opt_parent);
};
goog.inherits(ydn.db.io.Key, ydn.db.Key);


/**
 *
 * @return {string}
 */
ydn.db.Key.prototype.getStoreName = function() {
  return this.store_name;
};


/**
 *
 * @return {string|number}
 */
ydn.db.Key.prototype.getId = function() {
  return this.id;
};


/**
 *
 * @return {ydn.db.Key}
 */
ydn.db.Key.prototype.getParent = function() {
  return this.parent;
};