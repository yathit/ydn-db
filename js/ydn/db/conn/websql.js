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
 * @fileoverview WebSQL database connector.
 *
 * @see http://www.w3.org/TR/webdatabase/
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.con.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('goog.functions');
goog.require('ydn.async');
goog.require('ydn.db.SecurityError');
goog.require('ydn.db.base');
goog.require('ydn.db.con.IDatabase');
goog.require('ydn.json');
goog.require('ydn.string');
goog.require('ydn.debug.error.NotImplementedException');


/**
 * Construct a WebSql database connector.
 * Note: Version is ignored, since it does work well.
 * @param {number=} opt_size estimated database size. Default to 5 MB.
 * @implements {ydn.db.con.IDatabase}
 * @constructor
 */
ydn.db.con.WebSql = function(opt_size) {


  // Safari default limit is slightly over 4 MB, so we ask the largest storage
  // size but, still not don't bother to user.
  // Opera don't ask user even request for 1 GB.
  /**
   * @private
   * @final
   * @type {number}
   */
  this.size_ = goog.isDef(opt_size) ? opt_size : 4 * 1024 * 1024; // 5 MB

};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.connect = function(dbname, schema) {

  var description = dbname;


  /**
   * @type {ydn.db.con.WebSql}
   */
  var me = this;

  var old_version = NaN;
  var init_migrated = false;
  var df = new goog.async.Deferred();

  /**
   *
   * @param {Database} db database.
   * @param {Error=} e error object only in case of error.
   */
  var setDb = function(db, e) {
    if (goog.isDef(e)) {
      me.sql_db_ = null;
      df.errback(e);

    } else {
      me.sql_db_ = db;
      df.callback(parseFloat(old_version));
    }
  };


  /**
   * Migrate from current version to the last version.
   * @private
   * @param {Database} db database.
   * @param {ydn.db.schema.Database} schema  schema.
   * @param {boolean=} is_version_change version change or not.
   */
  var doVersionChange_ = function(db, schema, is_version_change) {

    var action = is_version_change ? 'changing version' : 'setting version';
    me.logger.finest(dbname + ': ' + action + ' from ' +
      db.version + ' to ' + schema.version);

    //var mode = is_version_change ?
    //    ydn.db.base.TransactionMode.VERSION_CHANGE :
    // ydn.db.base.TransactionMode.READ_WRITE;

    // HACK: VERSION_CHANGE can cause subtle error.
    var mode = ydn.db.base.TransactionMode.READ_WRITE;
    // yes READ_WRITE mode can create table and more robust. :-D


    var executed = false;
    var updated_count = 0;

    /**
     * SQLTransactionCallback
     * @param {!SQLTransaction} tx transaction object.
     */
    var transaction_callback = function(tx) {
      // sniff current table info in the database.
      me.getSchema(function(table_infos) {
        executed = true;
        for (var i = 0; i < schema.count(); i++) {
          var counter = function() {
            updated_count++;
          };
          var table_info = table_infos.getStore(schema.store(i).getName());
          me.update_store_with_info_(tx, schema.store(i), counter, table_info);
        }

        if (schema instanceof ydn.db.schema.EditableDatabase) {
          var edited_schema = schema;
          for (var j = 0; j < table_infos.count(); j++) {
            var info_store = table_infos.store(j);
            if (!edited_schema.hasStore(info_store.getName())) {
              edited_schema.addStore(info_store);
            }
          }
        } else {

        }

      }, tx, db);
    };

    /**
     * SQLVoidCallback
     */
    var success_callback = function() {
      var has_created = updated_count == schema.stores.length;
      if (!executed) {
        // success callback without actually executing
        me.logger.warning(dbname + ': ' + action + ' voided.');
        //if (!me.df_sql_db_.hasFired()) { // FIXME: why need to check ?
        // this checking is necessary when browser prompt user,
        // this migration function run two times: one creating table
        // and one without creating table. How annoying ?
        // testing is in /test/test_multi_storage.html page.
      } else {
        var msg = '.';
        if (updated_count != schema.stores.length) {
          msg = ' but unexpected stores exists.';
        }
        me.logger.finest(dbname + ':' + db.version + ' ready' + msg);
        setDb(db);
      }
    };

    /**
     * SQLTransactionErrorCallback
     * @param {SQLError} e error.
     */
    var error_callback = function(e) {
      throw e;
    };

    db.transaction(transaction_callback, error_callback, success_callback);

  };


  /**
   * @type {Database}
   */
  var db = null;

  var creationCallback = function(e) {
    var msg = init_migrated ?
      ' and already migrated, but migrating again.' : ', migrating.';
    me.logger.finest('receiving creation callback ' + msg);

    // the standard state that we should call VERSION_CHANGE request on
    // this callback.
    // http://www.w3.org/TR/webdatabase/#dom-opendatabase
    var use_version_change_request = true;

    //if (!init_migrated) {
      // yeah, to make sure.
      doVersionChange_(db, schema, use_version_change_request);
    //}
  };


  try {
    /**
     * http://www.w3.org/TR/webdatabase/#dom-opendatabase
     *
     * Opening robust web database is tricky. Mainly due to the fact that
     * an empty database is created even if user deny to create the database.
     */
    var version = schema.isAutoVersion() ? '' : schema.version + '';

    // From the W3C description:
    // <snap>
    // If the database version provided is not the empty string, and there is
    // already a database with the given name from the origin origin, but the
    // database has a different version than the version provided, then throw
    // an INVALID_STATE_ERR exception and abort these steps.
    // </snap>
    //
    // Since we have no way of knowing, the database with different version
    // already exist in user browser, opening a version database with specific
    // version is unwise.
    //
    // Interestingly chrome and (Safari on OS X) do not emmit INVALID_STATE_ERR
    // even if the database already exist. It simply invokes creationCallback,
    // as it should.
    //

    if (ydn.db.con.WebSql.GENTLE_OPENING) {
      // this works in Chrome, Safari and Opera
      db = goog.global.openDatabase(dbname, '', description,
        this.size_);
    } else {
      try {
        // this works in Chrome and OS X Safari even if the specified
        // database version does not exist. Other browsers throw
        // INVALID_STATE_ERR
        db = goog.global.openDatabase(dbname, version, description,
          this.size_, creationCallback);
      } catch (e) {
        if (e.name == 'INVALID_STATE_ERR') {
          // fail back to gentle opening.
          db = goog.global.openDatabase(dbname, '', description,
            this.size_);
        } else {
          throw e;
        }
      }
    }
  } catch (e) {
    if (e.name == 'SECURITY_ERR') {
      this.logger.warning('SECURITY_ERR for opening ' + dbname);
      db = null; // this will purge the tx queue
      // throw new ydn.db.SecurityError(e);
      // don't throw now, so that web app can handle without using
      // database.
      this.last_error_ = new ydn.db.SecurityError(e);

    } else {
      throw e;
    }
  }

  if (!db) {
    setDb(null, this.last_error_);
  } else {

    // Even if db version are the same, we cannot assume schema are as expected.
    // Sometimes database is just empty with given version.

    // in case previous database fail, but user granted in next refresh.
    // In this case, empty database of the request version exist,
    // but no tables.

    // WebSQL return limbo database connection,
    // if user haven't decieted whether to allow to deny the storage.
    // the limbo database connection do not execute transaction.

    // version change concept in WebSQL is broken.
    // db.transaction request can alter or create table, which suppose to
    // be done only with db.changeVersion request.

    // the approach we taking here is, we still honour visioning of database
    // but, we do not assume, opening right version will have correct
    // schema as expected. If not correct, we will correct to the schema,
    // without increasing database version.

    old_version = db.version;
    if (db.version === version) {
      this.logger.finest('Existing database version ' + db.version +
        ' opened.');
    } else {
      me.logger.finest('Database version ' + db.version +
        ' opened, but require ' + version + ' version.');
    }

    if (!schema.isAutoVersion() && db.version < version) {
      me.logger.finest('Upgrading to version: ' + version);
    }

    doVersionChange_(db, schema, false);
  }

  return df;
};


