// Copyright 2016 YDN Authors. All Rights Reserved.
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
 * @fileoverview Cursor walker for multi-dimension on compound index.
 *
 * Support N-dimensional queries on indexes.
 *
 * https://gist.github.com/inexorabletash/704e9688f99ac12dd336
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.algo.CompoundIndexElementWalker');



/**
 * Cursor walker for multi-dimension on compound index supporting n-dimensional query on single compound index.
 * @param {Array<IDBKey>} lower
 * @param {Array<IDBKey>=} upper
 * @param {Array<boolean>=} lowerOpen
 * @param {Array<boolean>=} upperOpen
 * @constructor
 */
ydn.db.algo.CompoundIndexElementWalker = function(lower, upper, lowerOpen, upperOpen) {
  /**
   * @final
   * @type {Array<IDBKey>}
   * @private
   */
  this.lower_ = lower || [];
  /**
   * @final
   * @type {Array<IDBKey>}
   * @private
   */
  this.upper_ = upper || [];
  /**
   * @final
   * @type {Array<boolean>}
   * @private
   */
  this.lowerOpen_ = lowerOpen || [];
  /**
   * @final
   * @type {Array<boolean>}
   * @private
   */
  this.upperOpen_ = upperOpen || [];
};


/**
 * Return a "successor" key.
 * @param {IDBKey} key
 * @return {IDBKey}
 */
ydn.db.algo.CompoundIndexElementWalker.successor = function(key) {
  switch (typeof key) {
    case 'number':
      if (key === -Infinity) return Number.MIN_VALUE;
      if (key === Infinity) return new Date(-8640000000000000);
      var EPSILON = 2.220460492503130808472633361816E-16;
      return key + EPSILON;
    case 'string':
      return key + '\x00';
    default:
      throw TypeError('Unsupported key type: ' + key);
  }
};


/**
 * @inheritDoc
 */
ydn.db.algo.CompoundIndexElementWalker.prototype.solver = function(keys, values) {
  //var min = query.map(function(dim) { return dim[0]; });
  //var max = query.map(function(dim) { return dim[1]; });
  //index.openCursor(IDBKeyRange.bound(min, max)).onsuccess = function(e) {
  //  var cursor = e.target.result;
  //  if (!cursor) {
  //    completeCallback();
  //    return;
  //  }
  //
  //  for (var i = 1; i < cursor.key.length; ++i) {
  //    var key_tail = cursor.key.slice(i);
  //
  //    var min_tail = min.slice(i);
  //    if (indexedDB.cmp(key_tail, min_tail) < 0) {
  //      cursor.continue(cursor.key.slice(0, i).concat(min_tail));
  //      return;
  //    }
  //
  //    var max_tail = max.slice(i);
  //    if (indexedDB.cmp(key_tail, max_tail) > 0) {
  //      cursor.continue(cursor.key.slice(0, i)
  //          .concat([successor(cursor.key[i])])
  //          .concat(min.slice(i + 1)));
  //      return;
  //    }
  //  }
  //  valueCallback(cursor.value);
  //  cursor.continue();
  //};
};




