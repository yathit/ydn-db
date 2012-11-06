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

goog.provide('ydn.db.req.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db.req.RequestExecutor');
goog.require('ydn.db.WebsqlCursor');
goog.require('ydn.json');
goog.require('ydn.db.req.SqlQuery');


/**
 * @extends {ydn.db.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 */
ydn.db.req.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.req.WebSql, ydn.db.req.RequestExecutor);



/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.req.WebSql.DEBUG = false;


/**
 * Maximum number of readonly requests created per transaction.
 * Common implementation in WebSQL library is sending massive requests
 * to the transaction and use setTimeout to prevent breaking the system.
 * To get optimal performance, we send limited number of request per
 * transaction.
 * Sending more request will not help much because JS is just parsing and
 * pushing to result array data which is faster than SQL processing.
 * Smaller number also help SQLite engine to give
 * other transaction to perform parallel requests.
 * @const
 * @type {number} Maximum number of readonly requests created per transaction.
 */
ydn.db.req.WebSql.REQ_PER_TX = 10;


/**
 * Maximum number of read-write requests created per transaction.
 * Since SQLite locks all stores during read write request, it is better
 * to give this number smaller. Larger number will not help to get faster
 * because it bottleneck is in SQL engine, not from JS side.
 * @const
 * @type {number} Maximum number of read-write requests created per transaction.
 */
ydn.db.req.WebSql.RW_REQ_PER_TX = 2;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.req.WebSql.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.req.WebSql');


/**
 * @protected
 * @return {SQLTransaction} transaction object.
 */
ydn.db.req.WebSql.prototype.getTx = function() {
  return /** @type {SQLTransaction} */ (this.tx);
};



/**
 * Extract key from row result.
 * @final
 * @protected
 * @param {ydn.db.schema.Store} table table of concern.
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.req.WebSql.prototype.getKeyFromRow = function(table, row) {
  return row[table.keyPath || ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
};


/**
* @param {goog.async.Deferred} df promise.
* @param {string} store_name table name.
* @param {!Object} obj object to put.
* @param {(!Array|string|number)=} opt_key optional out-of-line key.
*/
ydn.db.req.WebSql.prototype.putObject = function(df, store_name, obj, opt_key)
{

  var table = this.schema.getStore(store_name);
  if (!table) {
    throw new ydn.db.NotFoundError(store_name);
  }

  var me = this;

  var out = table.getIndexedValues(obj, opt_key);
  //console.log([obj, JSON.stringify(obj)]);

  var sql = 'INSERT OR REPLACE INTO ' + table.getQuotedName() +
      ' (' + out.columns.join(', ') + ') ' +
      'VALUES (' + out.slots.join(', ') + ');';

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log(['success', sql, out, transaction, results]);
    }
    // In SQLite, row id (insertId) is column and hence cab retrieved back by
    // row ID. see in getById for details.
    var key = goog.isDef(out.key) ? out.key : results.insertId;
    df.callback(key);

  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([sql, out, tr, error]);
    }
    me.logger.warning('put error: ' + error.message);
    df.errback(error);
    return true; // roll back
  };

  //console.log([sql, out.values]);
  this.tx.executeSql(sql, out.values, success_callback, error_callback);
};



/**
* @param {goog.async.Deferred} df  promise.
* @param {string} store_name table name.
* @param {!Array.<!Object>} objects object to put.
 * @param {!Array.<(!Array|string|number)>=} opt_keys optional out-of-line keys.
*/
ydn.db.req.WebSql.prototype.putObjects = function(
  df, store_name, objects, opt_keys) {

  var table = this.schema.getStore(store_name);
  if (!table) {
    throw new ydn.db.NotFoundError(store_name);
  }

  var me = this;
  var result_keys = [];
  var result_count = 0;

  /**
   * Put and item at i. This ydn.db.con.Storage will invoke callback to df if
   * all objects
   * have been put, otherwise recursive call to itself at next i+1 item.
   * @param {number} i index.
   * @param {SQLTransaction} tx transaction.
   */
  var put = function(i, tx) {

    // todo: handle undefined or null object

    var out;
    if (goog.isDef(opt_keys)) {
      out = table.getIndexedValues(objects[i], opt_keys[i]);
    } else {
      out = table.getIndexedValues(objects[i]);
    }
    //console.log([obj, JSON.stringify(obj)]);

    var sql = 'INSERT OR REPLACE INTO ' + table.getQuotedName() +
        ' (' + out.columns.join(', ') + ') ' +
        'VALUES (' + out.slots.join(', ') + ');';

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function(transaction, results) {
      result_count++;
      result_keys[i] = goog.isDef(out.key) ? out.key : results.insertId;
      if (result_count == objects.length) {
        df.callback(result_keys);
      } else {
        var next = i + ydn.db.req.WebSql.RW_REQ_PER_TX;
        if (next < objects.length) {
          put(next, transaction);
        }
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([sql, out, tr, error]);
      }
      df.errback(error);
      return true; // roll back
    };

    //console.log([sql, out.values]);
    tx.executeSql(sql, out.values, success_callback, error_callback);
  };

  if (objects.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.req.WebSql.RW_REQ_PER_TX && i < objects.length;
         i++) {
      put(i, this.getTx());
    }
  } else {
    df.callback([]);
  }
};


