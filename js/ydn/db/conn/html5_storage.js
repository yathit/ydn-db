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

goog.provide('ydn.db.conn.LocalStorage');
goog.provide('ydn.db.conn.SessionStorage');
goog.require('ydn.db.conn.SimpleStorage');


/**
 * @extends {ydn.db.conn.SimpleStorage}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema=} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.conn.LocalStorage = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.localStorage);
};
goog.inherits(ydn.db.conn.LocalStorage, ydn.db.conn.SimpleStorage);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.conn.LocalStorage.isSupported = function() {
  return !!window.localStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.conn.LocalStorage.TYPE = 'localstorage';

/**
 * @return {string}
 */
ydn.db.conn.LocalStorage.prototype.type = function() {
  return ydn.db.conn.LocalStorage.TYPE;
};


/**
 * @extends {ydn.db.conn.SimpleStorage}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema=} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.conn.SessionStorage = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.sessionStorage);
};
goog.inherits(ydn.db.conn.SessionStorage, ydn.db.conn.SimpleStorage);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.conn.SessionStorage.isSupported = function() {
  return !!window.sessionStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.conn.SessionStorage.TYPE = 'sessionstorage';

/**
 * @return {string}
 */
ydn.db.conn.SessionStorage.prototype.type = function() {
  return ydn.db.conn.SessionStorage.TYPE;
};


