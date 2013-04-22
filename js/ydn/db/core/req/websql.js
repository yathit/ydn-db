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
 * @fileoverview WebSQL executor.
 *
 * @see http://www.w3.org/TR/webdatabase/
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.req.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db.core.req.CachedWebsqlCursor');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.core.req.WebsqlCursor');
goog.require('ydn.db.crud.req.WebSql');
goog.require('ydn.json');



/**
 * @extends {ydn.db.crud.req.WebSql}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.core.req.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.WebSql, ydn.db.crud.req.WebSql);


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.core.req.WebSql.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.WebSql.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.req.WebSql');


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.keysByIterator = function(tx, tx_no, df, iter,
                                                           limit, offset) {
  this.fetchIterator_(tx, tx_no, df, iter, ydn.db.schema.Store.QueryMethod.KEYS,
      limit, offset);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.listByIterator = function(tx, tx_no, df, q,
                                                           limit, offset) {

  this.fetchIterator_(tx, tx_no, df, q, ydn.db.schema.Store.QueryMethod.VALUES,
      limit, offset);

};


/**
 * @param {ydn.db.con.IDatabase.Transaction} tx tx.
 * @param {string} tx_no tx label.
 * @param {?function(*, boolean=)} df return key in deferred function.
 * @param {!ydn.db.Iterator} iter the query.
 * @param {ydn.db.schema.Store.QueryMethod} query_mth query method.
 * @param {number=} opt_limit override limit.
 * @param {number=} opt_offset offset.
 * @private
 */
ydn.db.core.req.WebSql.prototype.fetchIterator_ = function(tx, tx_no, df, iter,
    query_mth, opt_limit, opt_offset) {

  var arr = [];
  //var req = this.openQuery_(q, ydn.db.base.CursorMode.KEY_ONLY);
  var mth = query_mth ? ' keys' : ' values';
  var msg = tx_no + mth + 'ByIterator ' + iter;
  var me = this;
  this.logger.finest(msg);
  var cursor = iter.iterate(tx, tx_no, this, query_mth);
  cursor.onFail = function(e) {
    me.logger.warning('error:' + msg);
    cursor.exit();
    df(e, true);
  };
  var count = 0;
  var cued = false;
  /**
   * @param {IDBKey=} opt_key key.
   */
  cursor.onNext = function(opt_key) {
    if (goog.isDef(opt_key)) {
      var key = opt_key;
      var primary_key = cursor.getPrimaryKey();
      // console.log([key, primary_key]);
      var value = cursor.getValue();
      if (!cued && opt_offset > 0) {
        cursor.advance(opt_offset);
        cued = true;
        return;
      }
      count++;
      var out;
      if (query_mth == ydn.db.schema.Store.QueryMethod.KEYS) {
        out = key;
      } else {           // call by values() method
        if (iter.isIndexIterator() && iter.isKeyIterator()) {
          out = primary_key;
        } else {
          out = value;
        }
      }
      arr.push(out);
      if (!goog.isDef(opt_limit) || count < opt_limit) {
        cursor.continueEffectiveKey();
      } else {
        cursor.exit();
        me.logger.finest('success:' + msg);
        df(arr);
      }
    } else {
      cursor.exit();
      me.logger.finest('success:' + msg);
      df(arr);
    }
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.getCursor = function(tx, tx_no, store_name,
        index_name, keyRange, direction, key_only, key_query) {

  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store, 'store "' + store_name + '" not found.');
  if (goog.isDef(index_name)) {
    index_name = this.getIndexName(store, index_name);
  }

  return new ydn.db.core.req.WebsqlCursor(tx, tx_no, store, store_name,
      index_name, keyRange, direction, key_only, key_query);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.getStreamer = function(tx, tx_no,
    store_name, index_name) {
  throw 'not yet';
};


