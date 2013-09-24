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
 * @fileoverview Cursor range iterator iterates cursor of an index or an
 * object store.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.MultiIterator');
goog.require('goog.debug.Logger');
goog.require('goog.functions');
goog.require('ydn.db.Cursor');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.db.base');
goog.require('ydn.db.core.EquiJoin');
goog.require('ydn.db.core.req.ICursor');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Create an iterator object.
 * @param {!string} store store name.
 * @param {string=} opt_index store field, where key query is preformed.
 * @param {(KeyRangeJson|ydn.db.KeyRange|IDBKeyRange)=} opt_key_range key range.
 * @param {boolean=} opt_reverse reverse.
 * @param {boolean=} opt_unique unique.
 * @param {boolean=} opt_key_only true for key only iterator. Default value is
 * true if index is specified, false if not defined.
 * @param {(!Array.<string>|string)=} opt_index_key_path index key path. If
 * key path is specified, key path is used to lookup the index instead of
 * index name.
 * @constructor
 * @struct
 * @extends {ydn.db.Iterator}
 */
ydn.db.MultiIterator = function(store, opt_index, opt_key_range, opt_reverse,
                           opt_unique, opt_key_only, opt_index_key_path) {
  goog.base(this, store, opt_index, opt_key_range, opt_reverse,
      opt_unique, opt_key_only, opt_index_key_path);

};
goog.inherits(ydn.db.MultiIterator, ydn.db.Iterator);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.MultiIterator.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.MultiIterator');


/**
 *
 * @return {number} number of record iterated.
 */
ydn.db.MultiIterator.prototype.count = function() {
  return this.cursor_ ? this.cursor_.getCount() : NaN;
};


/**
 * Create a new iterator with new ordering.
 * @param {string} field_name field name to order.
 * @param {IDBKey} value field value.
 * @return {!ydn.db.MultiIterator} newly created iterator applying given restriction.
 */
ydn.db.MultiIterator.prototype.order = function(field_name, value) {
  goog.asserts.assertString(field_name, 'field name in string require but, "' +
      field_name + '" of type ' + typeof field_name + ' found.');
  goog.asserts.assert(ydn.db.Key.isValidKey(value), 'key value "' +
      ydn.json.toShortString(value) + '" is invalid');
  var key_range;
  var base = [value];
  if (this.key_range_) {
    var lower = goog.isDefAndNotNull(this.key_range_.lower) ?
        base.concat(this.key_range_.lower) : base;
    var upper = goog.isDefAndNotNull(this.key_range_.upper) ?
        base.concat(this.key_range_.upper) : base;
    key_range = new ydn.db.KeyRange(lower, upper,
        !!this.key_range_.lowerOpen, !!this.key_range_.upperOpen);
  } else {
    if (this.is_index_iterator_) {
      key_range = ydn.db.KeyRange.starts(base);
    } else {
      key_range = ydn.db.KeyRange.only(value);
    }
  }
  var index_name;
  var index_key_path;
  if (this.index_key_path_) {
    index_key_path = [field_name].concat(this.index_key_path_);
  } else if (this.is_index_iterator_) {
    index_key_path = [field_name].concat(this.index_name_);
  } else {
    index_name = field_name;
  }

  return new ydn.db.MultiIterator(this.store_name_, index_name, key_range,
      this.isReversed(), this.isUnique(), this.is_key_iterator_,
      index_key_path);
};
