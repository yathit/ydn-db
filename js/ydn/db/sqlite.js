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
 */

goog.provide('ydn.db.Sqlite');
goog.require('goog.events');
goog.require('goog.debug.Logger');
goog.require('ydn.db.Db');
goog.require('ydn.db.Query');
goog.require('goog.async.Deferred');
goog.require('ydn.json');
goog.require('ydn.async');


/**
 * @implements {ydn.db.Db}
 * @param {string} dbname
 * @param {Object=} schema table schema contain table name and keyPath
 * @param {string=} version
 * @constructor
 */
ydn.db.Sqlite = function (dbname, schema, version) {
  var self = this;
  this.version = version || '';
  dbname = dbname;
  this.dbname = dbname;
  this.schema = schema || {};
  this.schema[ydn.db.Db.DEFAULT_TEXT_STORE] = {'keyPath': 'id'};  // keyPath must be 'id'

  var estimatedSize = 5*1024*1024; // 5 MB
  var description = this.dbname;

  /**
   * @private
   * @type {Database}
   */
  this.db = goog.global.openDatabase(this.dbname, this.version, description, estimatedSize);

  for (var tablename in this.schema) {
    if (this.schema.hasOwnProperty(tablename)) {
      this.createTable(tablename);
    }
  }

};



/**
 *
 * @return {boolean}
 */
ydn.db.Sqlite.isSupported = function() {
  return goog.isFunction(goog.global.openDatabase);
};


/**
 *
 * @define {boolean}
 */
ydn.db.Sqlite.DEBUG = false;


/**
 * @protected
 * @final
 * @type {goog.debug.Logger}
 */
ydn.db.Sqlite.prototype.logger = goog.debug.Logger.getLogger('ydn.db.Sqlite');


/**
 * @private
 * @param {string} tablename
 * @return {!goog.async.Deferred}
 */
ydn.db.Sqlite.prototype.createTable = function (tablename) {
  var d = new goog.async.Deferred();
  var self = this;
  this.schema[tablename].keyPath = this.schema[tablename].keyPath || 'id';
  this.schema[tablename].keyParts = this.schema[tablename].keyPath.split('.');
  //this.schema[tablename].keyPath = this.schema[tablename].keyPath.replace('.', '');  // '.' in column name is OK.
  var keyPath = this.schema[tablename].keyPath;
  this.schema[tablename].keyPathQuoted = goog.string.quote(keyPath);
  var keyPathQuoted = this.schema[tablename].keyPathQuoted;

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var success_callback = function (transaction, results) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log(results);
    }
    self.logger.finest('Creating table: ' + tablename + ' OK.');
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('Error creating table: ' + tablename);
    d.errback(undefined);
  };

  var sql = "CREATE TABLE IF NOT EXISTS '" + tablename + "' (" + keyPathQuoted + " TEXT UNIQUE PRIMARY KEY, value TEXT)";
  this.db.transaction(function (t) {
    self.logger.info('Creating table '+ self.dbname + '.' + tablename + ' keyPath: ' + keyPath);
    t.executeSql(sql, [], success_callback, error_callback);
  });
  return d;
};



/**
 *
 * @param {string} key
 * @param {string=} table
 * @return {!goog.async.Deferred} boolean
 */
ydn.db.Sqlite.prototype.exists = function (key, table) {
  var self = this;
  var d = new goog.async.Deferred();
  table = table || ydn.db.Db.DEFAULT_TEXT_STORE;
  var keyPath = this.schema[table].keyPath;
  var keyPathQuoted = this.schema[table].keyPathQuoted;
  // NOTE: id cannot be quote.
  var sql = "SELECT " + keyPathQuoted +  " FROM '" + table + "' WHERE " + keyPathQuoted +  " = ?";

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var callback = function (transaction, results) {
    d.callback(results.rows.length > 0);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('exists error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function (tx) {
    //console.log(sql + ' ' + key);
    tx.executeSql(sql, [key], callback, error_callback)
  });
  return d;
};


/**
 *
 * @param {string} key
 * @param {string} value
 * @return {!goog.async.Deferred}
 */
