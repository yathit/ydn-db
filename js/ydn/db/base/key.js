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
 * parent-child relationships for a record.
 *
 * The instances are immutable.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Key');


/**
 * Builds a new Key object of known id.
 *
 * @param {string|!ydn.db.Key.Json} store_or_json_or_value store name of key
 * object in JSON format.
 * @param {(!Array|string|number)=} id key id.
 * @param {ydn.db.Key=} opt_parent optional parent key.
 * @constructor
 */
ydn.db.Key = function(store_or_json_or_value, id, opt_parent) {

  var store_name;
  if (goog.isObject(store_or_json_or_value)) {
    store_name = store_or_json_or_value['store'];
    id = store_or_json_or_value['id'];
    if (goog.isDefAndNotNull(store_or_json_or_value['parent'])) {
      opt_parent = new ydn.db.Key(store_or_json_or_value['parent']);
    }
  } else {
    goog.asserts.assertString(store_or_json_or_value);
    if (!goog.isDef(id)) {
      // must be valueOf string
      var idx = store_or_json_or_value.lastIndexOf(ydn.db.Key.SEP_PARENT);
      /**
       * @type {string}
       */
      var store_and_id = store_or_json_or_value;
      if (idx > 0) {
        store_and_id = store_or_json_or_value.substr(idx);
        opt_parent = new ydn.db.Key(store_or_json_or_value.substring(0, idx));
      }
      var parts = store_and_id.split(ydn.db.Key.SEP_STORE);
      store_name = parts[0];
      id = parts[1];
      if (!goog.isDef(id)) {
        throw Error('Invalid key value: ' + store_or_json_or_value);
      }
    } else {
      store_name = store_or_json_or_value;
    }
  }

  /**
   * @protected
   * @type {string}
   */
  this.store_name = store_name;
  /**
   * @protected
   * @type {(!Array|string|number)}
   */
  this.id = id;
  /**
   * @protected
   * @type {ydn.db.Key}
   */
  this.parent = opt_parent || null;

};


/**
 * @typedef {number|string|Date|!Array.<number|string|Date>}
 */
var IDBKey;


/**
 * @typedef {{
 *  store: string,
 *  id: (string|number),
 *  parent: (ydn.db.Key|undefined)
 * }}
 */
ydn.db.Key.Json;



/**
 * @return {!Object} key in JSON object.
 */
ydn.db.Key.prototype.toJSON = function() {
  var obj = {
    'store': this.store_name,
    'id': this.id
  };
  if (this.parent) {
    obj['parent'] = this.parent.toJSON();
  }
  return obj;
};


/**
 * Separator between child and parent.
 * @const
 * @type {string} seperator string.
 */
ydn.db.Key.SEP_PARENT = '^|';

/**
 * Separator between table and key.
 * @const {string}
 */
ydn.db.Key.SEP_STORE = '^:';


/**
 * @override
 * @return {string} seperator string.
 */
ydn.db.Key.prototype.valueOf = function() {
  // necessary to make web-safe string ?
  var parent_value = this.parent ? this.parent.valueOf() +
      ydn.db.Key.SEP_PARENT : '';
  return parent_value + this.store_name + ydn.db.Key.SEP_STORE + this.id;
};


/**
 * @inheritDoc
 */
ydn.db.Key.prototype.toString = function() {
  return this.valueOf().replace('^|', '|').replace('^:', ':');
};


/**
 *
 * @return {string} return store name.
 */
ydn.db.Key.prototype.getStoreName = function() {
  return this.store_name;
};


/**
 *
 * @return {!Array|string|number} key id.
 */
ydn.db.Key.prototype.getId = function() {
  return this.id;
};


/**
 *
 * @return {string|number} normalized key.
 */
ydn.db.Key.prototype.getNormalizedId = function() {
  if (goog.isArray(this.id)) {
    return this.id.join(ydn.db.Key.SEP_PARENT);
  } else {
    return this.id;
  }
};


/**
 *
 * @return {ydn.db.Key} return parent key if it has.
 */
ydn.db.Key.prototype.getParent = function() {
  return this.parent;
};


/**
 *
 * @param {*} key
 * @return {boolean} return true if given key is a valid key for IndexedDB.
 */
ydn.db.Key.isValidKey = function(key) {
  return goog.isNumber(key) || goog.isString(key) ||
    (goog.isArray(key) && goog.array.every(/** @type {Array} */ (key),
      ydn.db.Key.isValidKey)) ||
    key instanceof Date;
};