/**
 * @define {boolean} gentle opening do not specify version number on open
 * method invokation.
 */
ydn.db.con.WebSql.GENTLE_OPENING = true;


/**
 * @const
 * @type {string} type.
 */
ydn.db.con.WebSql.TYPE = 'websql';


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.getType = function() {
  return ydn.db.con.WebSql.TYPE;
};


/**
 *
 * @type {Error} error.
 * @private
 */
ydn.db.con.WebSql.prototype.last_error_ = null;


/**
 * @type {Database} database instance.
 * @private
 */
ydn.db.con.WebSql.prototype.sql_db_ = null;


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.getDbInstance = function() {
  return this.sql_db_ || null;
};


/**
 *
 * @return {boolean} true if supported.
 */
ydn.db.con.WebSql.isSupported = function() {
  return goog.isFunction(goog.global.openDatabase);
};


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.con.WebSql.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.WebSql.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.con.WebSql');


/**
 * Clone and transform the schema to be compatible with websql datastructure.
 * @private
 * @param {ydn.db.schema.Store} table_schema Original schema.
 * @return {ydn.db.schema.Store} Schema to use to generate sql commands.
 */
ydn.db.con.WebSql.prototype.prepareTableSchema_ = function(table_schema) {

  var schema = {};
  schema.name = table_schema.getName();
  schema.keyPath = table_schema.getKeyPath() || ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  schema.type = table_schema.type || 'BLOB';
  if (goog.isArray(schema.type)) {
    schema.type = ydn.db.schema.DataType.TEXT;
  }
  schema.autoIncrement = table_schema.autoIncrement
  schema.indexes = [];

  var column_names = [];
  column_names.push(table_schema.keyPath);
  for (var i = 0; i < table_schema.indexes.length; i++) {
    /**
     * @type {ydn.db.schema.Index}
     */
    var index = table_schema.indexes[i];

    if (index.keyPath == table_schema.getKeyPath()) {
      continue;
    }

    if (goog.isArray(index.getType())) {
      var types = index.getType();
      var keyPaths = index.getKeyPath();
      for(var j = 0; j<keyPaths.length; j++) {
        if (column_names.indexOf(keyPaths[j]) >= 0) {
          continue;
        }
        var idx = {name:keyPaths[j], keyPath: keyPaths[j], type: types[j]};
        schema.indexes.push(idx);
        column_names.push(keyPaths[j]);
      }
    } else {
      if (column_names.indexOf(index.getKeyPath()) == -1) {
        var keyPath = index.getKeyPath();
        var idx = {name:keyPath, keyPath: keyPath, type: index.getType()};
        schema.indexes.push(idx);
        column_names.push(keyPath);
      }
    }

  }

  return ydn.db.schema.Store.fromJSON(schema);

}
/**
 * Initialize variable to the schema and prepare SQL statement for creating
 * the table.
 * @private
 * @param {ydn.db.schema.Store} table_schema name of table in the schema.
 * @return {!Array.<string>} SQL statement for creating the table.
 */
