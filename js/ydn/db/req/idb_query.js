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
goog.require('ydn.db.req.IterableQuery');
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
 * @param {ydn.db.Iterator.Direction=} direction cursor direction.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {ydn.db.KeyRange=}
  * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given.
 * @param {Function=} filter filter function.
 * @param {Function=} continued continued function.
 * @extends {ydn.db.req.IterableQuery}
 * @constructor
 */
ydn.db.req.IdbQuery = function(store, direction, index, keyRange, filter, continued) {

  goog.base(this, store, direction, index, keyRange, filter, continued);


};
goog.inherits(ydn.db.req.IdbQuery, ydn.db.req.IterableQuery);


/**
 * @enum {string}
 */
ydn.db.req.IdbQuery.Methods = {
  OPEN: 'op',
  COUNT: 'cn'
};


/**
 *
 * @type {ydn.db.req.IdbQuery.Methods}
 */
ydn.db.req.IdbQuery.prototype.method = ydn.db.req.IdbQuery.Methods.OPEN;