ydn.db.Sqlite.prototype.put = function (key, value) {
  var d = new goog.async.Deferred();
  var self = this;

  var insert_sql = "INSERT INTO " + ydn.db.Db.DEFAULT_TEXT_STORE + " (value, id) VALUES (?,?)";
  var update_sql = "UPDATE " + ydn.db.Db.DEFAULT_TEXT_STORE + " SET value=? WHERE id=?";

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var success_callback = function (transaction, results) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log(results);
    }
    //self.logger.info('put ' + key);
    d.callback(true);
  };

  /**
   * @param {SQLError} error
   */
  var error_callback = function(error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log(error);
    }
    self.logger.warning('put error: ' + error);
    d.errback(undefined);
  };

  this.exists(key).addCallback(function (exists) { // FIXME how can we perform in one transaction ?
    var sql = exists ? update_sql : insert_sql;
    self.db.transaction(function (t) {
      t.executeSql(sql, [value, key], success_callback, error_callback);
    });
  });
  return d;
};


/**
 * @private
 * @param {string} table
 * @param {Object} value
 * @return {string}
 */
ydn.db.Sqlite.prototype.getKey = function(table, value) {
  var keyObj = value;
  for (var i = 0; i < this.schema[table].keyParts.length; i++) {
    keyObj = keyObj[this.schema[table].keyParts[i]];
    if (!goog.isDef(keyObj)) {
      this.logger.severe('key for ' + this.schema[table].keyParts[i] + ' not defined in ' + ydn.json.stringify(keyObj));
      throw new Error(this.schema[table].keyPath);
    }
  }
  goog.asserts.assertString(keyObj);
  /**
   * @type {string}
   */
  var key = keyObj;
  return key;
};


/**
 *
 * @param {Object|Array} value
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Sqlite.prototype.putObject = function (table, value) {
  var d = new goog.async.Deferred();
  var self = this;
  var keyPath = this.schema[table].keyPath;
  var keyPathQuoted = this.schema[table].keyPathQuoted;
  var arr = goog.isArray(value) ? value : [value];

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var success_callback = function (transaction, results) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log(results);
    }
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('putObjects error: ' + error);
    d.errback(undefined);
  };

  self.db.transaction(function (t) {
    for (var i = 0; i < arr.length; i++) {
      var last = i == arr.length - 1;
      var value_str = ydn.json.stringify(arr[i]);
      var key = self.getKey(table, arr[i]);
      var sql = 'INSERT OR REPLACE INTO "' + table + '" (' + keyPathQuoted + ', value) VALUES (?,?);';
      //console.log(sql + ' [' + key + ', ' + value_str + ']')
      t.executeSql(sql, [key, value_str], last ? success_callback : undefined, last ? error_callback : undefined);
    }
  });
  return d;
};


/**
 * Return object
 * @param {string} table
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.Sqlite.prototype.getObject = function (table, key) {
  var d = new goog.async.Deferred();
  var self = this;
  var keyPath = this.schema[table].keyPath;
  var keyPathQuoted = this.schema[table].keyPathQuoted;

  var sql = "SELECT " + keyPathQuoted + ", value FROM '" + table + "' WHERE " + keyPathQuoted + " = '" + key + "'";

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var callback = function (transaction, results) {
    var value;
    if (results.rows.length > 0) {
      var row = results.rows.item(0);
      goog.asserts.assert(key == row[keyPath], key + ' = ' + row[keyPath] + ' ?');
      value = /** @type {String} */ (ydn.json.parse(row['value']));  // the first parse for unquoting.
      //goog.asserts.assertString(unquoted_value);
      //value = ydn.json.parse(/** @type {string} */ (unquoted_value));
    }
    d.callback(value);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('Sqlite error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function (t) {
    //console.log(sql);
    t.executeSql(sql, [], callback, error_callback);
  });

  return d;
};


/**
 *
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.Sqlite.prototype.get = function (key) {
  var d = new goog.async.Deferred();
  var self = this;

  var sql = 'SELECT id, value FROM ' + ydn.db.Db.DEFAULT_TEXT_STORE + " WHERE id = '" + key + "'";

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var callback = function (transaction, results) {
    var value;
    if (results.rows.length > 0) {
      var row = results.rows.item(0);
      goog.asserts.assert(key == row['id'], key + ' = ' + row['id'] + ' ?');
      value = row['value'];
    }
    d.callback(value);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('Sqlite error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function (t) {
    t.executeSql(sql, [], callback, error_callback);
  });

  return d;
};


/**
 * Return object
 * @param {string} table
 * @param {string} column
 * @param {string} value
 * @return {!goog.async.Deferred}
 */
