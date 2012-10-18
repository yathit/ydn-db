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
goog.require('ydn.async');
goog.require('ydn.json');
goog.require('ydn.string');
goog.require('ydn.db.SecurityError');
goog.require('ydn.db.base');
goog.require('ydn.db.con.IDatabase');
goog.require('goog.functions');


/**
 * Construct WebSql database.
 * Note: Version is ignored, since it does work well.
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @param {number=} opt_size estimated database size. Default to 5 MB.
 * @implements {ydn.db.con.IDatabase}
 * @constructor
 */
ydn.db.con.WebSql = function(dbname, schema, opt_size) {
  var self = this;
  this.dbname = dbname;

  // Safari default limit is slightly over 4 MB, so we ask the largest storage
  // size but, still not don't bother to user.
  // Opera don't ask user even request for 1 GB.
  /**
   * @private
   * @final
   * @type {number}
   */
  this.size = goog.isDef(opt_size) ? opt_size : 4 * 1024 * 1024; // 5 MB

  this.connect(schema);
};


/**
 * @protected
 * @param {ydn.db.DatabaseSchema} schema
 */
ydn.db.con.WebSql.prototype.connect = function(schema) {

  var description = this.dbname;

  var init_migrated = false;


  /**
   * @type {Database}
   */
  var db = null;

  var me = this;
  var creationCallback = function(e) {
    var msg = init_migrated ?
      ' and already migrated, but migrating again.' : ', migrating.';
    me.logger.finest('receiving creation callback ' + msg);

    // the standard state that we should call VERSION_CHANGE request on
    // this callback.
    // http://www.w3.org/TR/webdatabase/#dom-opendatabase
    var use_version_change_request = true;

    //if (!init_migrated) {
      me.doVersionChange_(db, schema, use_version_change_request); // yeah, to make sure.
    //}
  };


  try {
    /**
     * http://www.w3.org/TR/webdatabase/#dom-opendatabase
     *
     * Opening robust web database is tricky. Mainly due to the fact that
     * an empty database is created even if user deny to create the database.
     */
    var version = schema.isAutoSchema() ? '' : schema.version + '';

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
      db = goog.global.openDatabase(this.dbname, '', description,
        this.size);
    } else {
      try {
        // this works in Chrome and OS X Safari even if the specified
        // database version does not exist. Other browsers throw INVALID_STATE_ERR
        db = goog.global.openDatabase(this.dbname, version, description,
          this.size, creationCallback);
      } catch (e) {
        if (e.name == 'INVALID_STATE_ERR') {
          // fail back to gentle opening.
          db = goog.global.openDatabase(this.dbname, '', description,
            this.size);
        } else {
          throw e;
        }
      }
    }
  } catch (e) {
    if (e.name == 'SECURITY_ERR') {
      this.logger.warning('SECURITY_ERR for opening ' + this.dbname);
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
    this.setDb(null, this.last_error_);
  } else  {

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

    if (db.version === version) {
      this.logger.finest('Existing database version ' + db.version +
        ' opened.');
    } else {
      me.logger.finest('Database version ' + db.version +
        ' opened, but require ' + version + ' version.');
    }

    if (!schema.isAutoSchema() && db.version < version) {
      me.logger.finest('Upgrading to version: ' + version);
    } else {
      me.doVersionChange_(db, schema, false);
    }
  }


};


/**
 *
 * @param {Database} db
 * @param {Error=} e
 * @private
 */
ydn.db.con.WebSql.prototype.setDb = function(db, e) {
  if (goog.isDef(e)) {
    this.sql_db_ = null;
    if (goog.isFunction(this.onConnected)) {
      this.onConnected(false, e);
    }
  } else {
    this.sql_db_ = db;
    this.onConnected(true);
  }
};


/**
 * @define {boolean}
 */
ydn.db.con.WebSql.GENTLE_OPENING = true;


/**
 * @const
 * @type {string}
 */
