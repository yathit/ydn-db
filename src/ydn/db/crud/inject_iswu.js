/**
 * @license Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");.
 */
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
 * @fileoverview Injdect request executor for IndexedDB, WebSql, WebStorage
 * and UserData.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.crud.Storage.iswu');
goog.require('ydn.db.tr.Storage.iswu');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.db.crud.req.IndexedDb');
goog.require('ydn.db.crud.req.SimpleStore');
goog.require('ydn.db.crud.req.WebSql');


/**
 * @param {string} db_name
 * @param {!ydn.db.schema.Database} schema
 * @param {string} type
 * @return {!ydn.db.crud.req.IRequestExecutor}
 */
ydn.db.crud.Storage.getExecutor = function(db_name, schema, type) {
  if (type == ydn.db.base.Mechanisms.IDB) {
    return new ydn.db.crud.req.IndexedDb(db_name, schema);
  } else if (type == ydn.db.base.Mechanisms.WEBSQL) {
    return new ydn.db.crud.req.WebSql(db_name, schema);
  } else if (type == ydn.db.base.Mechanisms.MEMORY_STORAGE ||
      type == ydn.db.base.Mechanisms.LOCAL_STORAGE ||
      type == ydn.db.base.Mechanisms.USER_DATA ||
      type == ydn.db.base.Mechanisms.SESSION_STORAGE) {
    return new ydn.db.crud.req.SimpleStore(db_name, schema);
  } else {
    throw new ydn.db.InternalError('No executor for ' + type);
  }
};
