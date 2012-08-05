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
 * @param {string} table table name.
 * @constructor
 */
ydn.db.Query = function(table) {
  /**
   * @final
   * @type {string}
   */
  this.table = table;
  /**
   * @type {string}
   */
  this.value = '';
  /**
   * @type {ydn.db.Query.Op}
   */
  this.op = ydn.db.Query.Op.EQ;
  /**
   * @type {string}
   */
  this.field = '';
};


/**
 * Query operator
 * @enum {string}
 */
ydn.db.Query.Op = {
  EQ: 'eq',
  START_WITH: 'st'
};


/**
 *
 * @param {string} value
 * @param {string=} field
 * @return {ydn.db.Query}
 */
ydn.db.Query.prototype.get = function(value, field) {
  this.op = ydn.db.Query.Op.EQ;
  this.value = value;
  this.field = field || '';
  return this;
};


/**
 *
 * @param {string} table
 * @param {string} value
 * @param {string=} field
 * @return {ydn.db.Query}
 */
ydn.db.Query.get = function(table, value, field) {
  return (new ydn.db.Query(table)).get(value, field);
};


/**
 *
 * @param {string} value
 * @param {string=} field
 * @return {ydn.db.Query}
 */
ydn.db.Query.prototype.startWith = function(value, field) {
  this.op = ydn.db.Query.Op.START_WITH;
  this.value = value;
  this.field = field || '';
  return this;
};


/**
 * @param {string} table
 * @param {string} value
 * @param {string=} field
 * @return {ydn.db.Query}
 */
ydn.db.Query.startWith = function(table, value, field) {
  return (new ydn.db.Query(table)).startWith(value, field);
};
