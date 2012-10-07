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


/**
 * Delete database. This will attempt in all mechanism.
 * @param {string} db_name name of database.
 */
ydn.db.deleteDatabase = function(db_name) {
  if ('deleteDatabase' in ydn.db.con.IndexedDb.indexedDb) {
    ydn.db.con.IndexedDb.indexedDb.deleteDatabase(db_name);
  }
  // WebSQL database cannot be deleted. TODO: clear
  // TODO: clear localStorage
};
