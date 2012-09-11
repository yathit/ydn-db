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

goog.provide('ydn.db.tr.LocalStorage');
goog.provide('ydn.db.tr.SessionStorage');
goog.require('ydn.db.tr.SimpleStorage');


/**
 * @extends {ydn.db.tr.SimpleStorage}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.tr.LocalStorage = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.localStorage);
};
goog.inherits(ydn.db.tr.LocalStorage, ydn.db.tr.SimpleStorage);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.tr.LocalStorage.isSupported = function() {
  return !!window.localStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.tr.LocalStorage.TYPE = 'localstorage';

/**
 * @return {string}
 */
ydn.db.tr.LocalStorage.prototype.type = function() {
  return ydn.db.tr.LocalStorage.TYPE;
};


/**
 * @extends {ydn.db.tr.SimpleStorage}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.tr.SessionStorage = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.sessionStorage);
};
goog.inherits(ydn.db.tr.SessionStorage, ydn.db.tr.SimpleStorage);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.tr.SessionStorage.isSupported = function() {
  return !!window.sessionStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.tr.SessionStorage.TYPE = 'sessionstorage';

/**
 * @return {string}
 */
ydn.db.tr.SessionStorage.prototype.type = function() {
  return ydn.db.tr.SessionStorage.TYPE;
};


