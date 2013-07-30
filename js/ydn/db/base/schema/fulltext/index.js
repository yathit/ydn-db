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
 * @fileoverview Fulltext index.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.schema.fulltext.Index');



/**
 * Fulltext search index.
 * @param {string} name fulltext search index name.
 * @param {Array.<ydn.db.schema.FullTextSource>} indexes list of primary
 * index, in which indexes are stored.
 * @param {string=} opt_lang language.
 * @param {Array.<string>=} opt_normalizers list of normalizer.
 * @constructor
 */
ydn.db.schema.fulltext.Index = function(name, indexes, opt_lang,
                                       opt_normalizers) {
  /**
   * @protected
   * @type {string}
   */
  this.name = name;
  /**
   * @protected
   * @type {Array.<ydn.db.schema.FullTextSource>}
   */
  this.indexes = indexes;
  /**
   * @protected
   * @type {string}
   */
  this.lang = opt_lang || '';
  if (goog.DEBUG) {
    if (['', 'en', 'fr'].indexOf(this.lang) == -1) {
      throw new ydn.debug.error.ArgumentException('Unsupported lang "' +
          opt_lang + ' for full text search index ' + name);
    }
  }
  /**
   * @type {ydn.db.schema.fulltext.Engine}
   */
  this.engine = null;
};


/**
 * @return {string} full text index name. This is store name as well.
 */
ydn.db.schema.fulltext.Index.prototype.getName = function() {
  return this.name;
};


/**
 * @return {number} number of primary indexes.
 */
ydn.db.schema.fulltext.Index.prototype.count = function() {
  return this.indexes.length;
};


/**
 * @param {number} idx index of indexes.
 * @return {ydn.db.schema.FullTextSource} Index at idx.
 */
ydn.db.schema.fulltext.Index.prototype.index = function(idx) {
  return this.indexes[idx];
};


/**
 * @param {string} name store name.
 * @return {ydn.db.schema.FullTextSource} Index at idx.
 */
ydn.db.schema.fulltext.Index.prototype.getIndex = function(name) {
  return goog.array.find(this.indexes, function(x) {
    return x.getStoreName() == x;
  });
};


/**
 * @param {FullTextIndexSchema} json
 * @return {!ydn.db.schema.fulltext.Index}
 */
ydn.db.schema.fulltext.Index.fromJson = function(json) {
  if (goog.DEBUG) {
    var fields = ['name', 'sources', 'lang'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown field: ' + key +
            ' in ' + ydn.json.stringify(json));
      }
    }
  }
  if (!goog.isArray(json.sources)) {
    throw new ydn.debug.error.ArgumentException('indexes require for ' +
        'full text search index ' + json.name + ', but ' + json.sources +
        ' of type ' + typeof json.sources + ' found.');
  }
  var indexes = json.sources.map(function(x) {
    return ydn.db.schema.FullTextSource.fromJson(x);
  });
  return new ydn.db.schema.fulltext.Index(json.name, indexes);
};



/**
 * Primary index for fulltext search index.
 * @param {string} store_name store name of which index reside.
 * @param {string} key_path the index name.
 * @param {number=} opt_weight index weight. Default to 1.
 * @constructor
 */
ydn.db.schema.FullTextSource = function(store_name, key_path,
                                             opt_weight) {
  if (goog.DEBUG) {
    if (!store_name || goog.string.isEmpty(store_name)) {
      throw new ydn.debug.error.ArgumentException('store_name must be' +
          ' provided for primary full text index');
    }
    if (!key_path || goog.string.isEmpty(key_path)) {
      throw new ydn.debug.error.ArgumentException('index_name must be' +
          ' provided for primary full text index');
    }
  }
  /**
   * @protected
   * @type {string}
   */
  this.store_name = store_name;
  /**
   * @protected
   * @type {string}
   */
  this.key_path = key_path;
  /**
   * @protected
   * @type {number}
   */
  this.weight = opt_weight || 1.0;
};


/**
 * @return {string}
 */
ydn.db.schema.FullTextSource.prototype.getStoreName = function() {
  return this.store_name;
};


/**
 * @return {number}
 */
ydn.db.schema.FullTextSource.prototype.getWeight = function() {
  return this.weight;
};


/**
 * @return {string}
 */
ydn.db.schema.FullTextSource.prototype.getKeyPath = function() {
  return this.key_path;
};


/**
 * @param {FullTextSource} json
 * @return {!ydn.db.schema.FullTextSource}
 */
ydn.db.schema.FullTextSource.fromJson = function(json) {
  if (goog.DEBUG) {
    var fields = ['storeName', 'keyPath', 'weight'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown field: ' + key +
            ' in ' + ydn.json.stringify(json));
      }
    }
  }
  return new ydn.db.schema.FullTextSource(json.storeName, json.keyPath,
      json.weight);
};

