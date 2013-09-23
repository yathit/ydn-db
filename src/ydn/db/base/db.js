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


/**
 *
 * @define {string} version string.
 */
ydn.db.version = '0';


/**
 * IDBFactory.cmp with fallback for websql.
 * @type {function(*, *): number} returns 1 if the first key is
 * greater than the second, -1 if the first is less than the second, and 0 if
 * the first is equal to the second.
 */
ydn.db.cmp = (!ydn.db.base.NO_IDB && ydn.db.base.indexedDb &&
    ydn.db.base.indexedDb.cmp) ?
    goog.bind(ydn.db.base.indexedDb.cmp,
        ydn.db.base.indexedDb) : ydn.db.utils.cmp;


