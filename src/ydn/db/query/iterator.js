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
 * @fileoverview Query Iterator.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.query.Iterator');
goog.require('ydn.db.Iterator');



/**
 * Create an Query Iterator.
 * @param {ydn.db.schema.Store} store store name.
 * @param {ydn.db.KeyRange=} opt_key_range key range.
 * @param {boolean=} opt_reverse reverse.
 * @param {boolean=} opt_unique unique.
 * @constructor
 * @struct
 */
ydn.db.query.Iterator = function(store, opt_key_range, opt_reverse,
                                 opt_unique) {
  /**
   * @protected
   * @type {ydn.db.schema.Store}
   */
  this.store = store;
  /**
   * @protected
   * @type {ydn.db.KeyRange}
   */
  this.key_range = opt_key_range || null;
  /**
   * @type {boolean}
   */
  this.is_reverse = !!opt_reverse;
  /**
   * @type {boolean}
   */
  this.is_unique = !!opt_unique;
  /**
   * @protected
   * @type {Array.<string>}
   */
  this.prefix = [];
  /**
   * Postfix or order.
   * @protected
   * @type {Array.<string>}
   */
  this.postfix = [];
  /**
   * @private
   * @type {ydn.db.schema.Index|undefined}
   */
  this.index_ = undefined;
};


/**
 * Set key path prefix.
 * @param {Array.<string>} prefix
 * @return {string?} error message return, if require index not exist.
 */
ydn.db.query.Iterator.prototype.setPrefix = function(prefix) {
  var index_key_path = prefix.concat(this.postfix);
  var index = this.store.getIndexByKeyPath(index_key_path);
  if (!index && this.postfix[this.postfix.length - 1] == this.store.getKeyPath()) {
    // todo: for array keyPath
    index = this.store.getIndexByKeyPath(
        index_key_path.slice(0, index_key_path.length - 1));
  }
  if (!index) {
    return 'require index "' + index_key_path.join(', ') + '" missing in ' +
        'store ' + this.store.getName();
  }
  this.prefix = prefix;
  this.index_ = index;
  return null; // ok
};


/**
 * Set key path prefix or ordering.
 * @param {Array.<string>} postfix
 * @return {string?} error message return, if require index not exist.
 */
ydn.db.query.Iterator.prototype.setOrder = function(postfix) {
  var index_key_path = this.prefix.concat(postfix);
  var key_path = index_key_path.length == 1 ? index_key_path[0] :
      index_key_path;
  var index = this.store.getIndexByKeyPath(key_path);
  var err_msg = 'require index "' + index_key_path.join(', ') + '" missing in ' +
      'store ' + this.store.getName();
  if (!index) {
    if (postfix[postfix.length - 1] == this.store.getKeyPath()) {
      // todo: for array keyPath
      index = this.store.getIndexByKeyPath(
          index_key_path.slice(0, index_key_path.length - 1));
      if (index_key_path.length != 1) {
        return err_msg;
      } // else, OK. it is just primary key path
    } else {
      return err_msg;
    }
  }
  this.postfix = postfix;
  this.index_ = index;
  return null;
};


/**
 * Get iterable iterator.
 * @param {boolean=} opt_value_iterator if true value itrator is return.
 * @return {!ydn.db.Iterator} iterator for this.
 */
ydn.db.query.Iterator.prototype.getIterator = function(opt_value_iterator) {
  var index_name = this.index_ ? this.index_.getName() : undefined;
  var iter = new ydn.db.Iterator(this.store.getName(), index_name,
      this.key_range, this.is_reverse, this.is_unique, !!opt_value_iterator);
  iter.prefix_index = this.prefix.length;
  return iter;
};


/**
 * @return {string}
 */
ydn.db.query.Iterator.prototype.getStoreName = function() {
  return this.store.getName();
};


/**
 * @return {boolean}
 */
ydn.db.query.Iterator.prototype.hasPrefix = function() {
  return this.prefix.length > 0;
};


/**
 * Clone this.
 * @return {!ydn.db.query.Iterator}
 */
ydn.db.query.Iterator.prototype.clone = function() {
  var iter = new ydn.db.query.Iterator(this.store, this.key_range, this.is_reverse, this.is_unique);
  iter.postfix = this.postfix.slice();
  iter.prefix = this.prefix.slice();
  iter.index_ = this.index_;
  return iter;
};


/**
 * @return {ydn.db.KeyRange}
 */
ydn.db.query.Iterator.prototype.getKeyRange = function() {
  return this.key_range;
};


/**
 * @return {string|undefined}
 */
ydn.db.query.Iterator.prototype.getIndexName = function() {
  return this.index_ ? this.index_.getName() : undefined;
};


/**
 * @return {!ydn.db.query.Iterator}
 */
ydn.db.query.Iterator.prototype.reverse = function() {
  var iter = this.clone();
  iter.is_reverse = !this.is_reverse;
  return iter;
};


/**
 * @param {boolean} val unique value.
 * @return {!ydn.db.query.Iterator}
 */
ydn.db.query.Iterator.prototype.unique = function(val) {
  var iter = this.clone();
  iter.is_unique = !!val;
  return iter;
};


/**
 * @return {boolean}
 */
ydn.db.query.Iterator.prototype.isUnique = function() {
  return this.is_unique;
};


/**
 * @return {boolean}
 */
ydn.db.query.Iterator.prototype.isReverse = function() {
  return this.is_reverse;
};


/**
 * @return {boolean}
 */
ydn.db.query.Iterator.prototype.hasIndex = function() {
  return !!this.index_;
};


/**
 * Add where clause condition.
 * @param {string} index_name index name.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {string?} return error message.
 */
ydn.db.query.Iterator.prototype.where = function(index_name, op, value, opt_op2,
    opt_value2) {
  if (this.prefix.length > 0) {
    return 'cannot use where clause after prefix';
  }
  if (this.postfix.length > 0) {
    return 'cannot use where clause after postfix';
  }
  var key_range = ydn.db.KeyRange.where(op, value, opt_op2, opt_value2);
  if (this.index_) {
    goog.asserts.assert(this.index_.getName() == index_name,
        'different index name cannot be used for where clause');

    if (this.key_range) {
      this.key_range = this.key_range.and(key_range);
    } else {
      this.key_range = key_range;
    }
  } else {
    this.index_ = this.store.getIndex(index_name);
    goog.asserts.assert(this.index_, 'Index "' + index_name + '" not found in ' +
        this.store.getName());
    this.key_range = key_range;
  }
  return null;
};



