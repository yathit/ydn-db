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
 * @fileoverview Index entry.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */



/**
 * An object that associates a value and a numerical score
 * @param {string} keyword normalized value of original word.
 * @param {string} value original word.
 * @param {number} position source key path.
 * @param {string=} opt_store_name source store name.
 * @param {string=} opt_key_path source key path.
 * @param {IDBKey=} opt_p_key source primary key.
 * @param {number=} opt_score score.
 * @constructor
 * @implements {ydn.db.schema.fulltext.ScoreEntry}
 */
ydn.db.schema.fulltext.Entry = function(keyword, value, position,
    opt_store_name, opt_key_path, opt_p_key, opt_score) {
  /**
   * @final
   * @type {string}
   * @protected
   */
  this.keyword = keyword;
  /**
   * @final
   * @type {string}
   * @protected
   */
  this.value = value;
  /**
   * @final
   * @type {string|undefined}
   * @protected
   */
  this.store_name = opt_store_name;
  /**
   * Location of the keyword in the document or query string.
   * @final
   * @type {number}
   */
  this.position = position;
  /**
   * @final
   * @type {string|undefined}
   * @protected
   */
  this.key_path = opt_store_name;
  /**
   * @final
   * @type {IDBKey|undefined}
   * @protected
   */
  this.primary_key = opt_p_key;
  /**
   * @type {number}
   * @protected
   */
  this.score = goog.isDefAndNotNull(opt_score) ? opt_score : NaN;
  /**
   * This is computed lazily.
   * @see #getId
   * @type {number}
   * @private
   */
  this.id_ = NaN;
};


/**
 * @return {string} source store name.
 */
ydn.db.schema.fulltext.Entry.prototype.getKeyword = function() {
  return this.keyword;
};


/**
 * @return {string} source store name.
 */
ydn.db.schema.fulltext.Entry.prototype.getValue = function() {
  return this.value;
};


/**
 * @return {number} source store name.
 */
ydn.db.schema.fulltext.Entry.prototype.getScore = function() {
  return this.score;
};


/**
 * @return {string} source store name.
 */
ydn.db.schema.fulltext.Entry.prototype.getStoreName = function() {
  return /** @type {string} */ (this.store_name);
};


/**
 * @return {IDBKey} source primary key.
 */
ydn.db.schema.fulltext.Entry.prototype.getPrimaryKey = function() {
  return /** @type {IDBKey} */ (this.primary_key);
};


/**
 * @return {!Object} JSON to stored into the database.
 */
ydn.db.schema.fulltext.Entry.prototype.toJson = function() {
  return {
    'keyword': this.key,
    'value': this.value,
    'score': this.getScore(),
    'source': {
      'storeName': this.store_name,
      'primaryKey': this.primary_key,
      'keyPath': this.key_path,
      'position': this.position
    }
  };
};


/**
 * Compare by score, then by id.
 * Note: this result 0 only if the same entry is compared.
 * @param {fullproof.ScoreEntry} a entry a.
 * @param {fullproof.ScoreEntry} b entry b.
 * @return {number} return 1 if score of entry a is larger than that of b, -1
 * if score of entry b is larger than a, otherwise compare by id.
 */
fullproof.ScoreEntry.cmp = function(a, b) {
  var a_score = a.getScore();
  var b_score = b.getScore();
  return a_score > b_score ? 1 : b_score > a_score ? -1 :
      a.getId() > b.getId() ? 1 : a.getId() < b.getId() ? -1 : 0;
};


/**
 * Uniquely identify this entry.
 * @return {number} Entry identifier.
 */
fullproof.ScoreEntry.prototype.getId = function() {
  if (isNaN(this.id_)) {
    var st = this.store_name || '';
    var kp = this.key_path || '';
    var p = this.position || 0;
    this.id_ = goog.string.hashCode(st + kp + p + this.key);
  }
  return this.id_;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.schema.fulltext.Entry.prototype.toString = function() {
    return 'fulltext.Entry:' + this.key;
  };
}


/**
 * @param {Object} json
 * @return {!ydn.db.schema.fulltext.Entry}
 */
ydn.db.schema.fulltext.Entry.fromJson = function(json) {
  return new fullproof.ScoreEntry(json['keyword'], json['value'],
      json['position'], json['storeName'], json['keyPath'], json['primaryKey'],
      json['score']);
};

