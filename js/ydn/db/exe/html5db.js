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

goog.provide('ydn.db.exe.LocalStorage');
goog.provide('ydn.db.exe.SessionStorage');
goog.require('ydn.db.exe.MemoryStore');


/**
 * @extends {ydn.db.exe.MemoryStore}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.exe.LocalStorage = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.localStorage);
};
goog.inherits(ydn.db.exe.LocalStorage, ydn.db.exe.MemoryStore);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.exe.LocalStorage.isSupported = function() {
  return !!window.localStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.exe.LocalStorage.TYPE = 'localstorage';

/**
 * @return {string}
 */
ydn.db.exe.LocalStorage.prototype.type = function() {
  return ydn.db.exe.LocalStorage.TYPE;
};


/**
 * @extends {ydn.db.exe.MemoryStore}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.exe.SessionStorage = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.sessionStorage);
};
goog.inherits(ydn.db.exe.SessionStorage, ydn.db.exe.MemoryStore);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.exe.SessionStorage.isSupported = function() {
  return !!window.sessionStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.exe.SessionStorage.TYPE = 'sessionstorage';

/**
 * @return {string}
 */
ydn.db.exe.SessionStorage.prototype.type = function() {
  return ydn.db.exe.SessionStorage.TYPE;
};


