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
 * @fileoverview Implements ydn.db.io.QueryService with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.algo.AbstractSolver');
goog.require('ydn.db.core.req.IDBCursor');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.crud.req.IndexedDb');
goog.require('ydn.error');
goog.require('ydn.json');



/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 * @extends {ydn.db.crud.req.IndexedDb}
 */
ydn.db.core.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.IndexedDb, ydn.db.crud.req.IndexedDb);


/**
 *
 * @define {boolean} turn on debug flag to dump object.
 */
ydn.db.core.req.IndexedDb.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.IndexedDb.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.req.IndexedDb');


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.keysByIterator = function(tx, tx_no, df,
    iter, limit, offset) {
  var arr = [];
  //var req = this.openQuery_(q, ydn.db.base.CursorMode.KEY_ONLY);
  var msg = tx_no + ' keysByIterator:' + iter;
  var me = this;
  this.logger.finest(msg);
  var cursor = iter.iterate(tx, tx_no, this);
  cursor.onFail = function(e) {
    me.logger.warning('error:' + msg);
    df(e, true);
  };
  var count = 0;
  var cued = false;
  /**
   * @param {IDBKey=} key
   */
  cursor.onNext = function(key) {
    if (goog.isDef(key)) {
      if (!cued && offset > 0) {
        cursor.advance(offset);
        cued = true;
        return;
      }
      count++;

      arr.push(key);
      if (!goog.isDef(limit) || count < limit) {
        cursor.advance(1);
      } else {
        cursor.exit();
        df(arr);
      }
    } else {
      cursor.exit();
      df(arr);
    }
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.listByIterator = function(tx, tx_no, df,
    iter, limit, offset) {
  var arr = [];
  //var req = this.openQuery_(q, ydn.db.base.CursorMode.READ_ONLY);
  var msg = tx_no + ' listByIterator' + iter;
  var me = this;
  this.logger.finest(msg);
  var cursor = iter.iterate(tx, tx_no, this);
  cursor.onFail = function(e) {
    cursor.exit();
    df(e, true);
  };
  var count = 0;
  var cued = false;
  /**
   * @param {IDBKey=} opt_key
   */
  cursor.onNext = function(opt_key) {
    if (goog.isDef(opt_key)) {
      var primary_key = iter.isIndexIterator() ?
          cursor.getPrimaryKey() : opt_key;
      var value = cursor.getValue();
      if (!cued && offset > 0) {
        cursor.advance(offset);
        cued = true;
        return;
      }
      count++;
      arr.push(iter.isKeyOnly() ? primary_key : value);
      if (!goog.isDef(limit) || count < limit) {
        cursor.continueEffectiveKey();
      } else {
        cursor.exit();
        df(arr);
      }
    } else {
      cursor.exit();
      df(arr);
    }
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.getCursor = function(tx, tx_no,
        store_name, index_name, keyRange, direction, key_only, key_query) {

  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store, 'store "' + store_name + '" not found.');
  if (goog.isDef(index_name)) {
    index_name = this.getIndexName(store, index_name);
  }

  return new ydn.db.core.req.IDBCursor(tx, tx_no, store_name, index_name,
      keyRange, direction, key_only, key_query);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.getStreamer = function(tx, tx_no,
    store_name, index_name) {
  return new ydn.db.Streamer(tx, store_name, index_name);
};