ydn.db.con.WebSql.TYPE = 'websql';

/**
 * @return {string}
 */
ydn.db.con.WebSql.prototype.type = function() {
  return ydn.db.con.WebSql.TYPE;
};



/**
 *
 * @type {Error}
 * @private
 */
ydn.db.con.WebSql.prototype.last_error_ = null;


/**
 * @type {Database}
 * @private
 */
ydn.db.con.WebSql.prototype.sql_db_ = null;




/**
 *
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
ydn.db.con.WebSql.prototype.logger = goog.debug.Logger.getLogger('ydn.db.con.WebSql');


/**
 * Initialize variable to the schema and prepare SQL statement for creating
 * the table.
 * @private
 * @param {ydn.db.StoreSchema} table_schema name of table in the schema.
 * @return {!Array.<string>} SQL statement for creating the table.
 */
ydn.db.con.WebSql.prototype.prepareCreateTable_ = function(table_schema) {

  var sql = 'CREATE TABLE IF NOT EXISTS ' + table_schema.getQuotedName() + ' (';

  var id_column_name = table_schema.getQuotedKeyPath() ||
    ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;

  var type = table_schema.type;
  if (type == ydn.db.DataType.ARRAY) {
    // key will be converted into string
    type = ydn.db.DataType.TEXT;
  }
  if (goog.isDefAndNotNull(table_schema.keyPath)) {
    sql += table_schema.getQuotedKeyPath() + ' ' + type + ' UNIQUE PRIMARY KEY ';

    if (table_schema.autoIncrement) {
      sql += ' AUTOINCREMENT ';
    }

  } else if (table_schema.autoIncrement) {
    sql += ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME + ' ' + type +
      ' UNIQUE PRIMARY KEY AUTOINCREMENT ';
  } else { // using out of line key.
    // it still has _ROWID_ as column name
    sql += ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME + ' ' + type + ' UNIQUE PRIMARY KEY ';

  }

  // every table must has a default field to store schemaless fields
  sql += ' ,' +  ydn.db.base.DEFAULT_BLOB_COLUMN + ' ' + ydn.db.DataType.BLOB;

  var sqls = [];
  var sep = ', ';
  for (var i = 0; i < table_schema.indexes.length; i++) {
    /**
     * @type {ydn.db.IndexSchema}
     */
    var index = table_schema.indexes[i];
    var unique = index.unique ? ' UNIQUE ' : ' ';

    // http://sqlite.org/lang_createindex.html
    if (index.type != ydn.db.DataType.BLOB) {
      var idx_sql = 'CREATE ' + unique + ' INDEX IF NOT EXISTS '  +
          goog.string.quote(index.name) +
          ' ON ' + table_schema.getQuotedName() + ' (' + id_column_name + ')';
      sqls.push(idx_sql);
    }

    if (index.keyPath == table_schema.keyPath) {
      continue;
    }

    sql += sep + goog.string.quote(index.keyPath) + ' ' + index.getType() + unique;

  }

  sql += ');';
  sqls.unshift(sql);

  return sqls;
};


/**
 * From Sqlite master table, reflect table information in the form of schema.
 * @param {function(ydn.db.DatabaseSchema)} callback
 * @param {SQLTransaction=} trans
 * @param {Database=} db
 */