ydn.db.con.WebSql.prototype.prepareCreateTable_ = function(table_schema) {

  var sql = 'CREATE TABLE IF NOT EXISTS ' + table_schema.getQuotedName() + ' (';

  // undefined type are recorded in encoded key and use BLOB data type
  // @see ydn.db.utils.encodeKey
  var column_names = [];

  sql += table_schema.getQuotedKeyPath() + ' ' + table_schema.type + ' UNIQUE PRIMARY KEY ';

  if (table_schema.autoIncrement) {
    sql += ' AUTOINCREMENT ';
  }

  column_names.push(table_schema.keyPath);

  // every table must has a default field to store schemaless fields
  sql += ' ,' + ydn.db.base.DEFAULT_BLOB_COLUMN + ' ' +
    ydn.db.schema.DataType.BLOB;

  var sqls = [];
  var sep = ', ';
  for (var i = 0; i < table_schema.indexes.length; i++) {
    /**
     * @type {ydn.db.schema.Index}
     */
    var index = table_schema.indexes[i];
    var unique = index.unique ? ' UNIQUE ' : ' ';


    // http://sqlite.org/lang_createindex.html
    // http://www.sqlite.org/lang_createtable.html
    // Indexing just the column seems like counter productive. ?
    /*
     INTEGER PRIMARY KEY columns aside, both UNIQUE and PRIMARY KEY constraints
     are implemented by creating an index in the database (in the same way as a
     "CREATE UNIQUE INDEX" statement would). Such an index is used like any
     other index in the database to optimize queries. As a result, there often
     no advantage (but significant overhead) in creating an index on a set of
     columns that are already collectively subject to a UNIQUE or PRIMARY KEY
     constraint.
     */
    //if (index.type != ydn.db.schema.DataType.BLOB) {
    //  var idx_sql = 'CREATE ' + unique + ' INDEX IF NOT EXISTS ' +
    //      goog.string.quote(index.name) +
    //      ' ON ' + table_schema.getQuotedName() +
    //      ' (' + goog.string.quote(index.getKeyPath()) + ')';
    //  sqls.push(idx_sql);
    //}

    if (column_names.indexOf(index.getKeyPath()) == -1) {
      var key_path = index.getKeyPath();
      goog.asserts.assertString(key_path);
      sql += sep + goog.string.quote(key_path) + ' ' + index.getType() +
        unique;
      column_names.push(key_path);
    }

  }

  sql += ');';
  sqls.unshift(sql);

  return sqls;
};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.getVersion = function() {
  return this.sql_db_ ? parseFloat(this.sql_db_.version) : undefined;
};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.getSchema = function(callback, trans, db) {

  var me = this;
  db = db || this.sql_db_;

  var version = (db && db.version) ?
      parseInt(db.version, 10) : undefined;
  version = isNaN(version) ? undefined : version;
  var stores = [];


  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {

    if (!results || !results.rows) {
      return;
    }
    for (var i = 0; i < results.rows.length; i++) {

      var info = /** @type {SqliteTableInfo} */ (results.rows.item(i));
      //console.log(info);

//      name: "st1"
//      rootpage: 5
//      sql: "CREATE TABLE "st1" ("id" TEXT UNIQUE PRIMARY KEY ,
//                                 _default_ undefined )"
//      tbl_name: "st1"
//      type: "table"

//      name: "sqlite_autoindex_st1_1"
//      rootpage: 6
//      sql: null
//      tbl_name: "st1"
//      type: "index"

      if (info.name == '__WebKitDatabaseInfoTable__') {
        continue;
      }
      if (info.name == 'sqlite_sequence') {
        // internal table used by Sqlite
        // http://www.sqlite.org/fileformat2.html#seqtab
        continue;
      }
      if (info.type == 'table') {
        var sql = goog.object.get(info, 'sql');
        me.logger.finest('Parsing table schema from SQL: ' + sql);
        var str = sql.substr(sql.indexOf('('), sql.lastIndexOf(')'));
        var column_infos = ydn.string.split_comma_seperated(str);

        var key_name = undefined;
        var key_type;
        var indexes = [];
        var autoIncrement = false;
        var has_default_blob_column = false;

        for (var j = 0; j < column_infos.length; j++) {

          var fields = ydn.string.split_space_seperated(column_infos[j]);
          var upper_fields = goog.array.map(fields, function(x) {return x.toUpperCase()});
          var name = goog.string.stripQuotes(fields[0], '"');
          var type = ydn.db.schema.Index.toType(upper_fields[1]);
          // console.log([fields[1], type]);

          if (upper_fields.indexOf('PRIMARY') != -1 && upper_fields.indexOf('KEY') != -1) {
            if (!goog.string.isEmpty(name)) {
              key_name = name;
            }
            key_type = type;
            if (upper_fields.indexOf('AUTOINCREMENT') != -1) {
              autoIncrement = true;
            }
          } else if (name == ydn.db.base.DEFAULT_BLOB_COLUMN) {
            has_default_blob_column = true;
          } else {
            var unique = upper_fields[2] == 'UNIQUE';
            var index = new ydn.db.schema.Index(name, type, unique);
            //console.log(index);
            indexes.push(index);
          }
        }

        var store = new ydn.db.schema.Store(info.name, key_name, autoIncrement,
            key_type, indexes, undefined, !has_default_blob_column);
        stores.push(store);
        //console.log([info, store]);
      }
    }
//    if (ydn.db.con.WebSql.DEBUG) {
//      window.console.log(out);
//    }

    var out = new ydn.db.schema.Database(version, stores);
    callback(out);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.con.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    throw error;
  };


  if (!trans) {

    var tx_error_callback = function(e) {
      me.logger.severe('opening tx: ' + e.message);
      throw e;
    };

    db.readTransaction(function(tx) {
        me.getSchema(callback, tx, db);
      }, tx_error_callback, success_callback);

    return;
  }

  // var sql = 'PRAGMA table_info(' + goog.string.quote(table_name) + ')';
  // Invoking this will result error of:
  //   "could not prepare statement (23 not authorized)"

  var sql = 'SELECT * FROM sqlite_master';

  trans.executeSql(sql, [], success_callback, error_callback);
};