/**
*
* @param {goog.async.Deferred} d  promise.
* @param {string} table_name store name.
* @param {(string|number|Date|!Array)} id id.
*/
ydn.db.req.WebSql.prototype.getById = function(d, table_name, id) {

  var table = this.schema.getStore(table_name);
  goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
    ' not found.');

  var me = this;

  var column_name = table.getSQLKeyColumnName();

  var params = [ydn.db.schema.Index.js2sql(id, table.type)];

  var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
    column_name + ' = ?';


  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    if (results.rows.length > 0) {
      var row = results.rows.item(0);
      if (goog.isDefAndNotNull(row)) {
        d.callback(ydn.db.req.SqlQuery.parseRow(row, table));
      } else {
        d.callback(undefined);
      }
    } else {
      d.callback(undefined);
    }
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('get error: ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  //window.console.log(['getById', sql, params]);
  this.tx.executeSql(sql, params, callback, error_callback);
};


/**
 *
 * @param {goog.async.Deferred} df promise.
 * @param {string} table_name store name.
 * @param {!Array.<(!Array|number|string)>} ids ids.
 */
ydn.db.req.WebSql.prototype.listByIds = function(df, table_name, ids) {

  var me = this;
  var objects = [];
  var result_count = 0;

  var table = this.schema.getStore(table_name);
  goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
    ' not found.');

  /**
   * Get fetch the given id of i position and put to results array in
   * i position. If req_done are all true, df will be invoked, if not
   * it recursively call itself to next sequence.
   * @param {number} i the index of ids.
   * @param {SQLTransaction} tx tx.
   */
  var get = function(i, tx) {

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      result_count++;
      if (results.rows.length > 0) {
        var row = results.rows.item(0);
        if (goog.isDefAndNotNull(row)) {
          objects[i] = ydn.db.req.SqlQuery.parseRow(row, table);
        }
        // this is get function, we take only one result.
      } else {
        objects[i] = undefined; // not necessary.
      }

      if (result_count == ids.length) {
        df.callback(objects);
      } else {
        var next = i + ydn.db.req.WebSql.REQ_PER_TX;
        if (next < ids.length) {
          get(next, transaction);
        }
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('get error: ' + error.message);
      // t.abort(); there is no abort
      df.errback(error);
      return true; // roll back
    };

    var id = ids[i];
    var column_name = table.getSQLKeyColumnName();

    var params = [ydn.db.schema.Index.js2sql(id, table.type)];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
      column_name + ' = ?';
    tx.executeSql(sql, params, callback, error_callback);
  };

  if (ids.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.req.WebSql.REQ_PER_TX && i < ids.length; i++) {
      get(i, this.getTx());
    }
  } else {
    df.callback([]);
  }
};



/**
* @inheritDoc
*/
ydn.db.req.WebSql.prototype.listByStores = function(df, table_names) {

  var me = this;
  var arr = [];

  var n_todo = table_names.length;

  /**
   * @param {number} idx the index of table_names.
   * @param {SQLTransaction} tx tx.
   */
  var getAll = function(idx, tx) {
    var table_name = table_names[idx];
    var table = me.schema.getStore(table_name);
    goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
      ' not found.');

    var sql = 'SELECT * FROM ' + table.getQuotedName();

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      for (var i = 0; i < results.rows.length; i++) {
        var row = results.rows.item(i);
        if (goog.isDefAndNotNull(row)) {
          arr.push(ydn.db.req.SqlQuery.parseRow(row, table));
        }
      }
      if (idx == n_todo - 1) {
        df.callback(arr);
      } else {
        getAll(idx + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('get error: ' + error.message);
      df.errback(error);
      return true; // roll back
    };

    tx.executeSql(sql, [], callback, error_callback);
  };

  // send request to the first store
  // getAll will continue to fetch one after another
  if (n_todo == 0) {
    df.callback([]);
  } else {
    getAll(0, this.getTx());
  }

};