ydn.db.con.WebSql.prototype.getSchema = function(callback, trans, db) {

  db = db || this.sql_db_;

  var version = (db && db.version) ?
      parseInt(db.version, 10) : undefined;
  version = isNaN(version) ? undefined : version;
  var out = new ydn.db.DatabaseSchema(version);


  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function (transaction, results) {

    for (var i = 0; i < results.rows.length; i++) {

      var info = /** @type {SqliteTableInfo} */ (results.rows.item(i));
      //console.log(info);

//      name: "st1"
//      rootpage: 5
//      sql: "CREATE TABLE "st1" ("id" TEXT UNIQUE PRIMARY KEY , _default_ undefined )"
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
      if (info.type == 'table') {

        var str = info.sql.substr(info.sql.indexOf('('), info.sql.lastIndexOf(')'));
        var column_infos = ydn.string.split_comma_seperated(str);

        var key_name = '';
        var key_type;
        var indexes = [];
        var autoIncrement = false;

        for (var j = 0; j < column_infos.length; j++) {

          var fields = ydn.string.split_space_seperated(column_infos[j]);
          var name = goog.string.stripQuotes(fields[0], '"');
          var type = ydn.db.IndexSchema.toType(fields[1]);
          // console.log([fields[1], type]);

          if (fields.indexOf('PRIMARY') != -1 && fields.indexOf('KEY') != -1) {
            key_name = name;
            key_type = type;
            if (fields.indexOf('AUTOINCREMENT') != -1) {
              autoIncrement = true;
            }
          } else if (name != ydn.db.base.DEFAULT_BLOB_COLUMN) {
            var unique = fields[2] == 'UNIQUE';
            var index = new ydn.db.IndexSchema(name, type, unique);
            //console.log(index);
            indexes.push(index);
          }

        }

        var store = new ydn.db.StoreSchema(info.name, key_name, autoIncrement,
            key_type, indexes);
        out.addStore(store);
        //console.log([info, store]);
      }
    }
//    if (ydn.db.con.WebSql.DEBUG) {
//      window.console.log(out);
//    }

    callback(out);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function (tr, error) {
    if (ydn.db.con.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    throw error;
  };


  if (!trans) {
    var me = this;

    db.readTransaction(function(tx) {
        me.getSchema(callback, tx, db);
      },
      function(e) {throw e;}, success_callback);

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
 * @param {SQLTransaction} trans
 * @param {ydn.db.StoreSchema} store_schema
 * @param {Function} callback
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
 * @param {SQLTransaction} trans
 * @param {ydn.db.StoreSchema} store_schema table schema to be upgrade
 * @param {Function} callback
 * @param {ydn.db.StoreSchema|undefined} table_info table information in the
 * existing database.
 * @private
 */
ydn.db.con.WebSql.prototype.update_store_with_info_ = function(trans, store_schema,
                                                      callback, table_info) {

  var me = this;

  var sqls = this.prepareCreateTable_(store_schema);

  if (ydn.db.con.WebSql.DEBUG) {
    window.console.log([sqls, table_info]);
  }

  var count = 0;

  var exe_sql = function (sql) {
    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function (transaction, results) {
      count++;
      if (count == sqls.length) {
        callback(true);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.con.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      throw new ydn.db.SQLError(error, 'Error creating table: ' +
          store_schema.name + ' ' + sql);
    };

    trans.executeSql(sql, [], success_callback, error_callback);
  };

  var action = 'Create';
  if (table_info) {
    // table already exists.
    if (store_schema.similar(table_info)) {
      me.logger.finest(store_schema.name + ' exists.');
      callback(true);
      return;
    } else {
      action = 'Modify';

      // TODO: use ALTER
    }
  }

  me.logger.finest(action + ' table: ' + store_schema.name + ': ' + sqls.join(';'));
  for (var i = 0; i < sqls.length; i++) {
    exe_sql(sqls[i]);
  }

};


/**
 * Migrate from current version to the last version.
 * @private
 * @param {Database} db
 * @param {ydn.db.DatabaseSchema} schema
 * @param {boolean=} is_version_change
 */
ydn.db.con.WebSql.prototype.doVersionChange_ = function (db, schema, is_version_change) {

  var action = is_version_change ? 'changing version' : 'setting version';
  this.logger.finest(this.dbname + ': ' + action + ' from ' +
    db.version + ' to ' + schema.version);

  //var mode = is_version_change ?
  //    ydn.db.base.TransactionMode.VERSION_CHANGE : ydn.db.base.TransactionMode.READ_WRITE;

  // HACK: VERSION_CHANGE can cause subtle error.
  var mode = ydn.db.base.TransactionMode.READ_WRITE;
  // yes READ_WRITE mode can create table and more robust. :-D

  /**
   *
   * @type {ydn.db.con.WebSql}
   */
  var me = this;

  var updated_count = 0;

  /**
   * SQLTransactionCallback
   * @param {!SQLTransaction} tx
   */
  var transaction_callback = function (tx) {
    // sniff current table info in the database.
    me.getSchema(function(table_infos) {

      for (var i = 0; i < schema.stores.length; i++) {
        var counter = function() {
          updated_count++;
        };
        var table_info = table_infos.getStore(schema.stores[i].name);
        me.update_store_with_info_(tx, schema.stores[i], counter, table_info);
      }

    }, tx, db);
  };

  /**
   * SQLVoidCallback
   */
  var success_callback = function () {
    var has_created = updated_count == schema.stores.length;
    if (!has_created) {
      // success callback without actually executing
      me.logger.warning(me.dbname + ': ' + action + ' voided.');
    } else {
      //if (!me.df_sql_db_.hasFired()) { // FIXME: why need to check ?
      // this checking is necessary when browser prompt user,
      // this migration function run two times: one creating table
      // and one without creating table. How annoying ?
      // testing is in /test/test_multi_storage.html page.
      me.logger.finest(me.dbname + ': ready.');
      me.setDb(db);
    }
  };

  /**
   * SQLTransactionErrorCallback
   * @param {SQLError} e
   */
  var error_callback = function (e) {
    throw e;
  };

  db.transaction(transaction_callback, error_callback, success_callback)




};


/**
 * @return {boolean}
 */
ydn.db.con.WebSql.prototype.isReady = function() {
  return !!this.sql_db_;
};


/**
 *
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.onConnected = null;



/**
 * @final
 */
ydn.db.con.WebSql.prototype.close = function () {
  // WebSQl API do not have close method.
};


/**
 * Run a transaction. If already in transaction, this will join the transaction.
 * @param {function(SQLTransaction)|Function} trFn
 * @param {Array.<string>} scopes
 * @param {ydn.db.base.TransactionMode} mode
 * @param {function(ydn.db.base.TransactionEventTypes, *)} completed_event_handler
 * @protected
 */
ydn.db.con.WebSql.prototype.doTransaction = function (trFn, scopes, mode, completed_event_handler) {


  var me = this;

  /**
   * SQLTransactionCallback
   * @param {!SQLTransaction} tx
   */
  var transaction_callback = function (tx) {
    trFn(tx);
  };

  /**
   * SQLVoidCallback
   */
  var success_callback = function () {
    completed_event_handler(ydn.db.base.TransactionEventTypes.COMPLETE,
      {'type':ydn.db.base.TransactionEventTypes.COMPLETE});
  };

  /**
   * SQLTransactionErrorCallback
   * @param {SQLError} e
   */
  var error_callback = function (e) {
    me.logger.finest(me + ': Tx ' + mode + ' request cause error.');
    completed_event_handler(ydn.db.base.TransactionEventTypes.ERROR, e);
  };

  if (goog.isNull(this.sql_db_)) {
    // this happen on SECURITY_ERR
    trFn(null);
    completed_event_handler(ydn.db.base.TransactionEventTypes.ERROR, this.last_error_);
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
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.addStoreSchema = function(tx, store_schema) {
  var df = new goog.async.Deferred();
  var callback = function() {
    df.callback(true);
  };
  this.update_store_(/** @type {SQLTransaction} */ (tx), store_schema,
    callback);
  return df;
};


/**
 * @override
 */
ydn.db.con.WebSql.prototype.toString = function() {
  var s = this.sql_db_ ? this.dbname + ':' + this.sql_db_.version : '';
  return this.type() + ':' + s;
};
