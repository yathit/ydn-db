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
 * @fileoverview Query.
 */


goog.provide('ydn.db.Query');



/**
 * @param {string} store table name.
 * @param {string=} opt_field field name.
 * @param {ydn.db.Query.Op=} opt_op field name.
 * @param {string=} opt_value field name.
 * @constructor
 */
ydn.db.Query = function(store, opt_field, opt_op, opt_value) {
  /**
   * @final
   * @type {string}
   */
  this.store = store;
  /**
   * @type {string|undefined}
   */
  this.value = opt_value;
  /**
   * @type {ydn.db.Query.Op}
   */
  this.op = opt_op || ydn.db.Query.Op.EQ;
  /**
   * @type {string|undefined}
   */
  this.field = opt_field;
};


/**
 * @inheritDoc
 */
ydn.db.Query.prototype.toJSON = function () {
  return {
    'store':this.store,
    'value':this.value,
    'op':this.op,
    'field':this.field
  }
};


/**
 *
 * @param {!Object} json
 * @return {!ydn.db.Query} query.
 */
ydn.db.Query.fromJSON = function(json) {
  var op = /** @type {ydn.db.Query.Op} */ (json['op']);
  return new ydn.db.Query(json['store'], json['field'], op, json['value']);
};


/**
 * Query operator
 * @enum {string}
 */
ydn.db.Query.Op = {
  EQ: 'eq',
  START_WITH: 'st'
};