ydn.db.Sqlite.prototype.getObjects = function (table, column, value) {
  var d = new goog.async.Deferred();
  var self = this;

  var sql = 'SELECT * FROM "' + table + '" WHERE ' +
      goog.string.quote(column) + " = " + goog.string.quote(value);

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var callback = function (transaction, results) {
    var values = [];
    for (var i = 0; i < results.rows.length - 1; i++) {
      var row = results.rows.item(i);
      var unquoted_value = /** @type {String} */ (ydn.json.parse(row['value']));  // the first parse for unquoting.
      goog.asserts.assertString(unquoted_value);
      //var value = ydn.json.parse(/** @type {string} */ (unquoted_value));
      values.push(unquoted_value);
    }
    d.callback(values);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('Sqlite error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function (t) {
    //console.log(sql);
    t.executeSql(sql, [], callback, error_callback);
  });

  return d;
};



/**
 * Return object
 * @param {ydn.db.Query} q
 * @return {!goog.async.Deferred}
 */
ydn.db.Sqlite.prototype.fetch = function (q) {
  var d = new goog.async.Deferred();
  var self = this;

  var column = q.field || this.schema[q.table].keyPath;
  var op = q.op == ydn.db.Query.Op.START_WITH ? " LIKE " : " = ";
  var sql = 'SELECT * FROM ' + goog.string.quote(q.table) + ' WHERE ';
  if (q.op == ydn.db.Query.Op.START_WITH ) {
    sql += '(' + column + ' LIKE ?)';
  } else {
    sql += '(' + goog.string.quote(column) + ' = ?)';
  }

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var callback = function (transaction, results) {
    var values = [];
    for (var i = 0; i < results.rows.length; i++) {
      var row = results.rows.item(i);
      var unquoted_value = /** @type {String} */ (ydn.json.parse(row['value']));  // the first parse for unquoting.
      //goog.asserts.assertString(unquoted_value);
      //var value = ydn.json.parse(/** @type {string} */ (unquoted_value));
      values.push(unquoted_value);
    }
    d.callback(values);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('Sqlite error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function (t) {
    var v = q.value + '%';
    //console.log(sql + ' | ' + v);
    t.executeSql(sql, [v], callback, error_callback);
  });

  return d;
};


/**
 *
 * @return {!goog.async.Deferred} {@code Array.<string>}
 */
ydn.db.Sqlite.prototype.keys = function () {
  var d = new goog.async.Deferred();
  var self = this;

  var sql = 'SELECT id FROM ' + ydn.db.Db.DEFAULT_TEXT_STORE;

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var callback = function (transaction, results) {
    var ids = [];
    for (var i = results.rows.length - 1; i >= 0; i--) {
      var item = results.rows.item(i);
      ids.push(item['id']);
    }
    d.callback(ids);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('Sqlite error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function (t) {
    t.executeSql(sql, [], callback, error_callback);
  });

  return d;
};


/**
 * Deletes all objects from the store.
 * @param {string=} table
 * @return {!goog.async.Deferred}
 */
ydn.db.Sqlite.prototype.clearStore = function (table) {
  var d = new goog.async.Deferred();
  var self = this;

  table = table || ydn.db.Db.DEFAULT_TEXT_STORE;
  var sql = "DELETE FROM  " + table;

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var callback = function (transaction, results) {
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('Sqlite error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function (t) {
    t.executeSql(sql, [], callback, error_callback);
  });
  return d;
};

/**
 * Deletes the store.
 * @param {string=} table
 * @return {!goog.async.Deferred}
 */
ydn.db.Sqlite.prototype.clear = function (table) {

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
ydn.db.Sqlite.prototype.getCount = function (table) {

  var d = new goog.async.Deferred();
  var self = this;

  table = table || ydn.db.Db.DEFAULT_TEXT_STORE;
  var sql = 'SELECT COUNT(*) FROM ' + table;

  /**
   * @param {SQLTransaction} transaction
   * @param {SQLResultSet} results
   */
  var callback = function (transaction, results) {
    var row = results.rows.item(0);
    //console.log(['row ', row  , results]);
    d.callback(row['COUNT(*)']);
  };

  /**
   * @param {SQLTransaction} tr
   * @param {SQLError} error
   */
  var error_callback = function(tr, error) {
    if (ydn.db.Sqlite.DEBUG) {
      window.console.log([tr, error]);
    }
    self.logger.warning('getCount error: ' + error);
    d.errback(undefined);
  };

  this.db.transaction(function (t) {
    t.executeSql(sql, [], callback, error_callback);
  });

  return d;

//  var d = new goog.async.Deferred();
//  this.keys().addCallback(function(keys) {
//    if (keys) {
//      d.callback(keys.length);
//    } else {
//      d.errback(undefined);
//    }
//  });
//  return d;
};







