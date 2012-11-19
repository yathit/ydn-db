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
goog.require('ydn.db.core.req.WebSql');
goog.require('ydn.db.WebsqlCursor');
goog.require('ydn.json');
goog.require('ydn.db.req.SqlQuery');


/**
 * @extends {ydn.db.core.req.WebSql}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
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
 *
 * @param {ydn.db.Iterator} cursor the cursor.
 * @param {Function} next_callback icursor handler.
 * @param {ydn.db.base.CursorMode?=} mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.index.req.WebSql.prototype.open = function(cursor, next_callback, mode) {
  var q = cursor instanceof ydn.db.req.SqlQuery ? cursor :
    this.planQuery(cursor);
  return this.openSqlQuery(q, next_callback, mode);
};



/**
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!ydn.db.Iterator} q query.
 * @param {?function(*): boolean} clear clear iteration function.
 * @param {?function(*): *} update update iteration function.
 * @param {?function(*): *} map map iteration function.
 * @param {?function(*, *, number): *} reduce reduce iteration function.
 * @param {*} initial initial value for reduce iteration function.
 * @param {?function(*): *} finalize finalize function.
 */
ydn.db.index.req.WebSql.prototype.iterate = function(df, q, clear, update, map,
                                                  reduce, initial, finalize) {
  var me = this;
  var is_reduce = goog.isFunction(reduce);

  var mode = goog.isFunction(clear) || goog.isFunction(update) ?
    ydn.db.base.CursorMode.READ_WRITE :
    ydn.db.base.CursorMode.READ_ONLY;


  var idx = -1; // iteration index
  var results = [];
  var previousResult = initial;

  var request = this.open(q, function (cursor) {

    var value = cursor.value();
    idx++;
    //console.log([idx, cursor.key(), value]);

    var consumed = false;

    if (goog.isFunction(clear)) {
      var to_clear = clear(value);
      if (to_clear === true) {
        consumed = true;
        cursor.clear();
      }
    }

    if (!consumed && goog.isFunction(update)) {
      var updated_value = update(value);
      if (updated_value !== value) {
        cursor.update(updated_value);
      }
    }

    if (goog.isFunction(map)) {
      value = map(value);
    }

    if (is_reduce) {
      previousResult = reduce(value, previousResult, idx);
    } else {
      results.push(value);
    }

  }, mode);

  request.addCallback(function() {
    var result = is_reduce ? previousResult : results;
    if (goog.isFunction(finalize)) {
      result = finalize(result);
    }
    df.callback(result);
  });

  request.addErrback(function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([q, event]);
    }
    df.errback(event);
  });

};



/**
 *
 * @param {ydn.db.req.SqlQuery} cursor the cursor.
 * @param {Function} next_callback icursor handler.
 * @param {ydn.db.base.CursorMode?=} mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.index.req.WebSql.prototype.openSqlQuery = function(cursor, next_callback, mode) {

  var df = new goog.async.Deferred();
  var me = this;
  var sql = cursor.sql;

  var store = this.schema.getStore(cursor.getStoreName());

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {

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
      var key = undefined;
      if (goog.isDefAndNotNull(row)) {
          value = cursor.parseRow(row, store);
          var key_str = goog.isDefAndNotNull(store.keyPath) ?
            row[store.keyPath] : row[ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
          key = ydn.db.schema.Index.sql2js(key_str, store.type);

//        if (!goog.isDefAndNotNull(key)) {
//          var msg;
//          if (goog.DEBUG) {
//            msg = 'executing ' + sql + ' return invalid key object: ' +
//              row.toString().substr(0, 80);
//          }
//          throw new ydn.db.InvalidStateError(msg);
//        }
        var to_continue = !goog.isFunction(cursor.continued) ||
          cursor.continued(value);

        if (!goog.isFunction(cursor.filter) || cursor.filter(value)) {
          var peerKeys = [];
          var peerIndexKeys = [];
          var peerValues = [];
          var tx = mode === 'readwrite' ? me.getTx() : null;
          var icursor = new ydn.db.WebsqlCursor(tx, key, null, value,
              peerKeys, peerIndexKeys, peerValues);
          var to_break = next_callback(icursor);
          icursor.dispose();
          if (to_break === true) {
            break;
          }
        }
        if (!to_continue) {
          break;
        }
      }


    }
    df.callback();

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
    this.logger.finest(this + ' open SQL: ' + sql + ' PARAMS:' +
      ydn.json.stringify(cursor.params));
  }
  this.tx.executeSql(sql, cursor.params, callback, error_callback);

  return df;
};



/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.listByIterator = function(df, q) {
  var arr = [];
  var req = this.open(q, function(cursor) {
    arr.push(cursor.value());
  });
  req.addCallbacks(function() {
    df.callback(arr);
  }, function(e) {
    df.errback(e);
  })
};


/**
 * Convert keyRange to SQL statement.
 * @param {ydn.db.Iterator} query schema.
 * @return {ydn.db.req.SqlQuery} sql query.
 */
