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

goog.provide('ydn.db.crud.req.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.db.Where');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.crud.req.RequestExecutor');
goog.require('ydn.json');



/**
 * @extends {ydn.db.crud.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.crud.req.IRequestExecutor}
 * @struct
 */
ydn.db.crud.req.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.crud.req.WebSql, ydn.db.crud.req.RequestExecutor);


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.crud.req.WebSql.DEBUG = false;


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
ydn.db.crud.req.WebSql.REQ_PER_TX = 10;


/**
 * Maximum number of read-write requests created per transaction.
 * Since SQLite locks all stores during read write request, it is better
 * to give this number smaller. Larger number will not help to get faster
 * because it bottleneck is in SQL engine, not from JS side.
 * @const
 * @type {number} Maximum number of read-write requests created per transaction.
 */
ydn.db.crud.req.WebSql.RW_REQ_PER_TX = 2;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.req.WebSql.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.crud.req.WebSql');


/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @final
 * @param {!Object} row row.
 * @param {ydn.db.schema.Store} store store schema.
 * @return {!Object} parse value.
 */
ydn.db.crud.req.WebSql.parseRow = function(row, store) {

  var value = row[ydn.db.base.DEFAULT_BLOB_COLUMN] ?
      ydn.json.parse(row[ydn.db.base.DEFAULT_BLOB_COLUMN]) : {};
  if (goog.isDefAndNotNull(store.keyPath)) {
    var key = ydn.db.schema.Index.sql2js(row[store.keyPath], store.getType());
    if (goog.isDefAndNotNull(key)) {
      store.setKeyValue(value, key);
    }
  }

  for (var j = 0; j < store.indexes.length; j++) {
    var index = store.indexes[j];
    var column_name = index.getSQLIndexColumnName();
    if (column_name == ydn.db.base.DEFAULT_BLOB_COLUMN ||
        index.isComposite() || index.isMultiEntry()) {
      continue;
    }
    if (index.getType() == ydn.db.schema.DataType.DATE) {
      // in JSON serialization, date lost type.
      var x = row[column_name];
      var v = ydn.db.schema.Index.sql2js(x, index.getType());
      if (goog.isDef(v)) {
        index.applyValue(value, v);
      }
    }

  }

  return value;
};


/**
 * Extract key from row result.
 * @final
 * @protected
 * @param {ydn.db.schema.Store} table table of concern.
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.crud.req.WebSql.prototype.getKeyFromRow = function(table, row) {
  return row[table.keyPath || ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.keysByKeyRange = function(req,
    store_name, key_range, reverse, limit, offset) {
  this.list_by_key_range_(req, true, store_name, undefined, key_range,
      reverse, limit, offset, false);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.keysByIndexKeyRange = function(req,
    store_name, index_name, key_range, reverse, limit, offset, unique) {
  this.list_by_key_range_(req, true, store_name, index_name,
      key_range, reverse, limit, offset, unique);
};


/**
 * Retrieve primary keys or value from a store in a given key range.
 * @param {ydn.db.Request} req tx.
 * @param {boolean} key_only retrieve key only.
 * @param {string} store_name table name.
 * @param {string|undefined} index_column name.
 * @param {IDBKeyRange} key_range to retrieve.
 * @param {boolean} reverse ordering.
 * @param {number} limit the results.
 * @param {number} offset skip first results.
 * @param {boolean} distinct unique key only.
 * @private
 */