/**
*
* @param {goog.async.Deferred} df promise.
* @param {!Array.<!ydn.db.Key>} keys keys.
*/
ydn.db.req.WebSql.prototype.listByKeys = function(df, keys) {

  var me = this;
  var objects = [];
  var result_count = 0;

  var get = function(i, tx) {
    var key = keys[i];
    var table_name = key.getStoreName();
    var table = me.schema.getStore(table_name);
    goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
      ' not found.');

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      result_count++;
      if (results.rows.length > 0) {
        var row = results.rows.item(0);
        if (goog.isDefAndNotNull(row)) {
          objects[i] = ydn.db.req.SqlQuery.parseRow(row, table);
        }
        // this is get function, we take only one result.
      } else {
        objects[i] = undefined; // not necessary.
      }

      if (result_count == keys.length) {
        df.callback(objects);
      } else {
        var next = i + ydn.db.req.WebSql.REQ_PER_TX;
        if (next < keys.length) {
          get(next, transaction);
        }
      }

    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('get error: ' + error.message);
      df.errback(error);
      return true; // roll back
    };

    var id = key.getNormalizedId();
    var column_name = table.getSQLKeyColumnName();

    var params = [id];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        table.getQuotedKeyPath() + ' = ?';
    tx.executeSql(sql, params, callback, error_callback);

  };

  if (keys.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.req.WebSql.REQ_PER_TX && i < keys.length; i++) {
      get(i, this.getTx());
    }
  } else {
    df.callback([]);
  }
};


/**
 *
 * @param {ydn.db.Query} cursor the cursor.
 * @param {Function} next_callback icursor handler.
 * @param {ydn.db.base.CursorMode?=} mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.req.WebSql.prototype.open = function(cursor, next_callback, mode) {
  return this.openSqlQuery(this.planQuery(cursor), next_callback, mode);
};



/**
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!ydn.db.Query} q query.
 * @param {?function(*): boolean} clear clear iteration function.
 * @param {?function(*): *} update update iteration function.
 * @param {?function(*): *} map map iteration function.
 * @param {?function(*, *, number): *} reduce reduce iteration function.
 * @param {*} initial initial value for reduce iteration function.
 */
