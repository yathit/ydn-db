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
 * @param {ydn.db.Key.Json} json key defined in JSON format.
 * @constructor
 */
ydn.db.Key = function(json) {
  /**
   * @final
   * @type {string}
   */
  this.store_name = json['store'];
  goog.asserts.assertString(this.store_name);
  /**
   * @final
   * @type {(string|number)}
   */
  this.id = json['id'];
  goog.asserts.assert(this.id);
  /**
   * @final
   * @type {ydn.db.Key}
   */
  this.parent = goog.isDefAndNotNull(json['parent']) ?
      new ydn.db.Key(json['parent']) : null;
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
 * @inheritDoc
 */
ydn.db.Key.prototype.toString = function() {
  return ydn.json.stringify(this.toJSON());
};


/**
 *
 * @param {string} store
 * @param {string|number} id
 * @param var_args
 * @return {!ydn.db.Key}
 */
ydn.db.Key.fromJSON = function(store, id, var_args) {
  return new ydn.db.Key({'store': store, 'id': id})
};



