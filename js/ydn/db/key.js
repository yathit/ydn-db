// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview  A unique key for a datastore object supporting hierarchy of
 * parent-child relationships for an entity.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Key');


/**
 * Builds a new Key object of known id.
 *
 * @param {string} store
 * @param {(string|number)}id
 * @param {ydn.db.Key=} opt_parent
 * @constructor
 */
ydn.db.Key = function(store, id, opt_parent) {
  /**
   * @final
   * @type {string}
   */
  this.store_name = store;
  /**
   * @final
   * @type {(string|number)}
   */
  this.id = id;
  /**
   * @final
   * @type {ydn.db.Key}
   */
  this.parent = opt_parent || null;

  /**
   * Database instance
   * @type {ydn.db.tr.Db}
   */
  this.db;

};


/**
 * @typedef {{
 *  store: string,
 *  id: (string|number),
 *  parent: (ydn.db.Key|undefined)
 * }}
 */
ydn.db.Key.Json;


/**
 * Get object from store.
 * @return {!goog.async.Deferred} return resulting object in deferred function.
 */
ydn.db.Key.prototype.get = function() {
  goog.asserts.assertObject(this.db);
  return this.db.get(this.store_name, this.id);
};


/**
 * @param {!Object|!Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function. On error,
 * an {@code Error} object is return as received from the mechanism.
 */
ydn.db.Key.prototype.set = function(value) {
  goog.asserts.assertObject(this.db);
  return this.db.set(this.store_name, value);
};


/**
 * @return {!Object}
 */
ydn.db.Key.prototype.toJSON = function() {
  return {
    'store': this.store_name,
    'id': this.id,
    'parent': this.parent ? this.parent.toJSON() : undefined
  }
};

/**
 * @return {string}
 */
ydn.db.Key.prototype.toValue = function() {
  var parent_value = this.parent ? this.parent.toValue() + '\t' : '';
  return parent_value + this.store_name + ':' + this.id;
};


/**
 * @inheritDoc
 */
ydn.db.Key.prototype.toString = function() {
  return this.toValue();
};


/**
 *
 * @param {!Object} json
 */
ydn.db.Key.fromJSON = function(json) {
  var parent = goog.isDefAndNotNull(json['parent']) ?
    ydn.db.Key.fromJSON(json['parent']) : null;

  return new ydn.db.Key(json['store'], json['id'], parent);
};



