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
goog.require('ydn.db.index.req.CachedWebsqlCursor');

/**
 * @extends {ydn.db.core.req.WebSql}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @param {string} scope
 * @constructor
 * @implements {ydn.db.index.req.IRequestExecutor}
 */
ydn.db.index.req.WebSql = function(dbname, schema, scope) {
  goog.base(this, dbname, schema, scope);
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
ydn.db.index.req.WebSql.prototype.getByIterator = function(tx, tx_no, df, q) {

  /**
   * @param {*} results
   * @param {boolean=} is_error
   */
  var qdf = function (results, is_error) {
    if (is_error) {
      df(results, true);
    } else {
      if (goog.isArray(results)) {
        df(results[0]);
      } else {
        df(undefined);
      }
    }
  };

  this.fetchIterator_(tx, tx_no, qdf, q, false, 1);

};

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
 * @param {number} tx_no
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
    iter.exit();
    cursor.dispose();
    df(e, true);
  };
  var count = 0;
  var cued = false;
  cursor.onNext = function(primary_key, key, value) {
    if (goog.isDef(primary_key)) {
      if (!cued && offset > 0) {
        cursor.advance(offset);
        cued = true;
        return;
      }
      count++;
      var out = keys_method ?
        cursor.isIndexCursor() ?
          key : primary_key :
        value;
      arr.push(out);
      if (!goog.isDef(limit) || count < limit) {
        cursor.continueEffectiveKey();
      } else {
        iter.exit();
        cursor.dispose();
        me.logger.finest('success:' + msg);
        df(arr);
      }
    } else {
      iter.exit();
      cursor.dispose();
      me.logger.finest('success:' + msg);
      df(arr);
    }
  };
};

