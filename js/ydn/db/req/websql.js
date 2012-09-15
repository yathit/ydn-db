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
 * @fileoverview Implements ydn.db.io.QueryService with Web SQL storage.
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
goog.require('ydn.json');


/**
 * @extends {ydn.db.req.RequestExecutor}
 * @param {string} dbname
 * @param {ydn.db.DatabaseSchema} schema
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
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.req.WebSql.prototype.logger = goog.debug.Logger.getLogger('ydn.db.req.WebSql');


/**
 * @return {SQLTransaction}
 */
ydn.db.req.WebSql.prototype.getTx = function() {
  return /** @type {SQLTransaction} */ (this.tx);
};


/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @final
 * @protected
 * @param {ydn.db.StoreSchema} table table of concern.
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.req.WebSql.prototype.parseRow = function(table, row) {
  goog.asserts.assertObject(row);
  var value = ydn.json.parse(row[ydn.db.DEFAULT_BLOB_COLUMN]);
  var key = row[table.keyPath]; // NOT: table.getKey(row);
  table.setKey(value, key);
  for (var j = 0; j < table.indexes.length; j++) {
    var index = table.indexes[j];
    if (index.name == ydn.db.DEFAULT_BLOB_COLUMN) {
      continue;
    }
    var x = row[index.name];
    if (!goog.isDef(x)) {
      continue;
    }
    if (index.type == ydn.db.DataType.INTEGER) {
      x = parseInt(x, 10);
    } else if (index.type == ydn.db.DataType.FLOAT) {
      x = parseFloat(x);
    }
    value[index.name] = x;
  }
  return value;
};


/**
 * Extract key from row result.
 * @final
 * @protected
 * @param {ydn.db.StoreSchema} table table of concern.
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.req.WebSql.prototype.getKeyFromRow = function(table, row) {
  return row[table.keyPath || ydn.db.DEFAULT_KEY_COLUMN];
};


/**
* @param {goog.async.Deferred} df
* @param {string} store_name table name.
* @param {!Object} obj object to put.
*/
ydn.db.req.WebSql.prototype.putObject = function (df, store_name, obj) {

  var table = this.schema.getStore(store_name);
  if (!table) {
    throw new ydn.db.NotFoundError(store_name);
  }

  var me = this;

  var out = table.getIndexedValues(obj);
  //console.log([obj, JSON.stringify(obj)]);

  var sql = 'INSERT OR REPLACE INTO ' + table.getQuotedName() +
      ' (' + out.columns.join(', ') + ') ' +
      'VALUES (' + out.slots.join(', ') + ');';

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function (transaction, results) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([sql, out, transaction, results]);
    }
    df.callback(out.key);

  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function (tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([sql, out, tr, error]);
    }
    me.logger.warning('put error: ' + error.message);
    df.errback(error);
  };

  //console.log([sql, out.values]);
  this.tx.executeSql(sql, out.values, success_callback, error_callback);
};



