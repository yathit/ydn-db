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
 * @fileoverview Implements ydn.db.QueryService with Web SQL storage.
 *
 * @see http://www.w3.org/TR/webdatabase/
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db.QueryService');
goog.require('ydn.db.Query');
goog.require('ydn.json');
goog.require('ydn.db.WebSqlWrapper');


/**
 * Construct WebSql database.
 * Note: Version is ignored, since it does work well.
 * @implements {ydn.db.QueryService}
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @extends {ydn.db.WebSqlWrapper}
 * @constructor
 */
ydn.db.WebSql = function(dbname, schema) {
 goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.WebSql, ydn.db.WebSqlWrapper);



/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.WebSql.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.WebSql.prototype.logger = goog.debug.Logger.getLogger('ydn.db.WebSql');


/**
 * @param {SQLTransaction} tx
 * @param {goog.async.Deferred} df
 * @param {string} store_name table name.
 * @param {!Object|Array.<!Object>} obj object to put.
 */
ydn.db.WebSql.prototype.executePut_ = function(tx, df, store_name, obj) {

  var table = this.schema.getStore(store_name);
  if (!table) {
    this.logger.warning('Table ' + store_name + ' not found.');
    df.errback(new Error('Table ' + store_name + ' not found.'));
    return;
  }

  var me = this;
  var is_array = goog.isArray(obj);
  var arr = is_array ? obj : [obj];
  var arr_result = [];
  var has_error = false;

  for (var i = 0; !has_error && i < arr.length; i++) {
    var last = i == arr.length - 1;

    var out = table.getIndexedValues(arr[i]);
    //console.log([obj, JSON.stringify(obj)]);

    var sql = 'INSERT OR REPLACE INTO ' + table.getQuotedName() +
        ' (' + out.columns.join(', ') + ') ' +
        'VALUES (' + out.slots.join(', ') + ');';

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function(last, key, transaction, results) {
      if (ydn.db.WebSql.DEBUG) {
        window.console.log([sql, out, last, key, transaction, results]);
      }
      if (is_array) {
        arr_result.push(key);
        if (last) {
          df.callback(arr_result);
        }
      } else {
        df.callback(key);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.WebSql.DEBUG) {
        window.console.log([sql, out, tr, error]);
      }
      me.logger.warning('put error: ' + error.message);
      // TODO: roll back
      has_error = true;
      df.errback(error);
    };

    //console.log([sql, out.values]);
    tx.executeSql(sql, out.values,
        goog.partial(success_callback, last, out.key), error_callback);
  }
};


/**
 * @param {string} store_name table name.
 * @param {!Object|Array.<!Object>} obj object to put.
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.WebSql.prototype.put = function(store_name, obj) {
  var df = new goog.async.Deferred();

  var me = this;

  this.doTransaction(function(tx) {
    me.executePut_(tx, df, store_name, obj);
  });
  return df;
};




/**
 *
 * @param {SQLTransaction} t
 * @param {goog.async.Deferred} d
 * @param {string} arg1
 * @param {(number|string)=} key
 * @private
 */
