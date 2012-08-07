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
 * @fileoverview Deferred wrapper for Web SQL storage.
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
goog.require('ydn.db.Db');
goog.require('ydn.db.Query');
goog.require('ydn.json');



/**
 * Construct WebSql database.
 * Note: Version is ignored, since it does work well.
 * @implements {ydn.db.Db}
 * @param {string} dbname name of database.
 * @param {Array.<!ydn.db.DatabaseSchema>} schemas table schema contain table name and keyPath.
 * @constructor
 */
ydn.db.WebSql = function(dbname, schemas) {
  var self = this;
  this.dbname = dbname;
  /**
   * @final
   * @protected
   * @type {Array.<!ydn.db.DatabaseSchema>}
   */
  this.schemas = schemas;

  this.schema = schemas[schemas.length - 1]; // we always use the last schema.

  var description = this.dbname;

  /**
   * Must open the database with empty version, otherwise unrecoverable error will occur in the
   * first instance.
   * @protected
   * @type {Database}
   */
  this.db = goog.global.openDatabase(this.dbname, '', description,
      this.schema.size);

  if (this.db.version != this.schema.version) {
    this.migrate();
  }

};


/**
 *
 * @return {boolean} true if supported.
 */
ydn.db.WebSql.isSupported = function() {
  return goog.isFunction(goog.global.openDatabase);
};


/**
 *
 * @define {boolean} debug flag.
 */
ydn.db.WebSql.DEBUG = false;


/**
 * @protected
 * @final
 * @type {goog.debug.Logger} logger.
 */
ydn.db.WebSql.prototype.logger = goog.debug.Logger.getLogger('ydn.db.WebSql');


/**
 * Non-indexed field are store in this default field. There is always a column
 * in each table.
 * @const {string}
 */
ydn.db.WebSql.DEFAULT_FIELD = '_default_';

/**
 * Initialize variable to the schema and prepare SQL statement for creating
 * the table.
 * @protected
 * @param {ydn.db.TableSchema} schema name of table in the schema.
 * @return {string} SQL statement for creating the table.
 */
ydn.db.WebSql.prototype.prepareCreateTable = function(schema) {

  var sql = 'CREATE TABLE IF NOT EXISTS ' + schema.getQuotedName() + ' (' +
      schema.getQuotedKeyPath() + ' TEXT UNIQUE PRIMARY KEY';

  var has_default = !!schema.getIndex(ydn.db.WebSql.DEFAULT_FIELD);
  if (!has_default) { // every table must has a default field.
    schema.addIndex(ydn.db.WebSql.DEFAULT_FIELD);
  }

  for (var i = 0; i < schema.indexes.length; i++) {
    /**
     * @type {ydn.db.IndexSchema}
     */
    var index = schema.indexes[i];
    var primary = index.unique ? ' UNIQUE ' : ' ';
    sql += ', ' + index.name + primary + index.type;
  }

  sql += ');';

  return sql;
};


/**
 * Migrate from current version to the last version.
 * @protected
 */
ydn.db.WebSql.prototype.migrate = function() {

  var me = this;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.WebSql.DEBUG) {
      window.console.log(results);
    }
    me.logger.finest('Creating tables OK.');
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Error creating tables');
  };

  var sqls = [];
  for (var i = 0; i < this.schema.stores.length; i++) {
    sqls.push(this.prepareCreateTable(this.schema.stores[i]));
  }

  this.db.transaction(function(t) {
    me.logger.info('Creating tables ' + sqls.join('\n'));
    t.executeSql(sqls.join('\n'), [], success_callback, error_callback);
  });

};

//
///**
// *
// * @param {string} key key.
// * @param {string} table table name.
// * @return {!goog.async.Deferred} return as deferred function with reuslt of
// * boolean type.
// */
//ydn.db.WebSql.prototype.exists = function(key, table) {
//  var self = this;
//  var d = new goog.async.Deferred();
//  var keyPath = this.schema[table].keyPath;
//  var keyPathQuoted = this.schema[table].keyPathQuoted;
//  // NOTE: id cannot be quote.
//  var sql = 'SELECT ' + keyPathQuoted + " FROM '" + table + "' WHERE " +
//      keyPathQuoted + ' = ?';
//
//  /**
//   * @param {SQLTransaction} transaction transaction.
//   * @param {SQLResultSet} results results.
//   */
//  var callback = function(transaction, results) {
//    d.callback(results.rows.length > 0);
//  };
//
//  /**
//   * @param {SQLTransaction} tr transaction.
//   * @param {SQLError} error error.
//   */
//  var error_callback = function(tr, error) {
//    if (ydn.db.WebSql.DEBUG) {
//      window.console.log([tr, error]);
//    }
//    self.logger.warning('exists error: ' + error);
//    d.errback(undefined);
//  };
//
//  this.db.transaction(function(tx) {
//    //console.log(sql + ' ' + key);
//    tx.executeSql(sql, [key], callback, error_callback);
//  });
//  return d;
//};



