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

goog.provide('ydn.db.con.LocalStorage');
goog.provide('ydn.db.con.SessionStorage');
goog.require('ydn.db.con.SimpleStorage');


/**
 * @extends {ydn.db.con.SimpleStorage}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema=} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.con.LocalStorage = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.localStorage);
};
goog.inherits(ydn.db.con.LocalStorage, ydn.db.con.SimpleStorage);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.con.LocalStorage.isSupported = function() {
  return !!window.localStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.con.LocalStorage.TYPE = 'localstorage';

/**
 * @return {string}
 */
ydn.db.con.LocalStorage.prototype.type = function() {
  return ydn.db.con.LocalStorage.TYPE;
};


/**
 * @extends {ydn.db.con.SimpleStorage}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema=} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.con.SessionStorage = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.sessionStorage);
};
goog.inherits(ydn.db.con.SessionStorage, ydn.db.con.SimpleStorage);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.con.SessionStorage.isSupported = function() {
  return !!window.sessionStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.con.SessionStorage.TYPE = 'sessionstorage';

/**
 * @return {string}
 */
ydn.db.con.SessionStorage.prototype.type = function() {
  return ydn.db.con.SessionStorage.TYPE;
};


