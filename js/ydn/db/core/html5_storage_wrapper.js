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

goog.provide('ydn.db.LocalStorageWrapper');
goog.provide('ydn.db.SessionStorageWrapper');
goog.require('ydn.db.MemoryService');


/**
 * @extends {ydn.db.MemoryService}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.LocalStorageWrapper = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.localStorage);
};
goog.inherits(ydn.db.LocalStorageWrapper, ydn.db.MemoryService);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.LocalStorageWrapper.isSupported = function() {
  return !!window.localStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.LocalStorageWrapper.TYPE = 'localstorage';

/**
 * @return {string}
 */
ydn.db.LocalStorageWrapper.prototype.type = function() {
  return ydn.db.LocalStorageWrapper.TYPE;
};


/**
 * @extends {ydn.db.MemoryService}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema} schemas table schema contain table
 * name and keyPath.
 * @constructor
 */
ydn.db.SessionStorageWrapper = function(dbname, schemas) {
  goog.base(this, dbname, schemas, window.sessionStorage);
};
goog.inherits(ydn.db.SessionStorageWrapper, ydn.db.MemoryService);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.SessionStorageWrapper.isSupported = function() {
  return !!window.sessionStorage;
};


/**
 * @const
 * @type {string}
 */
ydn.db.SessionStorageWrapper.TYPE = 'sessionstorage';

/**
 * @return {string}
 */
ydn.db.SessionStorageWrapper.prototype.type = function() {
  return ydn.db.SessionStorageWrapper.TYPE;
};


