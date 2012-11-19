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
goog.require('ydn.db.req.RequestExecutor');
goog.require('ydn.db.WebsqlCursor');
goog.require('ydn.json');
goog.require('ydn.db.req.SqlQuery');
goog.require('ydn.db.core.req.IRequestExecutor');


/**
 * @extends {ydn.db.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.core.req.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.WebSql, ydn.db.req.RequestExecutor);



/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.core.req.WebSql.DEBUG = false;


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
ydn.db.core.req.WebSql.REQ_PER_TX = 10;


/**
 * Maximum number of read-write requests created per transaction.
 * Since SQLite locks all stores during read write request, it is better
 * to give this number smaller. Larger number will not help to get faster
 * because it bottleneck is in SQL engine, not from JS side.
 * @const
 * @type {number} Maximum number of read-write requests created per transaction.
 */
ydn.db.core.req.WebSql.RW_REQ_PER_TX = 2;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.WebSql.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.core.req.WebSql');


/**
 * @protected
 * @return {SQLTransaction} transaction object.
 */
ydn.db.core.req.WebSql.prototype.getTx = function() {
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
ydn.db.core.req.WebSql.prototype.getKeyFromRow = function(table, row) {
  return row[table.keyPath || ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
};


/**
* @param {goog.async.Deferred} df promise.
* @param {string} store_name table name.
* @param {!Object} obj object to put.
* @param {(!Array|string|number)=} opt_key optional out-of-line key.
*/
ydn.db.core.req.WebSql.prototype.putObject = function(df, store_name, obj, opt_key)
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
    if (ydn.db.core.req.WebSql.DEBUG) {
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
    if (ydn.db.core.req.WebSql.DEBUG) {
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
ydn.db.core.req.WebSql.prototype.putObjects = function(
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
        var next = i + ydn.db.core.req.WebSql.RW_REQ_PER_TX;
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
      if (ydn.db.core.req.WebSql.DEBUG) {
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
    for (var i = 0; i < ydn.db.core.req.WebSql.RW_REQ_PER_TX && i < objects.length;
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
ydn.db.core.req.WebSql.prototype.getById = function(d, table_name, id) {

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
    if (ydn.db.core.req.WebSql.DEBUG) {
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
ydn.db.core.req.WebSql.prototype.listByIds = function(df, table_name, ids) {

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
        var next = i + ydn.db.core.req.WebSql.REQ_PER_TX;
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
      if (ydn.db.core.req.WebSql.DEBUG) {
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
    for (var i = 0; i < ydn.db.core.req.WebSql.REQ_PER_TX && i < ids.length; i++) {
      get(i, this.getTx());
    }
  } else {
    df.callback([]);
  }
};



/**
* @inheritDoc
*/
ydn.db.core.req.WebSql.prototype.listByStores = function(df, table_names) {

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
      if (ydn.db.core.req.WebSql.DEBUG) {
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
ydn.db.core.req.WebSql.prototype.listByKeys = function(df, keys) {

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
        var next = i + ydn.db.core.req.WebSql.REQ_PER_TX;
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
      if (ydn.db.core.req.WebSql.DEBUG) {
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
    for (var i = 0; i < ydn.db.core.req.WebSql.REQ_PER_TX && i < keys.length; i++) {
      get(i, this.getTx());
    }
  } else {
    df.callback([]);
  }
};



/**
* Deletes all objects from the store.
* @param {goog.async.Deferred} d promise.
* @param {(string|!Array.<string>)=} table_name table name.
*/
ydn.db.core.req.WebSql.prototype.clearByStore = function(d, table_name) {

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
      if (ydn.db.core.req.WebSql.DEBUG) {
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
ydn.db.core.req.WebSql.prototype.removeById = function(d, table_name, key) {

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
    if (ydn.db.core.req.WebSql.DEBUG) {
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
ydn.db.core.req.WebSql.prototype.clearById = function(d, table, id) {


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
    if (ydn.db.core.req.WebSql.DEBUG) {
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
    if (ydn.db.core.req.WebSql.DEBUG) {
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
ydn.db.core.req.WebSql.prototype.countStores = function(d, tables) {

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
      if (ydn.db.core.req.WebSql.DEBUG) {
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
ydn.db.core.req.WebSql.prototype.countKeyRange = function(d, table, keyRange) {

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
    if (ydn.db.core.req.WebSql.DEBUG) {
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
ydn.db.core.req.WebSql.prototype.removeByStore = function(d, opt_table) {

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
    if (ydn.db.core.req.WebSql.DEBUG) {
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
ydn.db.core.req.WebSql.prototype.toString = function() {
  return 'WebSqlEx:' + (this.dbname || '');
};
