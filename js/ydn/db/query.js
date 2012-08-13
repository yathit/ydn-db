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
 * @param {!ydn.db.Query.Config} select configuration in json format
 * @constructor
 */
ydn.db.Query = function(select) {
  /**
   * Store name.
   * @final
   * @type {string}
   */
  this.store = select['store'];
  /**
   * Right value for query operation.
   * @final
   * @type {string|undefined}
   */
  this.value = select['value'];
  /**
   * Query operator.
   * @final
   * @type {ydn.db.Query.Op}
   */
  this.op = select['op'] || ydn.db.Query.Op.EQ;
  /**
   * Left value for query operation.
   * @final
   * @type {string|undefined}
   */
  this.field = select['field'];
  /**
   * Maximum number of result.
   * @final
   * @type {(number|undefined)}
   */
  this.limit = select['limit'];
  /**
   * Result to be ordered by.
   * @final
   * @type {(string|undefined)}
   */
  this.order = select['order'];
  /**
   * Result to be start by.
   * @final
   * @type {(number|undefined)}
   */
  this.offset = select['offset'];
};


/**
 * This is similar to SQL WHERE clause.
 * @typedef {{
 *  op: ydn.db.Query.Op,
 *  field: (string|undefined),
 *  value: (string|undefined),
 * }}
 */
ydn.db.Query.Where;


/**
 * This is similar to SQL SELECT statement.
 * @typedef {{
 *  store: string,
 *  limit: (number|undefined),
 *  order: (string|undefined),
 *  offset: (number|undefined)
 *  }}
 */
ydn.db.Query.Config;


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
 * Query operator
 * @enum {string}
 */
ydn.db.Query.Op = {
  EQ: 'eq',
  START_WITH: 'st'
};