ydn.db.crud.req.WebSql.prototype.list_by_key_range_ = function(req,
    key_only, store_name, index_column, key_range, reverse, limit, offset,
    distinct) {

  var me = this;
  var arr = [];
  var store = this.schema.getStore(store_name);
  var key_column = store.getSQLKeyColumnName();
  var index = goog.isDefAndNotNull(index_column) &&
      (index_column !== key_column) ? store.getIndex(index_column) : null;
  var is_index = !!index;
  var effective_column = index_column || key_column;
  var params = [];
  var mth = key_only ? ydn.db.base.SqlQueryMethod.KEYS :
      ydn.db.base.SqlQueryMethod.VALUES;
  var sql = store.toSql(params, mth, effective_column,
      key_range, reverse, distinct);

  if (goog.isNumber(limit)) {
    sql += ' LIMIT ' + limit;
  }
  if (goog.isNumber(offset)) {
    sql += ' OFFSET ' + offset;
  }

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    var n = results.rows.length;
    if (ydn.db.crud.req.WebSql.DEBUG) {
      window.console.log(results);
    }
    for (var i = 0; i < n; i++) {
      var row = results.rows.item(i);
      if (ydn.db.crud.req.WebSql.DEBUG) {
        window.console.log(row);
      }
      if (key_only) {
        arr[i] = ydn.db.schema.Index.sql2js(row[key_column], store.getType());
      } else if (goog.isDefAndNotNull(row)) {
        arr[i] = ydn.db.crud.req.WebSql.parseRow(row, store);
      }
    }
    me.logger.finer('success ' + msg);
    req.setDbValue(arr);
  };

  var msg = req.getLabel() + ' SQL: ' + sql + ' ;params= ' +
      ydn.json.stringify(params);

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + msg + error.message);
    req.setDbValue(error, true);
    return false;
  };

  this.logger.finest(msg);
  req.getTx().executeSql(sql, params, callback, error_callback);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.putByKeys = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.addObject = function(
    req, store_name, obj, opt_key) {
  this.insertObjects(req, true, true, store_name, [obj], [opt_key]);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.putData = function(tx, tx_no, df,
    store_name, data, delimiter) {
  throw 'not impl';
};


/**
* @inheritDoc
*/
ydn.db.crud.req.WebSql.prototype.putObject = function(rq,
    store_name, obj, opt_key) {
  this.insertObjects(rq, false, true, store_name, [obj], [opt_key]);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.addObjects = function(
    req, store_name, objects, opt_keys) {
  this.insertObjects(req, true, false, store_name, objects, opt_keys);
};


/**
 * @param {ydn.db.Request} req tx.
 * @param {boolean} create true if insert, otherwise insert or replace.
 * @param {boolean} single false for array input.
 * @param {string} store_name table name.
 * @param {!Array.<!Object>} objects object to put.
 * @param {!Array.<(!Array|string|number)>=} opt_keys optional out-of-line keys.
 * @protected
*/
ydn.db.crud.req.WebSql.prototype.insertObjects = function(
    req, create, single, store_name, objects, opt_keys) {

  var table = this.schema.getStore(store_name);

  var insert_statement = create ? 'INSERT INTO ' : 'INSERT OR REPLACE INTO ';

  var tx = req.getTx();
  var me = this;
  var result_keys = [];
  var result_count = 0;
  var msg = req.getLabel() + ' inserting ' + objects.length + ' objects.';
  var has_error = false;

  /**
   * Put and item at i. This ydn.db.con.Storage will invoke callback to df if
   * all objects
   * have been put, otherwise recursive call to itself at next i+1 item.
   * @param {number} i index.
   * @param {SQLTransaction} tx transaction.
   */
  var put = function(i, tx) {

    if (!goog.isDefAndNotNull(objects[i])) {
      me.logger.finest('empty object at ' + i + ' of ' + objects.length);
      result_count++;
      if (result_count == objects.length) {
        me.logger.finer(msg + ' success ' + msg);
        // console.log(msg, result_keys);
        req.setDbValue(result_keys, has_error);
      } else {
        var next = i + ydn.db.crud.req.WebSql.RW_REQ_PER_TX;
        if (next < objects.length) {
          put(next, tx);
        }
      }
    }

    var out;
    if (goog.isDef(opt_keys)) {
      out = table.getIndexedValues(objects[i], opt_keys[i]);
    } else {
      out = table.getIndexedValues(objects[i]);
    }

    //console.log([obj, JSON.stringify(obj)]);

    var sql = insert_statement + table.getQuotedName() +
        ' (' + out.columns.join(', ') + ') ' +
        'VALUES (' + out.slots.join(', ') + ');';

    var i_msg = req.getLabel() +
        ' SQL: ' + sql + ' PARAMS: ' + out.values +
        ' REQ: ' + i + ' of ' + objects.length;

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function(transaction, results) {
      result_count++;

      var key = goog.isDef(out.key) ? out.key : results.insertId;
      if (results.rowsAffected < 1) { // catch for no-op
        // assuming index constraint no op
        has_error = true;
        key = new ydn.db.ConstraintError(key + ' no-op');
      }

      /**
       * Insert a row for each multi entry index.
       * @param {ydn.db.schema.Index} index multi entry index.
       * @param {number} value index at.
       */
      var insertMultiEntryIndex = function(index, value) {
        var idx_name = ydn.db.con.WebSql.PREFIX_MULTIENTRY +
            table.getName() + ':' + index.getName();
        var idx_sql = insert_statement + goog.string.quote(idx_name) + ' (' +
            table.getSQLKeyColumnNameQuoted() + ', ' +
            index.getSQLIndexColumnNameQuoted() + ') VALUES (?, ?)';
        var idx_params = [ydn.db.schema.Index.js2sql(key, table.getType()),
              value];

        /**
         * @param {SQLTransaction} tx transaction.
         * @param {SQLResultSet} rs results.
         */
        var idx_success = function(tx, rs) {

        };
        /**
         * @param {SQLTransaction} tr transaction.
         * @param {SQLError} error error.
         * @return {boolean} true to roll back.
         */
        var idx_error = function(tr, error) {
          me.logger.warning('multiEntry index insert error: ' + error.message);
          return false;
        };

        me.logger.finest(req.getLabel() + ' multiEntry ' + idx_sql +
            ' ' + idx_params);
        tx.executeSql(idx_sql, idx_params, idx_success, idx_error);
      };
      for (var j = 0, nj = table.countIndex(); j < nj; j++) {
        var idx = table.index(j);
        if (idx.isMultiEntry()) {
          var index_values = ydn.db.utils.getValueByKeys(objects[i],
              idx.getKeyPath());
          var n = (!index_values ? 0 : index_values.length) || 0;
          for (var k = 0; k < n; k++) {
            insertMultiEntryIndex(idx, index_values[k]);
          }
        }
      }

      if (single) {
        // console.log(msg, key);
        req.setDbValue(key);
      } else {
        result_keys[i] = key;
        if (result_count == objects.length) {
          // console.log(msg, result_keys);
          req.setDbValue(result_keys, has_error);
        } else {
          var next = i + ydn.db.crud.req.WebSql.RW_REQ_PER_TX;
          if (next < objects.length) {
            put(next, transaction);
          }
        }
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        window.console.log([sql, out, tr, error]);
      }
      result_count++;
      has_error = true;
      if (error.code == 6) { // constraint failed
        error.name = 'ConstraintError';
      } else {
        me.logger.warning('error: ' + error.message + ' ' + msg);
      }
      if (single) {
        req.setDbValue(error, true);
      } else {
        result_keys[i] = error;
        if (result_count == objects.length) {
          me.logger.finest('success ' + msg); // still success message ?
          req.setDbValue(result_keys, has_error);
        } else {
          var next = i + ydn.db.crud.req.WebSql.RW_REQ_PER_TX;
          if (next < objects.length) {
            put(next, tr);
          }
        }
      }
      return false; // continue, not rollback
    };

    // console.log([sql, out.values]);
    me.logger.finest(i_msg);
    tx.executeSql(sql, out.values, success_callback, error_callback);
  };

  if (objects.length > 0) {
    // send parallel requests
    for (var i = 0;
         i < ydn.db.crud.req.WebSql.RW_REQ_PER_TX && i < objects.length; i++) {
      put(i, /** @type {SQLTransaction} */ (tx));
    }
  } else {
    this.logger.finer('success');
    req.setDbValue([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.putObjects = function(
    rq, store_name, objects, opt_keys) {
  this.insertObjects(rq, false, false, store_name, objects,
      opt_keys);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.putByKeys = function(rq, objs,
                                                      keys) {

  if (keys.length == 0) {
    rq.setDbValue([]);
    return;
  }

  var tx = rq.getTx();
  var results = [];
  var count = 0;
  var total = 0;
  var me = this;

  /**
   *
   * @param {string} store_name
   * @param {!Array.<number>} idx
   */
  var execute_on_store = function(store_name, idx) {
    var idx_objs = [];
    me.logger.finest('put ' + idx.length + ' objects to ' + store_name);
    var store = me.schema.getStore(store_name);
    var inline = store.usedInlineKey();
    var idx_keys = inline ? undefined : [];
    for (var i = 0; i < idx.length; i++) {
      idx_objs.push(objs[idx[i]]);
      if (!inline) {
        idx_keys.push(keys[idx[i]].getId());
      }
    }
    var i_rq = rq.copy();
    i_rq.addCallbacks(function(xs) {
      for (var i = 0; i < idx.length; i++) {
        results[idx[i]] = xs[i];
      }
      count++;
      if (count == total) {
        rq.setDbValue(results);
      }
    }, function(e) {
      count++;
      if (count == total) {
        rq.setDbValue(results, true);
      }
    });
    me.insertObjects(i_rq, false, false, store_name, idx_objs,
        idx_keys);

  };

  var store_name = '';
  var store;
  var idx = [];
  var ids = [];
  for (var i = 0; i < keys.length; i++) {
    var name = keys[i].getStoreName();
    var id = keys[i].getId();

    if (name != store_name) {
      total++;
      if (idx.length > 0) {
        execute_on_store(store_name, idx);
      }
      idx = [i];
      ids = [id];
      store_name = name;
    } else {
      idx.push(i);
      ids.push(id);
    }

  }

  if (idx.length > 0) {
    execute_on_store(store_name, idx);
  }

};


/**
*
* @inheritDoc
*/
ydn.db.crud.req.WebSql.prototype.getById = function(req, table_name, id) {

  var tx = req.getTx();
  var table = this.schema.getStore(table_name);
  goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
      ' not found.');

  var me = this;

  var column_name = table.getSQLKeyColumnNameQuoted();

  var params = [ydn.db.schema.Index.js2sql(id, table.getType())];

  var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
      column_name + ' = ?';

  var msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + params;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {

    if (results.rows.length > 0) {
      var row = results.rows.item(0);

      if (goog.isDefAndNotNull(row)) {
        var value = ydn.db.crud.req.WebSql.parseRow(row, table);
        req.setDbValue(value);
      } else {
        me.logger.finer('success no result: ' + msg);
        req.setDbValue(undefined);
      }
    } else {
      me.logger.finer('success no result: ' + msg);
      req.setDbValue(undefined);
    }
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + msg + ' ' + error.message);
    req.setDbValue(error, true);
    return false;
  };

  //window.console.log(['getById', sql, params]);
  this.logger.finest(msg);
  tx.executeSql(sql, params, callback, error_callback);
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.listByIds = function(req, table_name, ids) {

  var tx = req.getTx();
  var me = this;
  var objects = [];
  var result_count = 0;

  var table = this.schema.getStore(table_name);

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
          objects[i] = ydn.db.crud.req.WebSql.parseRow(row, table);
        }
        // this is get function, we take only one result.
      } else {
        objects[i] = undefined; // not necessary.
      }

      if (result_count == ids.length) {
        req.setDbValue(objects);
      } else {
        var next = i + ydn.db.crud.req.WebSql.REQ_PER_TX;
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
      result_count++;
      if (ydn.db.crud.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('error: ' + sql + ' ' + error.message);
      // t.abort(); there is no abort
      if (result_count == ids.length) {
        req.setDbValue(objects);
      } else {
        var next = i + ydn.db.crud.req.WebSql.REQ_PER_TX;
        if (next < ids.length) {
          get(next, tr);
        }
      }
      return false;
    };

    var id = ids[i];
    var column_name = table.getSQLKeyColumnNameQuoted();

    var params = [ydn.db.schema.Index.js2sql(id, table.getType())];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        column_name + ' = ?';
    me.logger.finest('SQL: ' + sql + ' PARAMS: ' + params);
    tx.executeSql(sql, params, callback, error_callback);
  };

  if (ids.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.WebSql.REQ_PER_TX && i < ids.length;
         i++) {
      get(i, /** @type {SQLTransaction} */ (tx));
    }
  } else {
    me.logger.finer('success');
    req.setDbValue([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.listByKeyRange = function(req,
    store_name, key_range, reverse, limit, offset) {

  this.list_by_key_range_(req, false, store_name, undefined,
      key_range, reverse, limit, offset, false);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.listByIndexKeyRange = function(req,
    store_name, index, key_range, reverse, limit, offset, unqiue) {
  this.list_by_key_range_(req, false, store_name, index, key_range,
      reverse, limit, offset, unqiue);
};


/**
*
* @inheritDoc
*/
ydn.db.crud.req.WebSql.prototype.listByKeys = function(req, keys) {

  var tx = req.getTx();
  var me = this;
  var objects = [];
  var result_count = 0;

  var get = function(i, tx) {
    var key = keys[i];
    var table_name = key.getStoreName();
    var table = me.schema.getStore(table_name);

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      result_count++;
      if (results.rows.length > 0) {
        var row = results.rows.item(0);
        if (goog.isDefAndNotNull(row)) {
          objects[i] = ydn.db.crud.req.WebSql.parseRow(row, table);
        }
        // this is get function, we take only one result.
      } else {
        objects[i] = undefined; // not necessary.
      }

      if (result_count == keys.length) {
        me.logger.finest('success ' + sql);
        req.setDbValue(objects);
      } else {
        var next = i + ydn.db.crud.req.WebSql.REQ_PER_TX;
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
      if (ydn.db.crud.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      req.setDbValue(error, true);
      return false;
    };

    var id = key.getNormalizedId();
    var column_name = table.getSQLKeyColumnNameQuoted();

    var params = [ydn.db.schema.Index.js2sql(id, table.getType())];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        column_name + ' = ?';
    me.logger.finest('SQL: ' + sql + ' PARAMS: ' + params);
    tx.executeSql(sql, params, callback, error_callback);

  };

  if (keys.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.WebSql.REQ_PER_TX && i < keys.length;
         i++) {
      get(i, tx);
    }
  } else {
    this.logger.finest('success');
    req.setDbValue([]);
  }
};


/**
* @inheritDoc
*/
ydn.db.crud.req.WebSql.prototype.clearByStores = function(req, store_names) {

  var tx = req.getTx();
  var me = this;

  var deleteStore = function(i, tx) {

    var store = me.schema.getStore(store_names[i]);

    var sql = 'DELETE FROM  ' + store.getQuotedName();

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      if (i == store_names.length - 1) {
        me.logger.finest('success ' + sql);
        req.setDbValue(store_names.length);
      } else {
        deleteStore(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var errback = function(tr, error) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      req.setDbValue(error, true);
      return false;
    };

    me.logger.finest('SQL: ' + sql + ' PARAMS: []');
    tx.executeSql(sql, [], callback, errback);

    /**
     *
     * @param {ydn.db.schema.Index} index
     */
    var deleteMultiEntryIndex = function(index) {
      var idx_name = ydn.db.con.WebSql.PREFIX_MULTIENTRY +
          store.getName() + ':' + index.getName();

      var idx_sql = 'DELETE FROM  ' + goog.string.quote(idx_name);
      me.logger.finest('SQL: ' + idx_sql);
      tx.executeSql(idx_sql, []);
    };

    for (var j = 0, n = store.countIndex(); j < n; j++) {
      var index = store.index(j);
      if (index.isMultiEntry()) {
        deleteMultiEntryIndex(index);
      }
    }

  };

  if (store_names.length > 0) {
    deleteStore(0, tx);
  } else {
    this.logger.finest('success');
    req.setDbValue(0);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.removeByKeys = function(req, keys) {

  var tx = req.getTx();
  var me = this;
  var count = 0;
  var has_failed = false;
  var store_name, store, key;
  var msg = req.getLabel() + ' removeByKeys: ' + keys.length + ' keys';
  this.logger.finest(msg);

  var removeAt = function(i) {

    if (i >= keys.length) {
      req.setDbValue(count, has_failed);
      return;
    }

    var store = me.schema.getStore(keys[i].getStoreName());

    var key = ydn.db.schema.Index.js2sql(keys[i].getId(), store.getType());

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function(transaction, results) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        window.console.log(results);
      }
      count++;
      removeAt(i);
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('error: ' + i_msg + error.message);
      has_failed = true;
      removeAt(i);
      return false;
    };

    var where = ' WHERE ' + store.getSQLKeyColumnNameQuoted() + ' = ?';
    var sql = 'DELETE FROM ' + store.getQuotedName() + where;
    //console.log([sql, out.values])
    var i_msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + [key];
    if (ydn.db.crud.req.WebSql.DEBUG) {
      window.console.log(i_msg);
    }
    tx.executeSql(sql, [key], success_callback, error_callback);
    i++;

    /**
     *
     * @param {ydn.db.schema.Index} index
     */
    var deleteMultiEntryIndex = function(index) {
      var idx_name = ydn.db.con.WebSql.PREFIX_MULTIENTRY +
          store.getName() + ':' + index.getName();

      var idx_sql = 'DELETE FROM  ' + goog.string.quote(idx_name) + where;
      me.logger.finest(req.getLabel() + + ' SQL: ' + idx_sql);
      tx.executeSql(idx_sql, [key]);
    };

    for (var j = 0, n = store.countIndex(); j < n; j++) {
      var index = store.index(j);
      if (index.isMultiEntry()) {
        deleteMultiEntryIndex(index);
      }
    }
  };

  removeAt(0);

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.removeById = function(req, table, id) {

  var tx = req.getTx();
  var store = this.schema.getStore(table);
  var key = ydn.db.schema.Index.js2sql(id, store.getType());

  var me = this;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      window.console.log(results);
    }
    req.setDbValue(results.rowsAffected);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    req.setDbValue(error, true);
    return false; // not rollback yet.
  };

  var where = ' WHERE ' + store.getSQLKeyColumnNameQuoted() + ' = ?';
  var sql = 'DELETE FROM ' + store.getQuotedName() + where;
  //console.log([sql, out.values])
  var msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + [key];
  this.logger.finest(msg);
  tx.executeSql(sql, [key], success_callback, error_callback);

  /**
   *
   * @param {ydn.db.schema.Index} index
   */
  var deleteMultiEntryIndex = function(index) {
    var idx_name = ydn.db.con.WebSql.PREFIX_MULTIENTRY +
        store.getName() + ':' + index.getName();

    var idx_sql = 'DELETE FROM  ' + goog.string.quote(idx_name) + where;
    me.logger.finest(req.getLabel() + + ' SQL: ' + idx_sql);
    tx.executeSql(idx_sql, [key]);
  };

  for (var j = 0, n = store.countIndex(); j < n; j++) {
    var index = store.index(j);
    if (index.isMultiEntry()) {
      deleteMultiEntryIndex(index);
    }
  }

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.clearByKeyRange = function(req,
    store_name, key_range) {
  this.clear_by_key_range_(req, store_name, undefined, key_range);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.removeByKeyRange = function(req,
    store_name, key_range) {
  this.clear_by_key_range_(req, store_name, undefined, key_range);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.removeByIndexKeyRange = function(req,
    store_name, index_name, key_range) {
  this.clear_by_key_range_(req, store_name, index_name, key_range);
};


/**
 * Retrieve primary keys or value from a store in a given key range.
 * @param {ydn.db.Request} req request.
 * @param {string} store_name table name.
 * @param {string|undefined} column_name name.
 * @param {IDBKeyRange} key_range to retrieve.
 * @private
 */
ydn.db.crud.req.WebSql.prototype.clear_by_key_range_ = function(req,
    store_name, column_name, key_range) {

  var tx = req.getTx();
  var me = this;
  var arr = [];
  var store = this.schema.getStore(store_name);

  var sql = 'DELETE FROM ' + store.getQuotedName();
  var params = [];
  var where_params = [];
  var where = '';
  if (goog.isDefAndNotNull(key_range)) {
    if (goog.isDef(column_name)) {
      var index = store.getIndex(column_name);
      ydn.db.KeyRange.toSql(index.getSQLIndexColumnNameQuoted(),
          index.getType(), key_range, where_params, params);
    } else {
      ydn.db.KeyRange.toSql(store.getSQLKeyColumnNameQuoted(), store.getType(),
          key_range, where_params, params);
    }
    where = ' WHERE ' + where_params.join(' AND ');
  }
  sql += where;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    me.logger.finest('success ' + msg);
    req.setDbValue(results.rowsAffected);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + msg + error.message);
    req.setDbValue(error, true);
    return false;
  };

  //console.log([sql, params])
  var msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + params;
  this.logger.finest(msg);
  tx.executeSql(sql, params, callback, error_callback);

  /**
   *
   * @param {ydn.db.schema.Index} index
   */
  var deleteMultiEntryIndex = function(index) {
    var idx_name = ydn.db.con.WebSql.PREFIX_MULTIENTRY +
        store.getName() + ':' + index.getName();

    var idx_sql = 'DELETE FROM  ' + goog.string.quote(idx_name) + where;
    me.logger.finest(req.getLabel() + + ' SQL: ' + idx_sql);
    tx.executeSql(idx_sql, where_params);
  };

  for (var j = 0, n = store.countIndex(); j < n; j++) {
    var j_index = store.index(j);
    if (j_index.isMultiEntry()) {
      deleteMultiEntryIndex(j_index);
    }
  }
};


/**
 * @inheritDoc
*/
ydn.db.crud.req.WebSql.prototype.countStores = function(req, tables) {

  var tx = req.getTx();
  var me = this;
  var out = [];

  /**
   *
   * @param {number} i
   */
  var count = function(i) {
    var table = tables[i];
    var sql = 'SELECT COUNT(*) FROM ' + goog.string.quote(table);

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      var row = results.rows.item(0);
      // console.log(['row ', row  , results]);
      out[i] = parseInt(row['COUNT(*)'], 10);
      i++;
      if (i == tables.length) {
        req.setDbValue(out);
      } else {
        count(i);
      }

    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      req.setDbValue(error, true);
      return false;
    };

    me.logger.finest('SQL: ' + sql + ' PARAMS: []');
    tx.executeSql(sql, [], callback, error_callback);
  };

  if (tables.length == 0) {
    this.logger.finest('success');
    req.setDbValue(0);
  } else {
    count(0);
  }

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.countKeyRange = function(req, table,
    key_range, index_name, unique) {

  var me = this;

  var params = [];

  var store = this.schema.getStore(table);

  var sql = store.toSql(params, ydn.db.base.SqlQueryMethod.COUNT,
      index_name, key_range, false, unique);

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      window.console.log([sql, results]);
    }
    var row = results.rows.item(0);
    // console.log(['row ', row  , results]);
    req.setDbValue(ydn.object.takeFirst(row)); // usually row['COUNT(*)']
    // , but may be  row['COUNT("id")']
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      window.console.log([sql, error]);
    }
    req.setDbValue(error, true);
    return false;
  };

  var msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + params;
  this.logger.finest(msg);
  req.getTx().executeSql(sql, params, callback, error_callback);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.list = function(req, type, store_name,
    index, key_range, reverse, limit, offset, unique) {
  throw 'not yet';
};