ydn.db.req.WebSql.prototype.iterate = function(df, q, clear, update, map,
                                                  reduce, initial) {
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
    df.callback(result);
  });

  request.addErrback(function(event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
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
ydn.db.req.WebSql.prototype.openSqlQuery = function(cursor, next_callback, mode) {

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
          value = ydn.db.req.SqlQuery.parseRow(row, store);
          var key_str = goog.isDefAndNotNull(store.keyPath) ?
            row[store.keyPath] : row[ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
          key = ydn.db.schema.Index.sql2js(key_str, store.type);

        if (!goog.isDefAndNotNull(key)) {
          var msg;
          if (goog.DEBUG) {
            msg = 'executing ' + sql + ' return invalid key object: ' +
              row.toString().substr(0, 80);
          }
          throw new ydn.db.InvalidStateError(msg);
        }
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
    if (ydn.db.req.WebSql.DEBUG) {
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
ydn.db.req.WebSql.prototype.listByQuery = function(df, q) {
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
 * @param {ydn.db.Query} query schema.
 * @return {ydn.db.req.SqlQuery} sql query.
 */
ydn.db.req.WebSql.prototype.planQuery = function(query) {

  var store = this.schema.getStore(query.getStoreName());
  if (!store) {
    throw new ydn.db.SqlParseError('TABLE: ' + query.getStoreName() +
      ' not found.');
  }

  var sql = new ydn.db.req.SqlQuery(query.store_name, query.direction, query.index,
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
  if (sql.direction == ydn.db.Query.Direction.PREV ||
    sql.direction == ydn.db.Query.Direction.PREV_UNIQUE) {
    dir = 'DESC';
  }
  var order = 'ORDER BY ' + column;

  sql.sql = [select, from, where_clause, order, dir].join(' ');
  return sql;
};


/**
 * @inheritDoc
 */
ydn.db.req.WebSql.prototype.explainQuery = function(query) {
  var sql = this.planQuery(query);
  return /** @type {Object} */ (sql.toJSON());
};



/**
 * @inheritDoc
 */
ydn.db.req.WebSql.prototype.executeSql = function(df, sql) {
  var cursor = sql.toSqlQuery(this.schema);
  var initial = goog.isFunction(cursor.initial) ? cursor.initial() : undefined;
  this.iterate(df, cursor, null, null,
    cursor.map, cursor.reduce, initial);
  return df;
};


/**
 * @param {!goog.async.Deferred} df return object in deferred function.
 * @param {!ydn.db.Query} q the query.
 */
ydn.db.req.WebSql.prototype.fetchCursor = function(df, q) {

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
    if (ydn.db.req.WebSql.DEBUG) {
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
ydn.db.req.WebSql.prototype.fetchQuery = function(df, q) {

  var cursor = q.toSqlQuery(this.schema);
  this.fetchCursor(df, cursor);
};


/**
* Deletes all objects from the store.
* @param {goog.async.Deferred} d promise.
* @param {(string|!Array.<string>)=} table_name table name.
*/
ydn.db.req.WebSql.prototype.clearByStore = function(d, table_name) {

  var me = this;
  var store_names = goog.isArray(table_name) && table_name.length > 0 ?
      table_name : goog.isString(table_name) ?
      [table_name] : this.schema.getStoreNames();


  var deleteStore = function(i, tx) {

    var store = me.schema.getStore(store_names[i]);
    if (!store) {
      throw new ydn.db.NotFoundError(store_names[i]);
    }

    var sql = 'DELETE FROM  ' + store.getQuotedName();

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      if (i == store_names.length - 1) {
        d.callback(true);
      } else {
        deleteStore(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('Sqlite error: ' + error.message);
      d.errback(error);
      return true; // roll back
    };

    tx.executeSql(sql, [], callback, error_callback);

    return d;
  };

  if (store_names.length > 0) {
    deleteStore(0, this.tx);
  } else {
    d.callback([]);
  }
};


/**
* Deletes all objects from the store.
* @param {goog.async.Deferred} d promise.
* @param {string} table_name table name.
* @param {(string|number)} key table name.
*/
ydn.db.req.WebSql.prototype.removeById = function(d, table_name, key) {

  var me = this;
  var store = this.schema.getStore(table_name);
  var key_column = store.getSQLKeyColumnName();

  var sql = 'DELETE FROM  ' + store.getQuotedName() + ' WHERE ' +
      key_column + ' = ?';

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  this.tx.executeSql(sql, [key], callback, error_callback);

};



/**
 * @param {!goog.async.Deferred} d deferred result.
 * @param {string} table table name.
 * @param {(!Array|string|number)} id row name.
 */
ydn.db.req.WebSql.prototype.clearById = function(d, table, id) {


  var store = this.schema.getStore(table);
  if (!store) {
    throw new ydn.db.NotFoundError(table);
  }

  var me = this;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log(results);
    }
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('put error: ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  var sql = 'DELETE FROM ' + store.getQuotedName() +
    ' WHERE ' + store.getQuotedKeyPath() + ' = ?';
  //console.log([sql, out.values])
  this.tx.executeSql(sql, [id], success_callback, error_callback);

};



/**
 * @param {!goog.async.Deferred} d return a deferred function.
 * @param {!Array.<string>} tables store name.
 * @return {!goog.async.Deferred} d return a deferred function. ??
*/
ydn.db.req.WebSql.prototype.countStores = function(d, tables) {

  var me = this;
  var total = 0;

  /**
   *
   * @param {number} i
   */
  var count = function (i) {
    var table = tables[i];
    var sql = 'SELECT COUNT(*) FROM ' + goog.string.quote(table);

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function (transaction, results) {
      var row = results.rows.item(0);
      //console.log(['row ', row  , results]);
      total += parseInt(row['COUNT(*)'], 10);
      i++;
      if (i == tables.length) {
        d.callback(total);
      } else {
        count(i);
      }

    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('count error: ' + error.message);
      d.errback(error);
      return true; // roll back
    };

    me.tx.executeSql(sql, [], callback, error_callback);
  };

  if (tables.length == 0) {
    d.callback(0);
  } else {
    count(0);
  }

  return d;
};


/**
 * @param {!goog.async.Deferred} d return a deferred function.
 * @param {string} table store name.
 * @param {ydn.db.KeyRange} keyRange the key range.
 * @return {!goog.async.Deferred} d return a deferred function. ??
 */
ydn.db.req.WebSql.prototype.countKeyRange = function(d, table, keyRange) {

  var me = this;

  var sql = 'SELECT COUNT(*) FROM ' + goog.string.quote(table);

  // TODO: key_range


  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    var row = results.rows.item(0);
    //console.log(['row ', row  , results]);
    d.callback(row['COUNT(*)']);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('count error: ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  this.tx.executeSql(sql, [], callback, error_callback);

  return d;
};


/**
 * @param {!goog.async.Deferred} d return a deferred function.
 * @param {string=} opt_table table name to be deleted, if not specified all
 * tables will be deleted.
 */
ydn.db.req.WebSql.prototype.removeByStore = function(d, opt_table) {

  var me = this;

  var sql = '';
  if (goog.isDef(opt_table)) {
    var store = this.schema.getStore(opt_table);
    if (!store) {
      throw Error('Table ' + opt_table + ' not found.');
    }
    sql = sql + 'DROP TABLE ' + store.getQuotedName() + ';';
  } else {
    for (var i = 0; i < me.schema.stores.length; i++) {
      sql = sql + 'DROP TABLE ' + me.schema.stores[i].getQuotedName() + ';';
    }
  }


  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    //console.log(['row ', row  , results]);
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Delete TABLE: ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  this.tx.executeSql(sql, [], callback, error_callback);

};


/**
 * @override
 */
ydn.db.req.WebSql.prototype.toString = function() {
  return 'WebSqlEx:' + (this.dbname || '');
};