/**
 *
 * @param {SQLTransaction} trans transaction.
 * @param {ydn.db.schema.Store} store_schema schema.
 * @param {Function} callback callback on finished.
 * @private
 */
ydn.db.con.WebSql.prototype.update_store_ = function(trans, store_schema,
                                                      callback) {
  var me = this;
  this.getSchema(function(table_infos) {
    var table_info = table_infos.getStore(store_schema.name);
    me.update_store_with_info_(trans, store_schema,
      callback, table_info);
  }, trans);
};


/**
 * Alter or create table with given table schema.
 * @param {SQLTransaction} trans transaction.
 * @param {ydn.db.schema.Store} table_schema table schema to be upgrade.
 * @param {Function} callback callback on finished.
 * @param {ydn.db.schema.Store|undefined} existing_table_schema table information in the
 * existing database.
 * @private
 */
ydn.db.con.WebSql.prototype.update_store_with_info_ = function(trans,
     table_schema, callback, existing_table_schema) {

  var me = this;

  var count = 0;

  var exe_sql = function(sql) {
    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function(transaction, results) {
      count++;
      if (count == sqls.length) {
        callback(true);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.con.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      throw new ydn.db.SQLError(error, 'Error creating table: ' +
          table_schema.name + ' ' + sql);
    };

    trans.executeSql(sql, [], success_callback, error_callback);
  };

  var schema = this.prepareTableSchema_(table_schema);
  var sqls = this.prepareCreateTable_(schema);

  var action = 'Create';
  if (existing_table_schema) {
    // table already exists.
    if (schema.similar(existing_table_schema)) {
      me.logger.finest(table_schema.name + ' exists.');
      callback(true);
    } else {
      action = 'Modify';

      // TODO: use ALTER
      this.logger.warning(
          'table: ' + table_schema.name + ' has changed,' +
          'but TABLE ALTERATION is not implemented, dropping old table.');
      sqls.unshift('DROP TABLE ' + goog.string.quote(table_schema.name));
    }
  }

  if (ydn.db.con.WebSql.DEBUG) {
    window.console.log([sqls, existing_table_schema]);
  }

  me.logger.finest(action + ' table: ' + table_schema.name + ': ' +
      sqls.join(';'));
  for (var i = 0; i < sqls.length; i++) {
    exe_sql(sqls[i]);
  }


};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.isReady = function() {
  return !!this.sql_db_;
};


/**
 * @final
 */
ydn.db.con.WebSql.prototype.close = function() {
  // WebSQl API do not have close method.
};


/**
 * @inheritDoc
 * @protected
 */
ydn.db.con.WebSql.prototype.doTransaction = function(trFn, scopes, mode,
                                                      completed_event_handler) {

  var me = this;

  /**
   * SQLTransactionCallback
   * @param {!SQLTransaction} tx transaction.
   */
  var transaction_callback = function(tx) {
    trFn(tx);
  };

  /**
   * SQLVoidCallback
   */
  var success_callback = function() {
    completed_event_handler(ydn.db.base.TransactionEventTypes.COMPLETE,
      {'type': ydn.db.base.TransactionEventTypes.COMPLETE});
  };

  /**
   * SQLTransactionErrorCallback
   * @param {SQLError} e error.
   */
  var error_callback = function(e) {
    me.logger.finest(me + ': Tx ' + mode + ' request cause error.');
    completed_event_handler(ydn.db.base.TransactionEventTypes.ERROR, e);
  };

  if (goog.isNull(this.sql_db_)) {
    // this happen on SECURITY_ERR
    trFn(null);
    completed_event_handler(ydn.db.base.TransactionEventTypes.ERROR,
      this.last_error_);
  }

  if (mode == ydn.db.base.TransactionMode.READ_ONLY) {
    this.sql_db_.readTransaction(transaction_callback,
      error_callback, success_callback);
  } else if (mode == ydn.db.base.TransactionMode.VERSION_CHANGE) {
    var next_version = this.sql_db_.version + 1;
    this.sql_db_.changeVersion(this.sql_db_.version, next_version + '',
      transaction_callback, error_callback, success_callback);
  } else {
    this.sql_db_.transaction(transaction_callback,
      error_callback, success_callback);
  }

  // TODO: deleting tables.

};


/**
 *
 * @param {string} db_name
 */
ydn.db.con.WebSql.deleteDatabase = function(db_name) {
  // WebSQL API does not expose deleting database.
  // Dropping all tables indeed delete the database.
  var db = new ydn.db.con.WebSql();
  var schema = new ydn.db.schema.EditableDatabase();
  var df = db.connect(db_name, schema);

  var on_completed = function(t, e) {
    db.logger.info('all tables in ' + db_name + ' deleted.');
  };

  df.addCallback(function() {

    db.doTransaction(function delete_tables(tx) {

      db.getSchema(function get_schema(existing_schema) {
        var n = existing_schema.count();
        if (n > 0) {
            for (var i = 0; i < n; i++) {
              var store = existing_schema.store(i);
              db.logger.finest('deleting table: ' + store.getName());
              tx.executeSql('DROP TABLE ' + store.getQuotedName());
            }
        } else {
          db.logger.info('no table to delete in ' + db_name);
        }
      }, tx);

    }, [], ydn.db.base.TransactionMode.READ_WRITE, on_completed);


  });
  df.addErrback(function() {
    db.logger.warning('Connecting ' + db_name + ' failed.');
  });
};
