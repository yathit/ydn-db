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
 * Delete database. This will attempt to delete in all mechanisms.
 * @param {string} db_name name of database.
 */
ydn.db.deleteDatabase = function(db_name) {
  // some IndexedDB API do not support deleting database.
  if (ydn.db.con.IndexedDb.indexedDb &&
      ('deleteDatabase' in ydn.db.con.IndexedDb.indexedDb)) {
    ydn.db.con.IndexedDb.indexedDb.deleteDatabase(db_name);
  }
  ydn.db.con.WebSql.deleteDatabase(db_name);
  ydn.db.con.LocalStorage.deleteDatabase(db_name);
  ydn.db.con.SessionStorage.deleteDatabase(db_name);
};


/**
 *
 * @param first
 * @param second
 * @return {number}
 * @private
 */
ydn.db.cmp_ = function (first, second) {
  first = ydn.db.utils.encodeKey(first);
  second = ydn.db.utils.encodeKey(second);
  return first > second ? 1 : (first == second ? 0 : -1);
};


/**
 * IDBFactory.cmp
 * @type {function(*, *): number}
 */
ydn.db.cmp = function (first, second) {
  if (ydn.db.con.IndexedDb.indexedDb) {
    return ydn.db.con.IndexedDb.indexedDb['cmp'](first, second);
  } else {
    first = ydn.db.utils.encodeKey(first);
    second = ydn.db.utils.encodeKey(second);
    return first > second ? 1 : (first == second ? 0 : -1);
  }
};
