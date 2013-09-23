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
 * @fileoverview Interface for index base request.
 *
 */


goog.provide('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.Streamer');
goog.require('ydn.db.core.req.AbstractCursor');
goog.require('ydn.db.crud.req.IRequestExecutor');



/**
 * @interface
 * @extends {ydn.db.crud.req.IRequestExecutor}
 */
ydn.db.core.req.IRequestExecutor = function() {};


/**
 * List record in a store.
 * @param {ydn.db.Request} req request.
 * @param {!ydn.db.Iterator} store_name  store name.
 * @param {number=} opt_limit limit.
 */
ydn.db.core.req.IRequestExecutor.prototype.keysByIterator =
    goog.abstractMethod;


/**
 * List record in a store.
 * @param {ydn.db.Request} req request.
 * @param {!ydn.db.Iterator} iter  store name.
 */
ydn.db.core.req.IRequestExecutor.prototype.getByIterator =
    goog.abstractMethod;


/**
 * List record in a store.
 * @param {ydn.db.Request} req request.
 * @param {!ydn.db.Iterator} iter  store name.
 * @param {number=} opt_limit limit.
 */
ydn.db.core.req.IRequestExecutor.prototype.listByIterator =
    goog.abstractMethod;


/**
 * @param {ydn.db.con.IDatabase.Transaction} tx
 * @param {string} tx_no transaction number.
 * @param {string} store_name the store name to open.
 * @param {string|!Array.<string>|undefined} index_name index name or index
 * key path.
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec.
 * @param {boolean} key_only mode.
 * @param {ydn.db.schema.Store.QueryMethod} query query method.
 * @return {!ydn.db.core.req.AbstractCursor} cursor.
 */
ydn.db.core.req.IRequestExecutor.prototype.getCursor = goog.abstractMethod;


/**
 * @param {ydn.db.con.IDatabase.Transaction} tx
 * @param {string} tx_no transaction number.
 * @param {string} store_name
 * @param {string=} opt_index_name
 * @return {!ydn.db.Streamer}
 */
ydn.db.core.req.IRequestExecutor.prototype.getStreamer = goog.abstractMethod;

