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
 * @fileoverview Data store in memory.
 */

goog.provide('ydn.db.core.req.SimpleStore');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.core.req.SimpleCursor');
goog.require('ydn.db.crud.req.SimpleStore');



/**
 * @extends {ydn.db.crud.req.SimpleStore}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.core.req.SimpleStore = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.SimpleStore, ydn.db.crud.req.SimpleStore);


/**
 * @define {boolean} debug flag.
 */
ydn.db.core.req.SimpleStore.DEBUG = false;


/**
 * @param {ydn.db.base.QueryMethod} mth method.
 * @param {ydn.db.Request} rq request.
 * @param {!ydn.db.Iterator} iter  store name.
 * @param {number=} opt_limit limit.
 * @param {number=} opt_offset
 * @private
 */
ydn.db.core.req.SimpleStore.prototype.iterate_ = function(mth, rq,
    iter, opt_limit, opt_offset) {
  var tx = rq.getTx();
  var tx_no = rq.getLabel();
  var arr = [];
  //var req = this.openQuery_(q, ydn.db.base.CursorMode.READ_ONLY);
  var msg = tx_no + ' listByIterator' + iter;
  var me = this;
  this.logger.finest(msg);
  var cursor = this.getCursor(tx, tx_no, iter.getStoreName());
  iter.load(cursor);
  cursor.onFail = function(e) {
    cursor.exit();
    rq.setDbValue(e, true);
  };
  var count = 0;
  var cued = false;
  /**
   * @param {IDBKey=} opt_key
   */
  cursor.onNext = function(opt_key) {
    if (goog.isDefAndNotNull(opt_key)) {
      var primary_key = iter.isIndexIterator() ?
          cursor.getPrimaryKey() : opt_key;
      var value = cursor.getValue();
      if (!cued && opt_offset > 0) {
        cursor.advance(opt_offset);
        cued = true;
        return;
      }
      count++;
      arr.push(iter.isKeyIterator() ? primary_key : value);
      if (!goog.isDef(opt_limit) || count < opt_limit) {
        cursor.advance(1);
      } else {
        cursor.exit();
        var rs = ydn.db.base.QueryMethod.GET == mth ? arr[0] : arr;
        rq.setDbValue(rs);
      }
    } else {
      cursor.exit();
      var rs = ydn.db.base.QueryMethod.GET == mth ? arr[0] : arr;
      rq.setDbValue(rs);
    }
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.getCursor = function(tx, lbl,
                                                           store_name, mth) {
  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store, 'store "' + store_name + '" not found.');
  return new ydn.db.core.req.SimpleCursor(tx, lbl, store, mth);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.getStreamer =  function(tx, tx_no,
    store_name, index_name) {
  throw 'not yet';
};