/**
 * @inheritDoc
 */
ydn.db.WebSql.prototype.put = function(store_name, value) {
  var d = new goog.async.Deferred();

  var table = this.schema.getStore(store_name);
  if (!table) {
    this.logger.warning('Table ' + store_name + ' not found.');
    d.errback(undefined);
  }

  var columns = table.getColumns();

  var arr = goog.isArray(value) ? value : [value];
  // value slot like: ?,?,?
  var slots = ydn.object.reparr('?', columns.length + 1).join(',');

  var sql = 'INSERT OR REPLACE INTO "' + table.getQuotedName() + '" (' +
      table.getQuotedKeyPath() + columns.join(', ') + ') ' +
      'VALUES (' + slots + ');';

  var me = this;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.WebSql.DEBUG) {
      window.console.log(results);
    }
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
    me.logger.warning('putObjects error: ' + error);
    d.errback(undefined);
  };

  me.db.transaction(function(t) {
    for (var i = 0; i < arr.length; i++) {
      var last = i == arr.length - 1;
      var value_str = ydn.json.stringify(arr[i]);
      var key = me.getKey(store_name, arr[i]);

      //console.log(sql + ' [' + key + ', ' + value_str + ']')
      // TODO: fix error check for all result
      t.executeSql(sql, [key, value_str], last ? success_callback : undefined,
          last ? error_callback : undefined);
    }
  });
  return d;
};


/**
 * @inheritDoc
 */
ydn.db.WebSql.prototype.get = function(table_name, key) {
  var d = new goog.async.Deferred();

  var table = this.schema.getStore(table_name);
  if (!table) {
    this.logger.warning('Table ' + table_name + ' not found.');
    d.errback(undefined);
  }

  var me = this;

  var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
      table.getQuotedKeyPath() + ' = ' + key + ';';

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    var value;
    if (results.rows.length > 0) {
      var row = results.rows.item(0);
      value = ydn.json.parse(row[ydn.db.WebSql.DEFAULT_FIELD]);
      table.setKey(value, key);
      for (var j = 0; j < table.indexes.length; j++) {
        var index = table.indexes[j];
        var x = row[index.name];
        if (index.type == ydn.db.Db.DataType.INTEGER) {
          x = parseInt(x, 10);
        } else if (index.type == ydn.db.Db.DataType.FLOAT) {
          x = parseFloat(x);
        }
        value[index.name] = x;
      }
    }
    d.callback(value);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function(t) {
    //console.log(sql);
    t.executeSql(sql, [], callback, error_callback);
  });

  return d;
};

//
///**
// *
// */
//ydn.db.WebSql.prototype.getItem = function(key) {
//  var d = new goog.async.Deferred();
//  var self = this;
//
//  var sql = 'SELECT id, value FROM ' + ydn.db.Storage.DEFAULT_TEXT_STORE +
//      " WHERE id = '" + key + "'";
//
//  /**
//   * @param {SQLTransaction} transaction transaction.
//   * @param {SQLResultSet} results results.
//   */
//  var callback = function(transaction, results) {
//    var value;
//    if (results.rows.length > 0) {
//      var row = results.rows.item(0);
//      goog.asserts.assert(key == row['id'], key + ' = ' + row['id'] + ' ?');
//      value = row['value'];
//    }
//    d.callback(value);
//  };
//
//  /**
//   * @param {SQLTransaction} tr transaction.
//   * @param {SQLError} error error.
//   */
//  var error_callback = function(tr, error) {
//    if (ydn.db.WebSql.DEBUG) {
//      window.console.log([tr, error]);
//    }
//    self.logger.warning('Sqlite error: ' + error);
//    d.errback(undefined);
//  };
//
//  this.db.transaction(function(t) {
//    t.executeSql(sql, [], callback, error_callback);
//  });
//
//  return d;
//};

//
///**
// * Query list of objects.
// * @param {string} table table name.
// * @param {string} column column name.
// * @param {string} value query value.
// * @return {!goog.async.Deferred} return as deferred function.
// */
//ydn.db.WebSql.prototype.getObjects = function(table, column, value) {
//  var d = new goog.async.Deferred();
//  var self = this;
//
//  var sql = 'SELECT * FROM "' + table + '" WHERE ' +
//      goog.string.quote(column) + ' = ' + goog.string.quote(value);
//
//  /**
//   * @param {SQLTransaction} transaction transaction.
//   * @param {SQLResultSet} results results.
//   */
//  var callback = function(transaction, results) {
//    var values = [];
//    for (var i = 0; i < results.rows.length - 1; i++) {
//      var row = results.rows.item(i);
//      var unquoted_value = /** @type {String} */ (ydn.json.parse(row['value']));
//      // the first parse for unquoting.
//      goog.asserts.assertString(unquoted_value);
//      //var value = ydn.json.parse(/** @type {string} */ (unquoted_value));
//      values.push(unquoted_value);
//    }
//    d.callback(values);
//  };
//
//  /**
//   * @param {SQLTransaction} tr transaction.
//   * @param {SQLError} error error.
//   */
//  var error_callback = function(tr, error) {
//    if (ydn.db.WebSql.DEBUG) {
//      window.console.log([tr, error]);
//    }
//    self.logger.warning('Sqlite error: ' + error);
//    d.errback(undefined);
//  };
//
//  this.db.transaction(function(t) {
//    //console.log(sql);
//    t.executeSql(sql, [], callback, error_callback);
//  });
//
//  return d;
//};


