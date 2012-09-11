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

goog.provide('ydn.db.exe.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.db.exe.Executor');
goog.require('ydn.json');


/**
 * @implements {ydn.db.exe.Executor}
 * @param {SQLTransaction} tx
 * @constructor
 */
ydn.db.exe.WebSql = function(tx) {
  this.tx_ = tx;
};


/**
 *
 * @type {SQLTransaction}
 * @private
 */
ydn.db.exe.WebSql.prototype.tx_ = null;

/**
 * @inheritDoc
 */
ydn.db.exe.WebSql.prototype.setTx = function(tx) {
  this.tx_ = tx;
};

/**
 * @inheritDoc
 */
ydn.db.exe.WebSql.prototype.isActive = function() {
  return !!this.tx_;
};



/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.exe.WebSql.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.exe.WebSql.prototype.logger = goog.debug.Logger.getLogger('ydn.db.exe.WebSql');


/**
 * @param {SQLTransaction} tx
 * @param {goog.async.Deferred} df
 * @param {string} store_name table name.
 * @param {!Object} obj object to put.
 */
ydn.db.exe.WebSql.prototype.executePut_ = function (tx, df, store_name, obj) {

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
    if (ydn.db.exe.WebSql.DEBUG) {
      window.console.log([sql, out, transaction, results]);
    }
    df.callback(out.key);

  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function (tr, error) {
    if (ydn.db.exe.WebSql.DEBUG) {
      window.console.log([sql, out, tr, error]);
    }
    me.logger.warning('put error: ' + error.message);
    df.errback(error);
  };

  //console.log([sql, out.values]);
  tx.executeSql(sql, out.values, success_callback, error_callback);

};


/**
 * @param {SQLTransaction} tx
 * @param {goog.async.Deferred} df
 * @param {string} store_name table name.
 * @param {!Array.<!Object>} arr object to put.
 */
