/**
 * @fileoverview Same interface as localStorage, but store in memory.
 */

goog.provide('ydn.db.req.InMemoryStorage');


/**
 *
 * @constructor
 */
ydn.db.req.InMemoryStorage = function() {
  this.memoryStorage = {};
};


/**
 *
 * @param {string} key key.
 * @param {string} value value.
 */
ydn.db.req.InMemoryStorage.prototype.setItem = function(key, value) {
  this.memoryStorage[key] = value;
};


/**
 *
 * @param {string} key key.
 * @return {string?} value. If not found, null is return.
 */
ydn.db.req.InMemoryStorage.prototype.getItem = function(key) {
  return this.memoryStorage[key] || null; // window.localStorage return null
  // if the key don't exist.
};


/**
 *
 * @param {string} key key.
 */
ydn.db.req.InMemoryStorage.prototype.removeItem = function(key) {
  delete this.memoryStorage[key];
};


/**
 * Clear all cache.
 */
ydn.db.req.InMemoryStorage.prototype.clear = function() {
  this.memoryStorage = {};
};