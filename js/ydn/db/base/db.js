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
goog.require('ydn.db.utils');
if (!ydn.db.base.NO_IDB) {
  goog.require('ydn.db.con.IndexedDb');
}
if (!ydn.db.base.NO_WEBSQL) {
  goog.require('ydn.db.con.WebSql');
}
if (!ydn.db.base.NO_SIMPLE) {
  goog.require('ydn.db.con.LocalStorage');
  goog.require('ydn.db.con.SessionStorage');
}


/**
 *
 * @define {string} version string.
 */
ydn.db.version = '0';


/**
 * Delete database. This will attempt to delete in all mechanisms.
 * @param {string} db_name name of database.
 * @param {string=} opt_type delete only specific types.
 */
ydn.db.deleteDatabase = function(db_name, opt_type) {

  // todo: deleteDatabase must return deferred object as per with w3c
  // http://www.w3.org/TR/IndexedDB/#widl-IDBFactory-deleteDatabase-IDBOpenDBRequest-DOMString-name

  // some IndexedDB API do not support deleting database.
  if (!ydn.db.base.NO_IDB && ydn.db.con.IndexedDb.isSupported() && (!opt_type ||
      opt_type == ydn.db.base.Mechanisms.IDB) &&
      ydn.db.con.IndexedDb.indexedDb &&
      ('deleteDatabase' in ydn.db.con.IndexedDb.indexedDb)) {
    ydn.db.con.IndexedDb.indexedDb.deleteDatabase(db_name);
  }
  if (!ydn.db.base.NO_WEBSQL && ydn.db.con.WebSql.isSupported() && (!opt_type ||
      opt_type == ydn.db.base.Mechanisms.WEBSQL)) {
    ydn.db.con.WebSql.deleteDatabase(db_name);
  }
  if (!ydn.db.base.NO_SIMPLE && (!opt_type ||
      opt_type == ydn.db.base.Mechanisms.LOCAL_STORAGE)) {
    ydn.db.con.LocalStorage.deleteDatabase(db_name);
  }
  if (!ydn.db.base.NO_SIMPLE && (!opt_type ||
      opt_type == ydn.db.base.Mechanisms.SESSION_STORAGE)) {
    ydn.db.con.SessionStorage.deleteDatabase(db_name);
  }
};


/**
 * IDBFactory.cmp with fallback for websql.
 * @type {function(*, *): number} returns 1 if the first key is
 * greater than the second, -1 if the first is less than the second, and 0 if
 * the first is equal to the second.
 */
ydn.db.cmp = (!ydn.db.base.NO_IDB && ydn.db.con.IndexedDb.indexedDb &&
    ydn.db.con.IndexedDb.indexedDb.cmp) ?
    goog.bind(ydn.db.con.IndexedDb.indexedDb.cmp,
        ydn.db.con.IndexedDb.indexedDb) : ydn.db.utils.cmp;