/**
* @param {goog.async.Deferred} df
* @param {string} store_name table name.
* @param {!Array.<!Object>} objects object to put.
*/
ydn.db.req.WebSql.prototype.putObjects = function (df, store_name, objects) {

  var table = this.schema.getStore(store_name);
  if (!table) {
    throw new ydn.db.NotFoundError(store_name);
  }

  var me = this;
  var result_keys = [];

  /**
   * Put and item at i. This wydn.db.core.Storageill invoke callback to df if all objects
   * have been put, otherwise recursive call to itself at next i+1 item.
   * @param {number} i
   * @param {SQLTransaction} tx
   */
  var put = function (i, tx) {

    // todo: handle undefined or null object

    var out = table.getIndexedValues(objects[i]);
    //console.log([obj, JSON.stringify(obj)]);

    var sql = 'INSERT OR REPLACE INTO ' + table.getQuotedName() +
        ' (' + out.columns.join(', ') + ') ' +
        'VALUES (' + out.slots.join(', ') + ');';

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function (transaction, results) {
      result_keys.push(out.key);
      if (result_keys.length == objects.length) {
        df.callback(result_keys);
      } else {
        put(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([sql, out, tr, error]);
      }
      df.errback(error);
    };

    //console.log([sql, out.values]);
    tx.executeSql(sql, out.values, success_callback, error_callback);
  };

  if (objects.length > 0) {
    // todo: optimization for sending multiple requests
    // currently we send request only one request at a time.
    // we should not loop however because if the request array is large,
    // this will create large request and SQLite engine may freak out.
    // issue request only after successful request.
    // perhaps, two requests should be good enough.
    put(0, this.getTx());
  } else {
    df.callback([]);
  }
};


/**
*
* @param {goog.async.Deferred} d
* @param {string} table_name
* @param {(number|string)} id
* @private
*/
ydn.db.req.WebSql.prototype.getById = function(d, table_name, id) {

  var table = this.schema.getStore(table_name);
  if (!table) {
    throw new ydn.db.NotFoundError(table_name);
  }

  var me = this;

  var params = [id];
  var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
      table.getQuotedKeyPath() + ' = ?';


  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function (transaction, results) {
    if (results.rows.length > 0) {
      var row = results.rows.item(0);
      d.callback(me.parseRow(table, row));
    } else {
      d.callback(undefined);
    }
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function (tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('get error: ' + error.message);
    d.errback(error);
  };

  this.tx.executeSql(sql, params, callback, error_callback);
};


/**
 *
 * @param {goog.async.Deferred} df
 * @param {string} table_name
 * @param {!Array.<(number|string)>} ids
 * @private
 */
ydn.db.req.WebSql.prototype.getByIds = function (df, table_name, ids) {

  var me = this;
  var objects = [];
  /**
   * Flag for parallel requests that have received the result.
   * The length of this indicate the number of parallel requests we went
   * to send to the SQLite engine. currently 2.
   * the result will be send out to df when these flags are all set true.
   * initially all set true, but false once request is send, see below.
   * @type {Array}
   */
  var req_done = [true, true];
  var n_req = req_done.length;

  var table = this.schema.getStore(table_name);
  if (!table) {
    throw new ydn.db.NotFoundError(table_name);
  }

  /**
   * Get fetch the given id of i position and put to results array in
   * i position. If req_done are all true, df will be invoked, if not
   * it recursively call itself to next sequence.
   * @param {number} i the index of ids
   * @param {number} req_id index of req_done
   * @param {SQLTransaction} tx
   */
  var get = function (i, req_id, tx) {

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function (transaction, results) {
      if (results.rows.length > 0) {
        var row = results.rows.item(0);
        objects[i] = me.parseRow(table, row);
        // how about results.length > 1 it can happen when unique is not
        // set true.
        // this is related to IndexedDB API spec in
        // http://www.w3.org/TR/IndexedDB/#index-concept
        // 'An index also contains a multiEntry flag.'
      } else {
        objects[i] = undefined; // not necessary.
      }
      req_done[req_id] = true;
      // use simple logic, don't use array function.
      if (req_done[0] && req_done[1]) {
        // all done.
        df.callback(objects);
      } else {
        var next_req = i + n_req;
        req_done[next_req] = false;
        get(next_req, req_id, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('get error: ' + error.message);
      // t.abort(); there is no abort
      df.errback(error);
    };

    var params = [ids[i]];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
      table.getQuotedKeyPath() + ' = ?';
    tx.executeSql(sql, params, callback, error_callback);
  };

  if (ids.length > 0) {
    // send parallel requests
    for (var i = 0; i < n_req; i++) {
      req_done[i] = false;
      get(i, i, this.getTx());
    }
  } else {
    df.callback([]);
  }
};



/**
*
* @param {goog.async.Deferred} df
* @param {(string|!Array.<string>)=} opt_table_name
* @private
*/
ydn.db.req.WebSql.prototype.getByStore = function(df, opt_table_name) {

  var me = this;
  var arr = [];
  var n_todo = 0;
  var n_done = 0;

  var getAll = function (table_name) {

    var table = me.schema.getStore(table_name);
    if (!table) {
      throw new ydn.db.NotFoundError(table_name);
    }

    var sql = 'SELECT * FROM ' + table.getQuotedName();

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function (transaction, results) {
      n_done++;
      for (var i = 0; i < results.rows.length; i++) {
        var row = results.rows.item(i);
        arr.push(me.parseRow(table, row));
      }
      if (n_done == n_todo) {
        df.callback(arr);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      n_done++;
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('get error: ' + error.message);
      df.errback(error);
    };

    me.getTx().executeSql(sql, [], callback, error_callback);
  };

  var table_names = goog.isString(opt_table_name) ? [opt_table_name] :
      goog.isArray(opt_table_name) && opt_table_name.length > 0 ?
          opt_table_name : this.schema.getStoreNames();
  n_todo = table_names.length;

  if (n_todo > 0) {
    for (var i = 0; i < n_todo; i++) {
      getAll(table_names[i]);
    }
  }
};




/**
*
* @param {goog.async.Deferred} df
* @param {!Array.<!ydn.db.Key>} keys
*/
ydn.db.req.WebSql.prototype.getByKeys = function (df, keys) {

  var me = this;
  var results = [];

  var get = function (i, tx) {
    var key = keys[i];
    var table_name = key.getStoreName();
    var table = this.schema.getStore(table_name);
    if (!table) {
      throw new ydn.db.NotFoundError(table_name);
    }

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function (transaction, results) {
      var row = results.rows.item(0);
      results[i] = me.parseRow(table, row);
      if (i == keys.length - 1) {
        df.callback(results);
      } else {
        get(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('get error: ' + error.message);
      df.errback(error);
    };

    /**
     *
     * @type {!Array.<!ydn.db.Key>}
     */
    var params = [key.getId()];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        table.getQuotedKeyPath() + ' = ?';
    tx.executeSql(sql, params, callback, error_callback);

  };

  if (keys.length > 0) {
    get(0, this.getTx());
  } else {
    df.callback([]);
  }
};


/**
* @param {goog.async.Deferred} df
* @param {!ydn.db.Query} q query.
* @param {number=} max
* @param {number=} skip
*/
ydn.db.req.WebSql.prototype.fetch = function(df, q, max, skip) {

  var me = this;

  var start = skip || 0;
  var end = goog.isDef(max) ? start + max : undefined;

  var store = this.schema.getStore(q.store_name);
  var is_reduce = goog.isFunction(q.reduce);

  var sql = 'SELECT * FROM ' + store.getQuotedName();
  var params = [];

  var index = goog.isDef(q.index) ? store.getIndex(q.index) : null;

  if (q.keyRange) {
    var clause = q.toWhereClause();
    sql += ' WHERE ' + '(' + clause.where_clause + ')';
    params = clause.params;
  }

  // Note: IndexedDB key range result are always ordered.
  var dir = 'ASC';
  if (q.direction == 'prev') {
    dir = 'DESC';
  }
  var unique = true;
  if (index) {
    sql += ' ORDER BY ' + goog.string.quote(index.name) + ' ' + dir;
    unique = index.unique;
  } else if (goog.isDef(store.keyPath)) {
    sql += ' ORDER BY ' + goog.string.quote(store.keyPath) + ' ' + dir;
  }


  // optional optimization
  // here we are looking at whether we can use substitute max and skip with
  // native SQL LIMIT and OFFSET
  if (!goog.isFunction(q.filter) && !goog.isFunction(q.continue)) {
    if (goog.isDef(end)) {
      sql += ' LIMIT ' + (end - start);
      end = undefined;
    }
    if (start > 0) {
      sql += ' OFFSET ' + start;
      start = 0;
    }
  }

  var result;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    if (!is_reduce) {
      result = [];
    }
    var idx = -1;
    for (var i = 0; i < results.rows.length; i++) {
      var row = results.rows.item(i);
      var value = me.parseRow(store, row);
      var to_continue = !goog.isFunction(q.continue) || q.continue(value);
      if (!goog.isFunction(q.filter) || q.filter(value)) {
        idx++;
        if (idx >= start) {
          if (goog.isFunction(q.map)) {
            value = q.map(value);
          }

          if (is_reduce) {
            result = q.reduce(result, value, i);
          } else {
            result.push(value);
          }
        }
      }

      if (!(to_continue && (!goog.isDef(end) || (idx+1) < end))) {
        break;
      }
    }
    df.callback(result);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([q, sql, params, max, skip, tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error.message);
    df.errback(error);
  };

  this.tx.executeSql(sql, params, callback, error_callback);

};



/**
* Deletes all objects from the store.
* @param {goog.async.Deferred} d
* @param {(string|!Array.<string>)=} table_name table name.
*/
ydn.db.req.WebSql.prototype.clearByStore = function (d, table_name) {

  var me = this;
  var store_names = goog.isArray(table_name) && table_name.length > 0 ?
      table_name : goog.isString(table_name) ?
      [table_name] : this.schema.getStoreNames();


  var deleteStore = function (i, tx) {

    var store = me.schema.getStore(store_names[i]);
    if (!store) {
      throw new ydn.db.NotFoundError(store_names[i]);
    }

    var sql = 'DELETE FROM  ' + store.getQuotedName();

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function (transaction, results) {
      if (i == store_names.length - 1) {
        d.callback(true);
      } else {
        deleteStore(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('Sqlite error: ' + error.message);
      d.errback(error);
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
* @param {goog.async.Deferred} d
* @param {string} table_name table name.
* @param {(string|number)} key table name.
*/
ydn.db.req.WebSql.prototype.removeById = function (d, table_name, key) {

  var me = this;
  var store = this.schema.getStore(table_name);
  var key_column = store.getQuotedKeyPath() || ydn.db.DEFAULT_KEY_COLUMN;

  var sql = 'DELETE FROM  ' + store.getQuotedName() + ' WHERE ' +
      key_column + ' = ?';

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function (transaction, results) {
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function (tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error.message);
    d.errback(error);
  };

  this.tx.executeSql(sql, [key], callback, error_callback);

};



/**
 * @param {!goog.async.Deferred} d deferred result.
 * @param {string} table table name.
 * @param {(string|number)} id row name.
 */
ydn.db.req.WebSql.prototype.clearById = function (d, table, id) {


  var store = this.schema.getStore(table);
  if (!store) {
    throw new ydn.db.NotFoundError(table);
  }

  var me = this;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function (transaction, results) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log(results);
    }
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function (tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('put error: ' + error.message);
    d.errback(error);
  };

  var sql = 'DELETE FROM ' + store.getQuotedName() +
    ' WHERE ' + store.getQuotedKeyPath() + ' = ?';
  //console.log([sql, out.values])
  this.tx.executeSql(sql, [id], success_callback, error_callback);

};



/**
 * @param {!goog.async.Deferred} d return a deferred function.
 * @param {string} table store name.
*/
ydn.db.req.WebSql.prototype.count = function(d, table) {

  var me = this;

  var sql = 'SELECT COUNT(*) FROM ' + goog.string.quote(table);

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
   */
  var error_callback = function(tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('count error: ' + error.message);
    d.errback(error);
  };

  this.tx.executeSql(sql, [], callback, error_callback);

  return d;
};






/**
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
   */
  var error_callback = function(tr, error) {
    if (ydn.db.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Delete TABLE: ' + error.message);
    d.errback(error);
  };

  this.tx.executeSql(sql, [], callback, error_callback);

};
