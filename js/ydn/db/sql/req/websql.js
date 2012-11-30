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

goog.provide('ydn.db.sql.req.WebSql');
goog.require('ydn.db.index.req.WebSql');
goog.require('ydn.db.sql.req.SqlQuery');
goog.require('ydn.db.sql.req.IRequestExecutor');

/**
 * @extends {ydn.db.index.req.WebSql}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.sql.req.IRequestExecutor}
 */
ydn.db.sql.req.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.sql.req.WebSql, ydn.db.index.req.WebSql);



/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.sql.req.WebSql.DEBUG = false;



/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.sql.req.WebSql.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.sql.req.WebSql');

/**
 * Convert keyRange to SQL statement.
 * @param {ydn.db.Iterator} query schema.
 * @return {ydn.db.sql.req.SqlQuery} sql query.
 */
ydn.db.sql.req.WebSql.prototype.planQuery = function(query) {

  var store = this.schema.getStore(query.getStoreName());
  if (!store) {
    throw new ydn.db.SqlParseError('TABLE: ' + query.getStoreName() +
      ' not found.');
  }

  var sql = new ydn.db.sql.req.SqlQuery(query.getStoreName(), query.getIndexName(),
    ydn.db.KeyRange.clone(query.keyRange()));

  var select = 'SELECT';

  var from = '* FROM ' + store.getQuotedName();

  var idx_name = sql.getIndexName();
  var index = goog.isDef(idx_name) ? store.getIndex(idx_name) : null;

  var key_column = index ? index.getKeyPath() :
    goog.isDefAndNotNull(store.keyPath) ? store.keyPath :
      ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  var column = goog.string.quote(key_column);

  var key_range = query.keyRange();
  var where_clause = '';
  if (key_range) {

    if (ydn.db.Where.resolvedStartsWith(key_range)) {
      where_clause = column + ' LIKE ?';
      sql.params.push(key_range['lower'] + '%');
    } else {
      if (goog.isDef(key_range.lower)) {
        var lowerOp = key_range['lowerOpen'] ? ' > ' : ' >= ';
        where_clause += ' ' + column + lowerOp + '?';
        sql.params.push(key_range.lower);
      }
      if (goog.isDef(key_range['upper'])) {
        var upperOp = key_range['upperOpen'] ? ' < ' : ' <= ';
        var and = where_clause.length > 0 ? ' AND ' : ' ';
        where_clause += and + column + upperOp + '?';
        sql.params.push(key_range.upper);
      }
    }
    where_clause = ' WHERE ' + '(' + where_clause + ')';
  }

  // Note: IndexedDB key range result are always ordered.
  var dir = 'ASC';
  if (sql.direction == ydn.db.base.Direction.PREV ||
    sql.direction == ydn.db.base.Direction.PREV_UNIQUE) {
    dir = 'DESC';
  }
  var order = 'ORDER BY ' + column;

  sql.sql = [select, from, where_clause, order, dir].join(' ');
  return sql;
};



/**
 * @inheritDoc
 */
ydn.db.sql.req.WebSql.prototype.explainSql = function(query) {
  var cursor = query.toSqlQuery(this.schema);
  return /** @type {Object} */ (cursor.toJSON());
};


/**
 * @inheritDoc
 */
ydn.db.sql.req.WebSql.prototype.executeSql = function(df, sql) {
  throw new ydn.error.NotImplementedException();
//  var cursor = sql.toSqlQuery(this.schema);
//  var initial = goog.isFunction(cursor.initial) ? cursor.initial() : undefined;
//  this.iterate(df, cursor, null, null,
//    cursor.map, cursor.reduce, initial, cursor.finalize);
//  return df;
};


/**
 *
 * @param {!goog.async.Deferred} df promise on completed.
 * @param {ydn.db.sql.req.SqlQuery} cursor the cursor.
 * @param {Function} next_callback icursor handler.
 * @param {ydn.db.base.CursorMode?=} mode mode.
 */
ydn.db.index.req.WebSql.prototype.openSqlQuery = function(df, cursor, next_callback, mode) {

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

};



/**
 * Convert keyRange to SQL statement.
 * @param {ydn.db.Iterator} query schema.
 * @return {ydn.db.sql.req.SqlQuery} sql query.
 */
ydn.db.index.req.WebSql.prototype.planQuery = function(query) {

  var store = this.schema.getStore(query.getStoreName());
  if (!store) {
    throw new ydn.db.SqlParseError('TABLE: ' + query.getStoreName() +
      ' not found.');
  }

  var sql = new ydn.db.sql.req.SqlQuery(query.getStoreName(), query.getIndexName(),
    ydn.db.KeyRange.clone(query.keyRange()));

  var select = 'SELECT';

  var from = '* FROM ' + store.getQuotedName();

  var idx_name = sql.getIndexName();
  var index = goog.isDef(idx_name) ? store.getIndex(idx_name) : null;

  var key_column = index ? index.getKeyPath() :
    goog.isDefAndNotNull(store.keyPath) ? store.keyPath :
      ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  var column = goog.string.quote(key_column);

  var key_range = query.keyRange();
  var where_clause = '';
  if (key_range) {

    if (ydn.db.Where.resolvedStartsWith(key_range)) {
      where_clause = column + ' LIKE ?';
      sql.params.push(key_range['lower'] + '%');
    } else {
      if (goog.isDef(key_range.lower)) {
        var lowerOp = key_range['lowerOpen'] ? ' > ' : ' >= ';
        where_clause += ' ' + column + lowerOp + '?';
        sql.params.push(key_range.lower);
      }
      if (goog.isDef(key_range['upper'])) {
        var upperOp = key_range['upperOpen'] ? ' < ' : ' <= ';
        var and = where_clause.length > 0 ? ' AND ' : ' ';
        where_clause += and + column + upperOp + '?';
        sql.params.push(key_range.upper);
      }
    }
    where_clause = ' WHERE ' + '(' + where_clause + ')';
  }

  // Note: IndexedDB key range result are always ordered.
  var dir = 'ASC';
  if (sql.direction == ydn.db.base.Direction.PREV ||
    sql.direction == ydn.db.base.Direction.PREV_UNIQUE) {
    dir = 'DESC';
  }
  var order = 'ORDER BY ' + column;

  sql.sql = [select, from, where_clause, order, dir].join(' ');
  return sql;
};


