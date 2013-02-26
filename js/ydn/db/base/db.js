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
 * @fileoverview Provide package variables.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db');
goog.require('ydn.db.con.IndexedDb');
goog.require('ydn.db.con.WebSql');
goog.require('ydn.db.utils');

/**
 *
 * @define {string}
 */
ydn.db.version = '0';

/**
 * Delete database. This will attempt to delete in all mechanisms.
 * @param {string} db_name name of database.
 * @param {string=} type delete only specific types.
 */
ydn.db.deleteDatabase = function(db_name, type) {

  // todo: deleteDatabase must return deferred object as per with w3c
  // http://www.w3.org/TR/IndexedDB/#widl-IDBFactory-deleteDatabase-IDBOpenDBRequest-DOMString-name

  // some IndexedDB API do not support deleting database.
  if (ydn.db.con.IndexedDb.isSupported() && (!type || type == ydn.db.con.IndexedDb.TYPE) &&
    ydn.db.con.IndexedDb.indexedDb &&
      ('deleteDatabase' in ydn.db.con.IndexedDb.indexedDb)) {
    ydn.db.con.IndexedDb.indexedDb.deleteDatabase(db_name);
  }
  if (ydn.db.con.WebSql.isSupported() && (!type || type == ydn.db.con.WebSql.TYPE)) {
    ydn.db.con.WebSql.deleteDatabase(db_name);
  }
  if (!type || type == ydn.db.con.LocalStorage.TYPE) {
    ydn.db.con.LocalStorage.deleteDatabase(db_name);
  }
  if (!type || type == ydn.db.con.SessionStorage.TYPE) {
    ydn.db.con.SessionStorage.deleteDatabase(db_name);
  }
};


/**
 * IDBFactory.cmp with fallback for websql.
 * @type {function(*, *): number} returns 1 if the first key is
 * greater than the second, -1 if the first is less than the second, and 0 if
 * the first is equal to the second.
 */
ydn.db.cmp = (ydn.db.con.IndexedDb.indexedDb && ydn.db.con.IndexedDb.indexedDb.cmp) ?
    goog.bind(ydn.db.con.IndexedDb.indexedDb.cmp,
      ydn.db.con.IndexedDb.indexedDb) :
  function (first, second) {
    var key1 = ydn.db.utils.encodeKey(first);
    var key2 = ydn.db.utils.encodeKey(second);
    return key1 > key2 ? 1 : (key1 == key2 ? 0 : -1);
  };