ydn.db.exe.WebSql.prototype.executePutMultiple_ = function (tx, df, store_name, arr) {

  var table = this.schema.getStore(store_name);
  if (!table) {
    throw new ydn.db.NotFoundError(store_name);
  }

  var me = this;
  var arr_result = [];

  /**
   * Put and item at i. This will invoke callback to df if all objects
   * have been put, otherwise recursive call to itself at next i+1 item.
   * @param {number} i
   * @param {SQLTransaction} tx
   */
  var put = function (i, tx) {

    // todo: handle undefined or null object

    var out = table.getIndexedValues(arr[i]);
    //console.log([obj, JSON.stringify(obj)]);

    var sql = 'INSERT OR REPLACE INTO ' + table.getQuotedName() +
        ' (' + out.columns.join(', ') + ') ' +
        'VALUES (' + out.slots.join(', ') + ');';

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function (transaction, results) {
      arr_result.push(out.key);
      if (arr_result.length == arr.length) {
        df.callback(arr_result);
      } else {
        put(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.exe.WebSql.DEBUG) {
        window.console.log([sql, out, tr, error]);
      }
      df.errback(error);
    };

    //console.log([sql, out.values]);
    tx.executeSql(sql, out.values, success_callback, error_callback);
  };

  if (arr.length > 0) {
    put(0, tx);
  } else {
    df.callback([]);
  }
};



/**
 * @param {string} store_name table name.
 * @param {!Object|!Array.<!Object>} obj object to put.
 * @param {(string|number)=}  opt_key
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.exe.WebSql.prototype.put = function (store_name, obj, opt_key) {

  var me = this;
  var open_tx = this.isOpenTransaction();
  var tx = this.getActiveSqlTx();
  var df = new goog.async.Deferred();

  if (goog.isArray(obj)) {
    if (open_tx) {
      me.executePutMultiple_(tx.getTx(), df, store_name, obj);
    } else {
      this.doTransaction(function (tx) {
        me.executePutMultiple_(tx.getTx(), df, store_name, obj);
      }, [], ydn.db.TransactionMode.READ_WRITE);
    }
  } else {
    if (open_tx) {
      me.executePut_(tx.getTx(), df, store_name, obj);
    } else {
      this.doTransaction(function (tx) {
        me.executePut_(tx.getTx(), df, store_name, obj);
      }, [], ydn.db.TransactionMode.READ_WRITE);
    }
  }
  return df;
};




/**
 *
 * @param {SQLTransaction} t
 * @param {goog.async.Deferred} d
 * @param {string} table_name
 * @param {(number|string)} id
 * @private
 */
ydn.db.exe.WebSql.prototype.executeGet_ = function(t, d, table_name, id) {

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
    if (ydn.db.exe.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('get error: ' + error.message);
    d.errback(error);
  };

  t.executeSql(sql, params, callback, error_callback);
};



/**
 *
 * @param {SQLTransaction} t
 * @param {goog.async.Deferred} d
 * @param {(string|!Array.<string>)=} opt_table_name
 * @private
 */
ydn.db.exe.WebSql.prototype.executeGetByStore_ = function(t, d, opt_table_name) {

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
        d.callback(arr);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      n_done++;
      if (ydn.db.exe.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('get error: ' + error.message);
      d.errback(error);
    };

    t.executeSql(sql, [], callback, error_callback);
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
 * @param {SQLTransaction} t
 * @param {goog.async.Deferred} d
 * @param {string} table_name
 * @param {!Array.<(number|string)>} ids
 * @private
 */
ydn.db.exe.WebSql.prototype.executeGetMultiple_ = function (t, d, table_name, ids) {

  var me = this;
  var results = [];

  var table = this.schema.getStore(table_name);
  if (!table) {
    throw new ydn.db.NotFoundError(table_name);
  }

  var get = function (i, tx) {

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function (transaction, results) {
      var row = results.rows.item(0);
      results[i] = me.parseRow(table, row);
      if ((i + 1) == ids.length) {
        d.callback(results);
      } else {
        get(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.exe.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('get error: ' + error.message);
      // t.abort(); there is no abort
      d.errback(error);
    };

    var params = [ids[i]];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        table.getQuotedKeyPath() + ' = ?';
    t.executeSql(sql, params, callback, error_callback);
  };

  if (ids.length > 0) {
    get(0, t);
  } else {
    d.callback([]);
  }

};


/**
 *
 * @param {SQLTransaction} t
 * @param {goog.async.Deferred} d
 * @param {!Array.<!ydn.db.Key>} keys
 * @private
 */
ydn.db.exe.WebSql.prototype.executeGetKeys_ = function (t, d, keys) {

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
        d.callback(results);
      } else {
        get(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.exe.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('get error: ' + error.message);
      d.errback(error);
    };

    /**
     *
     * @type {!Array.<!ydn.db.Key>}
     */
    var params = [key.getId()];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        table.getQuotedKeyPath() + ' = ?';
    t.executeSql(sql, params, callback, error_callback);

  };

  if (keys.length > 0) {
    get(0, t);
  } else {
    d.callback([]);
  }
};



/**
 *
 * @param {string} store_name
 * @param {string|number} id
 * @return {!goog.async.Deferred} return object in deferred function.
 * @private
 */
ydn.db.exe.WebSql.prototype.getById_ = function(store_name, id) {
  var me = this;
  var open_tx = this.isOpenTransaction();
  var tx = this.getActiveSqlTx();
  var df = new goog.async.Deferred();
  if (open_tx) {
    this.executeGet_(tx.getTx(), df, store_name, id);
  } else {
    this.doTransaction(function(tx) {
      me.executeGet_(tx.getTx(), df, store_name, id);
    }, [store_name], ydn.db.TransactionMode.READ_ONLY);
  }
  return df;
};



/**
 *
 * @param {(string|!Array.<string>)=} store_name
 * @return {!goog.async.Deferred} return object in deferred function.
 * @private
 */
ydn.db.exe.WebSql.prototype.getByStore_ = function(store_name) {
  var me = this;
  var open_tx = this.isOpenTransaction();
  var tx = this.getActiveSqlTx();
  var df = new goog.async.Deferred();
  if (open_tx) {
    this.executeGetByStore_(tx.getTx(), df, store_name);
  } else {
    this.doTransaction(function(tx) {
      me.executeGetByStore_(tx.getTx(), df, store_name);
    }, [store_name], ydn.db.TransactionMode.READ_ONLY);
  }
  return df;
};


/**
 *
 * @param {string} store_name
 * @param {!Array.<string|number>} ids
 * @return {!goog.async.Deferred} return object in deferred function.
 * @private
 */
ydn.db.exe.WebSql.prototype.getByIds_ = function(store_name, ids) {
  var me = this;
  var open_tx = this.isOpenTransaction();
  var tx = this.getActiveSqlTx();
  var df = new goog.async.Deferred();
  if (open_tx) {
    this.executeGetMultiple_(tx.getTx(), df, store_name, ids);
  } else {
    this.doTransaction(function(tx) {
      me.executeGetMultiple_(tx.getTx(), df, store_name, ids);
    }, [store_name], ydn.db.TransactionMode.READ_ONLY);
  }
  return df;
};



/**
 *
 * @param {!Array.<!ydn.db.Key>} keys
 * @return {!goog.async.Deferred} return object in deferred function.
 * @private
 */
ydn.db.exe.WebSql.prototype.getByKeys_ = function(keys) {
  var me = this;
  var open_tx = this.isOpenTransaction();
  var tx = this.getActiveSqlTx();
  var df = new goog.async.Deferred();
  if (open_tx) {
    this.executeGetKeys_(tx.getTx(), df, keys);
  } else {
    this.doTransaction(function(tx) {
      me.executeGetKeys_(tx.getTx(), df, keys);
    }, [], ydn.db.TransactionMode.READ_ONLY);
  }
  return df;
};

/**
 * Return object
 * @param {IDBTransaction|IDBTransaction|Object} tx
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} store_name table name.
 * @param {(string|number|!Array.<string>)=} opt_key object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.exe.WebSql.prototype.getInTx = function (tx, store_name, opt_key) {

};


/**
 * Return object
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(string|number|!Array.<string>)=} arg2 object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.exe.WebSql.prototype.get = function (arg1, arg2) {

  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {ydn.db.Key}
     */
    var k = arg1;
    return this.getById_(k.getStoreName(), k.getId());
  } else if (goog.isString(arg1)) {
    if (goog.isString(arg2) || goog.isNumber(arg2)) {
      /** @type {string} */
      var store_name = arg1;
      /** @type {string|number} */
      var id = arg2;
      return this.getById_(store_name, id);
    } else if (!goog.isDef(arg2)) {
      return this.getByStore_(arg1);
    } else if (goog.isArray(arg2)) {
      if (goog.isString(arg2[0]) || goog.isNumber(arg2[0])) {
        return this.getByIds_(arg1, arg2);
      } else {
        throw new ydn.error.ArgumentException();
      }
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (goog.isArray(arg1)) {
    if (arg1[0] instanceof ydn.db.Key) {
      return this.getByKeys_(arg1);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (!goog.isDef(arg1) && !goog.isDef(arg2)) {
    return this.getByStore_();
  } else {
    throw new ydn.error.ArgumentException();
  }

};



/**
 * @param {!ydn.db.Query} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @return {!goog.async.Deferred}
 */
ydn.db.exe.WebSql.prototype.fetch = function(q, limit, offset) {
  if (q instanceof ydn.db.Query) {
    return this.fetchQuery_(q, limit, offset);
  } else {
    throw new ydn.error.ArgumentException();
  }
};


/**
 * @param {SQLTransaction} t
 * @param {goog.async.Deferred} d
 * @param {ydn.db.Query} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @private
 */
ydn.db.exe.WebSql.prototype.executeQuery_ = function(t, d, q, limit, offset) {

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
    if (ydn.db.exe.WebSql.DEBUG) {
      window.console.log([q, sql, params, limit, offset, tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error.message);
    d.errback(error);
  };

  t.executeSql(sql, params, callback, error_callback);

};



/**
 * @param {ydn.db.Query} q query.
 * @param {number=} limit
 * @param {number=} offset
 * @return {!goog.async.Deferred}
 * @private
 */
ydn.db.exe.WebSql.prototype.fetchQuery_ = function(q, limit, offset) {

  var me = this;
  var open_tx = this.isOpenTransaction();
  var tx = this.getActiveSqlTx();
  var df = new goog.async.Deferred();
  if (open_tx) {
    this.executeQuery_(tx.getTx(), df, q, limit, offset);
  } else {
    this.doTransaction(function(tx) {
      me.executeQuery_(tx.getTx(), df, q, limit, offset);
    }, [], ydn.db.TransactionMode.READ_ONLY);
  }
  return df;
};


/**
 * Deletes all objects from the store.
 * @param {SQLTransaction} t
 * @param {goog.async.Deferred} d
 * @param {(string|!Array.<string>)=} table_name table name.
 * @private
 */
ydn.db.exe.WebSql.prototype.executeClearStore_ = function (t, d, table_name) {

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
      if (ydn.db.exe.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('Sqlite error: ' + error.message);
      d.errback(error);
    };

    t.executeSql(sql, [], callback, error_callback);

    return d;
  };

  if (store_names.length > 0) {
    deleteStore(0, t);
  } else {
    d.callback([]);
  }
};


/**
 * Deletes all objects from the store.
 * @param {SQLTransaction} t
 * @param {goog.async.Deferred} d
 * @param {string} table_name table name.
 * @param {(string|number)} key table name.
 * @private
 */
ydn.db.exe.WebSql.prototype.executeClear_ = function (t, d, table_name, key) {

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
    if (ydn.db.exe.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error.message);
    d.errback(error);
  };

  t.executeSql(sql, [key], callback, error_callback);

};


/**
 * Remove a specific entry from a store or all.
 * @param {string=} table_name delete the table as provided otherwise
 * delete all stores.
 * @param {(string|number)=} opt_key delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.exe.WebSql.prototype.clear = function (table_name, opt_key) {

  var me = this;
  var open_tx = this.isOpenTransaction();
  var tx = this.getActiveSqlTx();
  var df = new goog.async.Deferred();
  if (goog.isString(table_name) && goog.isDef(opt_key)) {
    if (open_tx) {
      this.executeClear_(tx.getTx(), df, table_name, opt_key);
    } else {
      this.doTransaction(function (tx) {
        me.executeClear_(tx.getTx(), df, table_name, opt_key);
      }, [], ydn.db.TransactionMode.READ_WRITE);
    }
  } else {
    if (open_tx) {
      this.executeClearStore_(tx.getTx(), df, table_name);
    } else {
      this.doTransaction(function (tx) {
        me.executeClearStore_(tx.getTx(), df, table_name);
      }, [], ydn.db.TransactionMode.READ_WRITE);
    }
  }
  return df;

};



/**
 * @param {string} table store name.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.exe.WebSql.prototype.count = function(table) {

  var d = new goog.async.Deferred();
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
    if (ydn.db.exe.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('count error: ' + error.message);
    d.errback(error);
  };

  this.doTransaction(function(t) {
    t.getTx().executeSql(sql, [], callback, error_callback);
  }, [table], ydn.db.TransactionMode.READ_ONLY);

  return d;
};





/**
* Delete the database, store or an entry.
*
* @param {string=} opt_table delete a specific store.
* @param {string=} opt_id delete a specific row.
* @return {!goog.async.Deferred} return a deferred function.
*/
ydn.db.exe.WebSql.prototype.remove = function(opt_table, opt_id) {

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
 * @final
 * @param {string} table table name.
 * @param {string} id row name.
 * @return {!goog.async.Deferred} deferred result.
 * @protected
 */
ydn.db.exe.WebSql.prototype.deleteRow_ = function(table, id) {
  var d = new goog.async.Deferred();

  var store = this.schema.getStore(table);
  if (!store) {
    this.logger.warning('Table ' + table + ' not found.');
    d.errback(new Error('Table ' + table + ' not found.'));
    return d;
  }

  var me = this;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.exe.WebSql.DEBUG) {
      window.console.log(results);
    }
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.exe.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('put error: ' + error.message);
    d.errback(error);
  };

  me.db.transaction(function(t) {
    var sql = 'DELETE FROM ' + store.getQuotedName() +
        ' WHERE ' + store.getQuotedKeyPath() + ' = ' + goog.string.quote(id);
    //console.log([sql, out.values])
    t.executeSql(sql, [], success_callback, error_callback);
  });
  return d;
};



/**
* @param {string=} opt_table table name to be deleted, if not specified all
* tables will be deleted.
* @protected
*/
ydn.db.exe.WebSql.prototype.executeDropTable_ = function(t, d, opt_table) {

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
    me.logger.warning('Deleted database: ' + me.dbname);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.exe.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Delete TABLE: ' + error.message);
    d.errback(error);
  };

  t.executeSql(sql, [], callback, error_callback);

};


/**
 * @param {string=} opt_table table name to be deleted, if not specified all
 * tables will be deleted.
 * @return {!goog.async.Deferred} deferred result.
 * @protected
 */
ydn.db.exe.WebSql.prototype.dropTable_ = function(opt_table) {
  var me = this;
  var open_tx = this.isOpenTransaction();
  var tx = this.getActiveSqlTx();
  var df = new goog.async.Deferred();
  if (open_tx) {
    this.executeDropTable_(tx.getTx(), df, opt_table);
  } else {
    this.doTransaction(function(tx) {
      me.executeDropTable_(tx.getTx(), df, opt_table);
    }, [], ydn.db.TransactionMode.READ_WRITE);
  }
  return df;
};

