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
 * @fileoverview HTML5 localStorage implemented as deferred async pattern.
 */

goog.provide('ydn.db.Html5Db');
goog.require('ydn.db.MemoryStore');


/**
 * @extends {ydn.db.MemoryStore}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.Html5Db = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.localStorage);
};
goog.inherits(ydn.db.Html5Db, ydn.db.MemoryStore);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.Html5Db.isSupported = function() {
  return !!window.localStorage;
};