/**
 * @inheritDoc
 */
ydn.db.WebSql.prototype.fetch = function(q) {
  var d = new goog.async.Deferred();
//  var self = this;
//
//  var column = q.field || this.schema[q.table].keyPath;
//  var op = q.op == ydn.db.Query.Op.START_WITH ? ' LIKE ' : ' = ';
//  var sql = 'SELECT * FROM ' + goog.string.quote(q.table) + ' WHERE ';
//  if (q.op == ydn.db.Query.Op.START_WITH) {
//    sql += '(' + column + ' LIKE ?)';
//  } else {
//    sql += '(' + goog.string.quote(column) + ' = ?)';
//  }
//
//  /**
//   * @param {SQLTransaction} transaction transaction.
//   * @param {SQLResultSet} results results.
//   */
//  var callback = function(transaction, results) {
//    var values = [];
//    for (var i = 0; i < results.rows.length; i++) {
//      var row = results.rows.item(i);
//      var unquoted_value = /** @type {String} */ (ydn.json.parse(row['value']));
//      // the first parse for unquoting.
//      //goog.asserts.assertString(unquoted_value);
//      //var value = ydn.json.parse(/** @type {string} */ (unquoted_value));
//      values.push(unquoted_value);
//    }
//    d.callback(values);
//  };
//
//  /**
//   * @param {SQLTransaction} tr transaction.
//   * @param {SQLError} error error.
//   */
//  var error_callback = function(tr, error) {
//    if (ydn.db.WebSql.DEBUG) {
//      window.console.log([tr, error]);
//    }
//    self.logger.warning('Sqlite error: ' + error);
//    d.errback(undefined);
//  };
//
//  this.db.transaction(function(t) {
//    var v = q.value + '%';
//    //console.log(sql + ' | ' + v);
//    t.executeSql(sql, [v], callback, error_callback);
//  });

  return d;
};

//
///**
// *
// * @return {!goog.async.Deferred} return list of key in {@code Array.<string>}.
// */
//ydn.db.WebSql.prototype.keys = function() {
//  var d = new goog.async.Deferred();
//  var self = this;
//
//  var sql = 'SELECT id FROM ' + ydn.db.Storage.DEFAULT_TEXT_STORE;
//
//  /**
//   * @param {SQLTransaction} transaction transaction.
//   * @param {SQLResultSet} results results.
//   */
//  var callback = function(transaction, results) {
//    var ids = [];
//    for (var i = results.rows.length - 1; i >= 0; i--) {
//      var item = results.rows.item(i);
//      ids.push(item['id']);
//    }
//    d.callback(ids);
//  };
//
//  /**
//   * @param {SQLTransaction} tr transaction.
//   * @param {SQLError} error error.
//   */
//  var error_callback = function(tr, error) {
//    if (ydn.db.WebSql.DEBUG) {
//      window.console.log([tr, error]);
//    }
//    self.logger.warning('Sqlite error: ' + error);
//    d.errback(undefined);
//  };
//
//  this.db.transaction(function(t) {
//    t.executeSql(sql, [], callback, error_callback);
//  });
//
//  return d;
//};


/**
 * Deletes all objects from the store.
 * @param {string=} opt_table table name.
 * @return {!goog.async.Deferred} return deferred function.
 */
ydn.db.WebSql.prototype.clearStore = function(opt_table) {
  var d = new goog.async.Deferred();
  var self = this;

  opt_table = opt_table || ydn.db.Storage.DEFAULT_TEXT_STORE;
  var sql = 'DELETE FROM  ' + opt_table;

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
    self.logger.warning('Sqlite error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function(t) {
    t.executeSql(sql, [], callback, error_callback);
  });
  return d;
};


/**
 * @inheritDoc
 */
ydn.db.WebSql.prototype.clear = function(table) {

  if (table) {
    return this.clearStore(table);
  } else {
    var dfs = [];
    for (var store in this.schema) {
      dfs.push(this.clearStore(store));
    }
    return ydn.async.reduceAllTrue(new goog.async.DeferredList(dfs));
  }
};


/**
 * @inheritDoc
 */
ydn.db.WebSql.prototype.getCount = function(table) {

  var d = new goog.async.Deferred();
  var self = this;

  table = table || ydn.db.Storage.DEFAULT_TEXT_STORE;
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
    self.logger.warning('getCount error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function(t) {
    t.executeSql(sql, [], callback, error_callback);
  });

  return d;
};







