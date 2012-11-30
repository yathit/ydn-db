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
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db.WebsqlCursor');
goog.require('ydn.json');
goog.require('ydn.db.index.req.IRequestExecutor');

/**
 * @extends {ydn.db.core.req.WebSql}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.index.req.IRequestExecutor}
 */
ydn.db.index.req.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.index.req.WebSql, ydn.db.core.req.WebSql);



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

/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.getByIterator = goog.abstractMethod;

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
//    if (ydn.db.core.req.IndexedDb.DEBUG) {
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
ydn.db.index.req.WebSql.prototype.listByIterator = function(df, q) {
  throw new ydn.error.NotImplementedException();
//  var arr = [];
//  //var mode = q.isKeyOnly() ? ydn.db.base.CursorMode.KEY_ONLY : ydn.db.base.CursorMode.READ_ONLY;
//  var req = this.fetchCursor(q);
//  req.onnext = function(key, value) {
//    if (goog.isDef(key)) {
//      arr.push(value);
//      req.forward(true);
//    } else {
//      req.onnext = null;
//      req.onerror = null;
//      df.callback(arr);
//    }
//  };
//  req.onerror = function(e) {
//    df.errback(e);
//  };
};



/**
 * @param {!goog.async.Deferred} df return object in deferred function.
 * @param {!ydn.db.Iterator} q the query.
 */
ydn.db.index.req.WebSql.prototype.fetchCursor = function(df, q) {

  var me = this;
  var cursor = this.planQuery(q);
  var is_reduce = goog.isFunction(cursor.reduce);
  var store = this.schema.getStore(cursor.getStoreName());

  var result = is_reduce ? undefined : [];

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {

    var idx = -1;
    // http://www.w3.org/TR/webdatabase/#database-query-results
    // Fetching the length might be expensive, and authors are thus encouraged
    // to avoid using it (or enumerating over the object, which implicitly uses
    // it) where possible.
    // for (var row, i = 0; row = results.rows.item(i); i++) {
    // Unfortunately, such enumerating don't work
    // RangeError: Item index is out of range in Chrome.
    // INDEX_SIZE_ERR: DOM Exception in Safari
    var n = results.rows.length;
    for (var i = 0; i < n; i++) {
      var row = results.rows.item(i);
      var value = {}; // ??
      if (goog.isDefAndNotNull(row)) {
        value = cursor.parseRow(row, store);
      }
      var to_continue = !goog.isFunction(cursor.continued) ||
        cursor.continued(value);
      if (!goog.isFunction(cursor.filter) || cursor.filter(value)) {
        idx++;

          if (goog.isFunction(cursor.map)) {
            value = cursor.map(value);
          }

          if (is_reduce) {
            result = cursor.reduce(result, value, i);
          } else {
            result.push(value);
          }
      }

      if (!to_continue) {
        break;
      }
    }
    if (goog.isFunction(cursor.finalize)) {
      df.callback(cursor.finalize(result));
    } else {
      df.callback(result);
    }
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.index.req.WebSql.DEBUG) {
      window.console.log([cursor, tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error.message);
    df.errback(error);
    return true; // roll back
  };

  if (goog.DEBUG) {
    this.logger.finest(this + ' SQL: ' + cursor.sql + ' PARAMS:' +
        ydn.json.stringify(cursor.params));
  }
  this.tx.executeSql(cursor.sql, cursor.params, callback, error_callback);

};


/**
 * @param {!goog.async.Deferred} df promise.
 * @param {!ydn.db.Sql} q query.
 */
ydn.db.index.req.WebSql.prototype.fetchQuery = function(df, q) {

  var cursor = q.toSqlQuery(this.schema);
  this.fetchCursor(df, cursor);
};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.getIndexKeysByKeys = goog.abstractMethod;

/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.getKeysByIndexKeyRange = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.getCursor = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.getStreamer = goog.abstractMethod;