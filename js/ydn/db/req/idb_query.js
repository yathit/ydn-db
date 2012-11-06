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
 * @fileoverview Query object to feed WebSQL iterator.
 *
 *
 */


goog.provide('ydn.db.req.IdbQuery');
goog.require('ydn.db.Query');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.error.ArgumentException');



/**
 * Create a SQL query object from a query object.
 *
 * This clone given query object and added iteration functions so that
 * query processor can mutation as part of query optimization processes.
 *
 * @param {string} store store name.
 * @param {ydn.db.Query.Direction=} direction cursor direction.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {ydn.db.KeyRange=}
  * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given.
 * @param {Function=} filter filter function.
 * @param {Function=} continued continued function.
 * @extends {ydn.db.Query}
 * @constructor
 */
ydn.db.req.IdbQuery = function(store, direction, index, keyRange, filter, continued) {

  goog.base(this, store, direction, index, keyRange);

  // set all null so that no surprise from inherit prototype
  this.initial = null;
  this.map = null;
  this.reduce = null;
  this.finalize = null;

  this.filter = filter || null;
  this.continued = continued || null;

};
goog.inherits(ydn.db.req.IdbQuery, ydn.db.Query);



/**
 * @inheritDoc
 */
ydn.db.req.IdbQuery.prototype.toJSON = function() {
  return {
    'store': this.store_name,
    'index': this.index,
    'key_range': this.keyRange ? ydn.db.KeyRange.toJSON(this.keyRange) : null,
    'direction': this.direction
  };
};


/**
 * @type {?function(): *}
 */
ydn.db.req.IdbQuery.prototype.initial = null;


/**
 * @type {?function(*): *}
 */
ydn.db.req.IdbQuery.prototype.map = null;

/**
 * Reduce is execute after map.
 * @type {?function(*, *, number): *}
 * function(previousValue, currentValue, index)
 */
ydn.db.req.IdbQuery.prototype.reduce = null;


/**
 * @type {?function(*): *}
 */
ydn.db.req.IdbQuery.prototype.finalize = null;



/**
 * @override
 */
ydn.db.req.IdbQuery.prototype.toString = function() {
  var idx = goog.isDef(this.index) ? ':' + this.index : '';
  return 'Cursor:' + this.store_name + idx;
};






/**
 * Process where instruction into filter iteration method.
 * @param {!ydn.db.Where} where where.
 */
ydn.db.req.IdbQuery.prototype.processWhereAsFilter = function(where) {

  var prev_filter = goog.functions.TRUE;
  if (goog.isFunction(this.filter)) {
    prev_filter = this.filter;
  }

  this.filter = function(obj) {
    var value = obj[where.field];
    var ok1 = true;
    if (goog.isDef(where.lower)) {
      ok1 = where.lowerOpen ? value < where.lower : value <= where.lower;
    }
    var ok2 = true;
    if (goog.isDef(where.upper)) {
      ok2 = where.upperOpen ? value > where.upper : value >= where.upper;
    }

    return prev_filter(obj) && ok1 && ok2;
  };

  //console.log([where, this.filter.toString()]);

};