//
//
///**
// * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
// * @param {number} tx_no
// * @param {?function(*, boolean=)} df return key in deferred function.
// * @param {!ydn.db.Iterator} q the query.
// * @param {boolean} keys_method 'keys' or 'list' method.
// * @param {number=} limit override limit.
// * @param {number=} offset
// * @private
// */
//ydn.db.index.req.WebSql.prototype.fetchIterator_ = function(tx, tx_no, df, q, keys_method, limit, offset) {
//
//  var me = this;
//  var msg = 'fetchIterator:' + q;
//  this.logger.finest(msg);
//
//  var store = this.schema.getStore(q.getStoreName());
//
//  var idx_name = q.getIndexName();
//
//  var index = goog.isDef(idx_name) ? store.getIndex(idx_name) : null;
//
//  var key_column = index ? index.getSQLIndexColumnName() :
//    store.getSQLKeyColumnName();
//  var q_key_column = goog.string.quote(key_column);
//  var q_primary_column = store.getSQLKeyColumnNameQuoted();
//  var type = index ? index.getType() : store.getType();
//  var is_multi_entry = !!index && index.isMultiEntry();
//
//  var select = 'SELECT';
//
//  var fields = '*';
//
//  if (keys_method) {
//    // keys method
//    fields = q_key_column;
//    if (q.isIndexIterator()) {
//      fields += ', ' + q_primary_column;
//    }
//  } else {
//    // list method
//    if (q.isIndexIterator()) {
//      if (q.isKeyOnly()) {
//        fields = q_primary_column;
//      }
//    } else if (q.isKeyOnly()) {
//      fields = q_primary_column;
//    }
//  }
//
//  var from = fields + ' FROM ' + store.getQuotedName();
//
//  var where_clause = '';
//  var wheres = [];
//  var params = [];
//  var key_range = q.getIDBKeyRange();
//  var key = q.getEffectiveKey();
//  var p_key = q.getPrimaryKey();
//  if (key_range) {
//    if (goog.isDefAndNotNull(key)) {
//      key_range = ydn.db.IDBKeyRange.bound(key, true,
//        key_range.upper, key_range.upperOpen);
//      ydn.db.KeyRange.toSql(q_key_column, type, is_multi_entry,
//        key_range, wheres, params);
//      key_range = ydn.db.IDBKeyRange.lowerBound(p_key, false);
//      ydn.db.KeyRange.toSql(q_primary_column, store.getType(), false,
//        key_range, wheres, params);
//    }  else {
//      ydn.db.KeyRange.toSql(q_key_column, type, is_multi_entry,
//        key_range, wheres, params);
//    }
//
//  } else if (goog.isDefAndNotNull(key)) {
//    key_range = ydn.db.IDBKeyRange.lowerBound(key, true);
//    ydn.db.KeyRange.toSql(q_key_column, type, is_multi_entry,
//      key_range, wheres, params);
//    key_range = ydn.db.IDBKeyRange.lowerBound(p_key, false);
//    ydn.db.KeyRange.toSql(q_primary_column, store.getType(), false,
//      key_range, wheres, params);
//  }
//
//
//  if (wheres.length > 0) {
//    where_clause = 'WHERE ' + wheres.join(' AND ');
//  }
//
//
//  // Note: IndexedDB key range result are always ordered.
//  var dir = 'ASC';
//  if (q.isReversed()) {
//    dir = 'DESC';
//  }
//
//  var order = 'ORDER BY ' + q_key_column + ' ' + dir;
//  if (q.isIndexIterator()) {
//    order += ', ' + q_primary_column + ' ' + dir;
//  }
//
//  var limit_offset = '';
//
//  if (goog.isDef(limit)) {
//    limit_offset = ' LIMIT ' + limit;
//  }
//  if (goog.isDef(offset)) {
//    limit_offset += ' OFFSET ' + offset;
//  }
//
//  var group_by =  '';
//
//  var sql = [select, from, where_clause, group_by, order, limit_offset].join(' ');
//
//  var row_parser;
//  if (keys_method || q.isKeyOnly()) {
//    row_parser = function(row) {
//      var value =  ydn.object.takeFirst(row);
//      return ydn.db.schema.Index.sql2js(value, type, is_multi_entry);
//    }
//  } else {
//    row_parser = function(row) {
//      return ydn.db.core.req.WebSql.parseRow(row, store);
//    }
//  }
//
//  /**
//   * @param {SQLTransaction} transaction transaction.
//   * @param {SQLResultSet} results results.
//   */
//  var callback = function (transaction, results) {
//    if (ydn.db.index.req.WebSql.DEBUG) {
//      window.console.log([q, results]);
//    }
//    var result = [];
//    // http://www.w3.org/TR/webdatabase/#database-query-results
//    // Fetching the length might be expensive, and authors are thus encouraged
//    // to avoid using it (or enumerating over the object, which implicitly uses
//    // it) where possible.
//    // for (var row, i = 0; row = results.rows.item(i); i++) {
//    // Unfortunately, such enumerating don't work
//    // RangeError: Item index is out of range in Chrome.
//    // INDEX_SIZE_ERR: DOM Exception in Safari
//    var n = results.rows.length;
//    for (var i = 0; i < n; i++) {
//      var row = results.rows.item(i);
//      // console.log(row);
//      result.push(row_parser(row));
//    }
//    me.logger.finest('success ' + sql);
//    df(result);
//
//  };
//
//  /**
//   * @param {SQLTransaction} tr transaction.
//   * @param {SQLError} error error.
//   * @return {boolean} true to roll back.
//   */
//  var error_callback = function(tr, error) {
//    if (ydn.db.index.req.WebSql.DEBUG) {
//      window.console.log([q, tr, error]);
//    }
//    me.logger.warning('error: ' + sql + ' ' + error.message);
//    df(error, true);
//    return false; // roll back
//  };
//
//  if (ydn.db.index.req.WebSql.DEBUG) {
//    window.console.log([sql, ydn.json.stringify(params)]);
//  }
//
//  this.logger.finest('SQL: ' + sql + ' PARAMS: ' + params);
//  tx.executeSql(sql, params, callback, error_callback);
//
//};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.getCursor = function (tx, tx_no, store_name,
        index_name, keyRange, direction, key_only) {

  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store);
  var index_key_path = index_name;
  if (index_name) {
    var index = store.getIndex(index_name);
    index_key_path = index.getKeyPath();
  }
  return new ydn.db.index.req.CachedWebsqlCursor(tx, tx_no,
    store, store_name, index_name, index_key_path, keyRange, direction, key_only);
};




/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.getStreamer = goog.abstractMethod;