ydn.db.index.req.WebSql.prototype.planQuery = function(query) {

  var store = this.schema.getStore(query.getStoreName());
  if (!store) {
    throw new ydn.db.SqlParseError('TABLE: ' + query.getStoreName() +
      ' not found.');
  }

  var sql = new ydn.db.req.SqlQuery(query.store_name, query.index,
    ydn.db.KeyRange.clone(query.keyRange));

  var select = 'SELECT';

  var from = '* FROM ' + store.getQuotedName();

  var index = goog.isDef(sql.index) ? store.getIndex(sql.index) : null;

  var key_column = index ? index.getKeyPath() :
    goog.isDefAndNotNull(store.keyPath) ? store.keyPath :
      ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  var column = goog.string.quote(key_column);

  var where_clause = '';
  if (query.keyRange) {

    if (ydn.db.Where.resolvedStartsWith(query.keyRange)) {
      where_clause = column + ' LIKE ?';
      sql.params.push(sql.keyRange['lower'] + '%');
    } else {
      if (goog.isDef(sql.keyRange.lower)) {
        var lowerOp = sql.keyRange['lowerOpen'] ? ' > ' : ' >= ';
        where_clause += ' ' + column + lowerOp + '?';
        sql.params.push(sql.keyRange.lower);
      }
      if (goog.isDef(sql.keyRange['upper'])) {
        var upperOp = sql.keyRange['upperOpen'] ? ' < ' : ' <= ';
        var and = where_clause.length > 0 ? ' AND ' : ' ';
        where_clause += and + column + upperOp + '?';
        sql.params.push(sql.keyRange.upper);
      }
    }
    where_clause = ' WHERE ' + '(' + where_clause + ')';
  }

  // Note: IndexedDB key range result are always ordered.
  var dir = 'ASC';
  if (sql.direction == ydn.db.Iterator.Direction.PREV ||
    sql.direction == ydn.db.Iterator.Direction.PREV_UNIQUE) {
    dir = 'DESC';
  }
  var order = 'ORDER BY ' + column;

  sql.sql = [select, from, where_clause, order, dir].join(' ');
  return sql;
};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.explainQuery = function(query) {
  var sql = this.planQuery(query);
  return /** @type {Object} */ (sql.toJSON());
};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.explainSql = function(query) {
  var cursor = query.toSqlQuery(this.schema);
  return /** @type {Object} */ (cursor.toJSON());
};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebSql.prototype.executeSql = function(df, sql) {
  var cursor = sql.toSqlQuery(this.schema);
  var initial = goog.isFunction(cursor.initial) ? cursor.initial() : undefined;
  this.iterate(df, cursor, null, null,
    cursor.map, cursor.reduce, initial, cursor.finalize);
  return df;
};


/**
 * @param {!goog.async.Deferred} df return object in deferred function.
 * @param {!ydn.db.Iterator} q the query.
 */
ydn.db.index.req.WebSql.prototype.fetchCursor = function(df, q) {

  var me = this;
  var cursor = this.planQuery(q);
  var is_reduce = goog.isFunction(cursor.reduce);
  var store = this.schema.getStore(cursor.store_name);

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