ydn.db.WebSql.prototype.executeGet_ = function(t, d, arg1, key) {
  var table = this.schema.getStore(arg1);
  if (!table) {
    this.logger.warning('Table ' + arg1 + ' not found.');
    d.errback(new Error('Table ' + arg1 + ' not found.'));
  }

  var me = this;

  var params = [];
  if (goog.isDef(key)) {
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        table.getQuotedKeyPath() + ' = ?';
    params = [key];
  } else {
    var sql = 'SELECT * FROM ' + table.getQuotedName();
  }

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function (transaction, results) {
    if (!goog.isDef(key)) {
      var arr = [];
      for (var i = 0; i < results.rows.length; i++) {
        var row = results.rows.item(i);
        arr.push(me.parseRow(table, row));
      }
      d.callback(arr);
    } else if (results.rows.length > 0) {
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
    if (ydn.db.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('get error: ' + error.message);
    d.errback(error);
  };

  t.executeSql(sql, params, callback, error_callback);
};


/**
 * Return object
 * @param {string|!ydn.db.Query|!ydn.db.Key} arg1 table name.
 * @param {(string|number)=} key object key to be retrieved, if not provided,
 * all entries in the store will return.
 * param {number=} start start number of entry.
 * param {number=} limit maximun number of entries.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.WebSql.prototype.get = function (arg1, key) {
  var d = new goog.async.Deferred();
  var me = this;

  if (arg1 instanceof ydn.db.Query) {
    var df = new goog.async.Deferred();

    var fetch_df = this.fetch(arg1);
    fetch_df.addCallback(function (value) {
      df.callback(goog.isArray(value) ? value[0] : undefined);
    });
    fetch_df.addErrback(function (value) {
      df.errback(value);
    });

    return df;
  } else {
    var store_name, id;
    if (arg1 instanceof ydn.db.Key) {
      store_name = arg1.store_name;
      id = arg1.id;
    } else {
      goog.asserts.assertString(arg1);
      store_name = arg1;
      id = key;
    }

    this.doTransaction(function (t) {
      me.executeGet_(t, d, store_name, id);
    });
    return d;
  }
};



/**
 * @param {!ydn.db.Query|!Array.<!ydn.db.Key>} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @return {!goog.async.Deferred}
 */
ydn.db.WebSql.prototype.fetch = function(q, limit, offset) {
  if (q instanceof ydn.db.Query) {
    return this.fetchQuery_(q, limit, offset);
  } else {
    throw Error('Not implemented.');
  }
};


/**
 * @param {ydn.db.Query} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @return {!goog.async.Deferred}
 * @private
 */
ydn.db.WebSql.prototype.fetchQuery_ = function(q, limit, offset) {
  var d = new goog.async.Deferred();
  var me = this;

  var start = offset || 0;
  var end = goog.isDef(limit) ? start + limit : undefined;

  var store = this.schema.getStore(q.store_name);
  var is_reduce = goog.isFunction(q.reduce);

  var sql = 'SELECT * FROM ' + store.getQuotedName();
  var params = [];


  if (q.keyRange) {
    var clause = q.toWhereClause();
    sql += ' WHERE ' + '(' + clause.where_clause + ')';
    params = clause.params;
  }

  if (goog.isDef(q.index)) {
    sql += ' ORDER BY ' + goog.string.quote(q.index);
  } else if (goog.isDef(store.keyPath)) {
    sql += ' ORDER BY ' + goog.string.quote(store.keyPath);
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
    d.callback(result);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.WebSql.DEBUG) {
      window.console.log([q, sql, params, limit, offset, tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error.message);
    d.errback(error);
  };

  this.doTransaction(function(t) {
    if (ydn.db.WebSql.DEBUG) {
      window.console.log([q, sql, params]);
    }
    t.executeSql(sql, params, callback, error_callback);
  });

  return d;
};


/**
 * Deletes all objects from the store.
 * @param {string} table_name table name.
 * @param {(string|number)=} opt_key table name.
 * @return {!goog.async.Deferred} return deferred function.
 * @private
 */
ydn.db.WebSql.prototype.clear_ = function(table_name, opt_key) {
  var d = new goog.async.Deferred();
  var self = this;

  var sql = '';
  if (goog.isDef(table_name)) {
    var store = this.schema.getStore(table_name);
    goog.asserts.assertObject(store);
    sql = 'DELETE FROM  ' + store.getQuotedName();
    if (goog.isDef(opt_key)) {
      var key_column = store.getQuotedKeyPath() || ydn.db.DEFAULT_KEY_COLUMN;
      sql += ' WHERE ' + key_column + ' = ?';
    }
  }

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
   */
  var error_callback = function(tr, error) {
    if (ydn.db.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('Sqlite error: ' + error.message);
    d.errback(error);
  };

  this.doTransaction(function(t) {
    var arg = goog.isDef(opt_key) ? [opt_key] : [];
    t.executeSql(sql, arg, callback, error_callback);
  });
  return d;
};



/**
 *
 */
ydn.db.WebSql.prototype.count = function(table) {

  var d = new goog.async.Deferred();
  var me = this;

  var sql = 'SELECT COUNT(*) FROM ' + table;

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
    if (ydn.db.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('count error: ' + error.message);
    d.errback(error);
  };

  this.doTransaction(function(t) {
    t.executeSql(sql, [], callback, error_callback);
  });

  return d;
};





/**
 * Remove a specific entry from a store or all.
 * @param {string=} opt_table delete the table as provided otherwise
 * delete all stores.
 * @param {(string|number)=} opt_key delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.WebSql.prototype.clear = function(opt_table, opt_key) {

  if (goog.isDef(opt_table)) {    
    if (!this.schema.hasStore(opt_table)) {
      throw Error('Table ' + opt_table + ' not found.');
    }
    return this.clear_(opt_table, opt_key);
  } else {
    var dfs = [];
    for (var store in this.schema) {
      dfs.push(this.clear_(store));
    }
    return ydn.async.reduceAllTrue(new goog.async.DeferredList(dfs));
  }
};


/**
 * Delete the database, store or an entry.
 *
 * @param {string=} opt_table delete a specific store.
 * @param {string=} opt_id delete a specific row.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.WebSql.prototype.remove = function(opt_table, opt_id) {

  if (goog.isDef(opt_table)) {
    if (goog.isDef(opt_id)) {
      return this.deleteRow_(opt_table, opt_id);
    } else {
      return this.dropTable_(opt_table);
    }
  } else {
    return this.dropTable_();
  }
};



/**
 *
 *
 */
ydn.db.WebSqlWrapper.prototype.transaction = function(trFn, scopes, mode) {

  this.doTransaction(function(tx) {
    // now execute transaction process
    trFn(tx);
  });

};