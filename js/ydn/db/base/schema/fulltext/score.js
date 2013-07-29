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
 * @fileoverview Fulltext element score.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.schema.fulltext.Score');


goog.provide('ydn.db.schema.fulltext.Score');
goog.provide('ydn.db.schema.fulltext.Score');



/**
 * An object that associates a value and a numerical score
 * @param {string} key normalized value.
 * @param {string} index_value original value being index.
 * @param {string} store_name source store name.
 * @param {string} key_path source key path.
 * @param {IDBKey=} opt_p_key source primary key.
 * @param {number=} opt_score score.
 * @constructor
 */
ydn.db.schema.fulltext.Score = function(key, index_value, store_name,
                                        key_path, opt_p_key, opt_score) {
  /**
   * @final
   * @type {string}
   */
  this.key = key;
  /**
   * @final
   * @type {string}
   */
  this.index_value = index_value;
  /**
   * @final
   * @type {string}
   */
  this.store_name = store_name;
  /**
   * @final
   * @type {string}
   */
  this.key_path = store_name;
  /**
   * @final
   * @type {IDBKey}
   */
  this.primary_key = opt_p_key;
  /**
   * @final
   * @type {number}
   */
  this.score = goog.isDef(opt_score) ? opt_score : NaN;
  /**
   * @final
   * @private
   * @type {Array.<number>}
   */
  this.encounter_count_ = [];
};


/**
 * @return {string} source store name.
 */
ydn.db.schema.fulltext.Score.prototype.getStoreName = function() {
  return this.store_name;
};


/**
 * @return {IDBKey} source primary key.
 */
ydn.db.schema.fulltext.Score.prototype.getPrimaryKey = function() {
  return this.primary_key;
};


/**
 * @return {number} element score.
 */
ydn.db.schema.fulltext.Score.prototype.getScore = function() {
  if (isNaN(this.score)) {
    this.score = this.compute();
  }
  return this.score;
};


/**
 * Token encounter in indexing string.
 * @param {number} count current word count.
 */
ydn.db.schema.fulltext.Score.prototype.encounter = function(count) {
  this.encounter_count_.push(count);
};


/**
 * Compute score base on word encounter.
 * @return {number} computed score.
 */
ydn.db.schema.fulltext.Score.prototype.compute = function() {
  var occboost = 0;
  for (var i = 0; i < this.encounter_count_.length; ++i) {
    occboost += (3.1415 - Math.log(1 + this.encounter_count_[i])) / 10;
  }
  var countboost = Math.abs(Math.log(1 + this.encounter_count_.length)) / 10;
  return 1 + occboost * 1.5 + countboost * 3;
};


/**
 * Rescale the score.
 * @param {number} scale scale value to multiply the score.
 */
ydn.db.schema.fulltext.Score.prototype.rescale = function(scale) {
  if (!isNaN(scale)) {
    this.score *= scale;
  }
};

ydn.db.schema.fulltext.Score.cmp = {
  lower_than: function(a,b) {
    return a.value < b.value;
  },
  equals: function(a,b) {
    return a.value == b.value;
  }
};


/**
 *
 * @param {ydn.db.schema.fulltext.Score} a
 * @param {ydn.db.schema.fulltext.Score} b
 * @return {ydn.db.schema.fulltext.Score}
 */
ydn.db.schema.fulltext.Score.mergeFn = function(a,b) {
  return new ydn.db.schema.fulltext.Score(a.value, a.score + b.score);
};


/**
 * @return {string}
 */
ydn.db.schema.fulltext.Score.prototype.getKey = function() {
  return this.key;
};


/**
 * @return {!Object}
 */
ydn.db.schema.fulltext.Score.prototype.toJson = function() {
  return {
    'storeName': this.store_name,
    'primaryKey': this.primary_key,
    'key': this.key,
    'keyPath': this.key_path,
    'score': this.getScore()
  };
};


/**
 * @param {Object} json
 * @return {!ydn.db.schema.fulltext.Score}
 */
ydn.db.schema.fulltext.Score.fromJson = function(json) {
  return new ydn.db.schema.fulltext.Score(json['key'], json['storeName'],
      json['primaryKey'], json['keyPath'], json['score']);
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.schema.fulltext.Score.prototype.toString = function() {
    return 'Score:' + this.key + '|' + this.value + '|' + this.score;
  };
}

