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

goog.provide('ydn.db.index.req.WebSql');
goog.require('ydn.db.crud.req.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.json');
goog.require('ydn.db.index.req.IRequestExecutor');
goog.require('ydn.db.index.req.WebsqlCursor');
goog.require('ydn.db.index.req.CachedWebsqlCursor');

/**
 * @extends {ydn.db.crud.req.WebSql}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @param {string} scope
 * @constructor
 * @implements {ydn.db.index.req.IRequestExecutor}
 */
ydn.db.index.req.WebSql = function(dbname, schema, scope) {
  goog.base(this, dbname, schema, scope);
};
goog.inherits(ydn.db.index.req.WebSql, ydn.db.crud.req.WebSql);



/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.index.req.WebSql.DEBUG = false;



/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.index.req.WebSql.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.index.req.WebSql');


///**
// *
// * @inheritDoc
// */
//ydn.db.index.req.WebSql.prototype.open = function(df, cursor, next_callback, mode) {
//
//  var q = cursor instanceof ydn.db.sql.req.SqlQuery ? cursor :
//    this.planQuery(cursor);
//  this.openSqlQuery(df, q, next_callback, mode);
//};

//
//
///**
// * @param {goog.async.Deferred} df deferred to feed result.
// * @param {!ydn.db.Iterator} q query.
// * @param {?function(*): boolean} clear clear iteration function.
// * @param {?function(*): *} update update iteration function.
// * @param {?function(*): *} map map iteration function.
// * @param {?function(*, *, number): *} reduce reduce iteration function.
// * @param {*} initial initial value for reduce iteration function.
// * @param {?function(*): *} finalize finalize function.
// */
//ydn.db.index.req.WebSql.prototype.iterate = function(df, q, clear, update, map,
//                                                  reduce, initial, finalize) {
//  var me = this;
//  var is_reduce = goog.isFunction(reduce);
//
//  var mode = goog.isFunction(clear) || goog.isFunction(update) ?
//    ydn.db.base.CursorMode.READ_WRITE :
//    ydn.db.base.CursorMode.READ_ONLY;
//
//
//  var idx = -1; // iteration index
//  var results = [];
//  var previousResult = initial;
//
//  var request = this.open(q, function (cursor) {
//
//    var value = cursor.value();
//    idx++;
//    //console.log([idx, cursor.key(), value]);
//
//    var consumed = false;
//
//    if (goog.isFunction(clear)) {
//      var to_clear = clear(value);
//      if (to_clear === true) {
//        consumed = true;
//        cursor.clear();
//      }
//    }
//
//    if (!consumed && goog.isFunction(update)) {
//      var updated_value = update(value);
//      if (updated_value !== value) {
//        cursor.update(updated_value);
//      }
//    }
//
//    if (goog.isFunction(map)) {
//      value = map(value);
//    }
//
//    if (is_reduce) {
//      previousResult = reduce(value, previousResult, idx);
//    } else {
//      results.push(value);
//    }
//
//  }, mode);
//
//  request.addCallback(function() {
//    var result = is_reduce ? previousResult : results;
//    if (goog.isFunction(finalize)) {
//      result = finalize(result);
//    }
//    df.callback(result);
//  });
//
//  request.addErrback(function(event) {
//    if (ydn.db.crud.req.IndexedDb.DEBUG) {
//      window.console.log([q, event]);
//    }
//    df.errback(event);
//  });
//
//};
//



/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.keysByIterator = function(tx, tx_no, df, iter, limit, offset) {
  this.fetchIterator_(tx, tx_no, df, iter, true, limit, offset);
};



/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.listByIterator = function(tx, tx_no, df, q, limit, offset) {

  this.fetchIterator_(tx, tx_no, df, q, false, limit, offset);

};



/**
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {string} tx_no
 * @param {?function(*, boolean=)} df return key in deferred function.
 * @param {!ydn.db.Iterator} iter the query.
 * @param {boolean} keys_method 'keys' or 'list' method.
 * @param {number=} limit override limit.
 * @param {number=} offset
 * @private
 */
ydn.db.index.req.WebSql.prototype.fetchIterator_ = function(tx, tx_no, df, iter,
     keys_method, limit, offset) {

  var arr = [];
  //var req = this.openQuery_(q, ydn.db.base.CursorMode.KEY_ONLY);
  var mth = keys_method ? ' keys' : ' values';
  var msg = 'TX' + tx_no + mth + 'ByIterator ' + iter;
  var me = this;
  this.logger.finest(msg);
  var cursor = iter.iterate(tx, tx_no, this);
  cursor.onError = function(e) {
    me.logger.warning('error:' + msg);
    cursor.exit();
    df(e, true);
  };
  var count = 0;
  var cued = false;
  /**
   * @param {IDBKey=} key
   */
  cursor.onNext = function(key) {
    if (goog.isDef(key)) {
      var primary_key = cursor.getPrimaryKey();
      var value = cursor.getValue();
      if (!cued && offset > 0) {
        cursor.advance(offset);
        cued = true;
        return;
      }
      count++;
      var out;
      if (keys_method) { // call by keys() method
        if (iter.isIndexIterator()) {
          out = key;
        } else {
          out = primary_key;
        }
      } else {           // call by values() method
        if (iter.isKeyOnly()) {
          out = primary_key;
        } else {
          out = value;
        }
      }
      arr.push(out);
      if (!goog.isDef(limit) || count < limit) {
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
ydn.db.index.req.WebSql.prototype.getCursor = function (tx, tx_no, store_name,
        index_name, keyRange, direction, key_only) {

  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store);

  return new ydn.db.index.req.WebsqlCursor(tx, tx_no,
    store, store_name, index_name, keyRange, direction, key_only);
};




/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.getStreamer = goog.abstractMethod;

