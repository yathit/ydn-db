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
 * @fileoverview Wrapper for Web SQL storage.
 *
 * @see http://www.w3.org/TR/webdatabase/
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.conn.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.json');
goog.require('ydn.db.SecurityError');
goog.require('ydn.db');
goog.require('ydn.db.conn.IDatabase');
goog.require('goog.functions');


/**
 * Construct WebSql database.
 * Note: Version is ignored, since it does work well.
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema=} schema table schema contain table
 * name and keyPath.
 * @param {number=} opt_size estimated database size. Default to 5 MB.
 * @implements {ydn.db.conn.IDatabase}
 * @constructor
 */
ydn.db.conn.WebSql = function(dbname, schema, opt_size) {
  var self = this;
  this.dbname = dbname;

  if (!goog.isDef(schema)) {
    schema = new ydn.db.DatabaseSchema();
  }

  /**
   * @final
   * @protected
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = schema; // we always use the last schema.

  var description = this.dbname;

  // Safari default limit is 5 MB, so we ask the largest storage size
  // but, still not don't bother to user.
  // Opera don't ask user even request for 1 GB.
  var size = goog.isDef(opt_size) ? opt_size : 5 * 1024 * 1024; // 5 MB

  /**
   * @final
   * @type {!goog.async.Deferred}
   * @private
   */
  this.df_sql_db_ = new goog.async.Deferred();

  var init_migrated = false;

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
      me.migrate_(use_version_change_request); // yeah, to make sure.
    //}
  };

  try {
    /**
     * http://www.w3.org/TR/webdatabase/#dom-opendatabase
     *
     * Opening robust web database is tricky. Mainly due to the fact that
     * an empty database is created even if user deny to create the database.
     */
    var version = goog.isDef(this.schema.version) ?
      this.schema.version + '' : '';
    this.sql_db_ = goog.global.openDatabase(this.dbname, version, description,
        size, creationCallback);

    if (this.sql_db_.version === version) {
      this.logger.finest('Existing database version ' + this.sql_db_.version +
         ' opened.');

      // OK. Use it immediately
      // this.df_sql_db_.callback(this.sql_db_);
      // oophs, sometime database is just empty

      // FIXME: still need to migrate
      // in case previous database fail, but user granted in next refresh.
      // In this case, empty database of the request version exist,
      // but no tables. gagarrrrrrr
      me.migrate_();
      // Nice thing is migrate_ is idempotent :-D
      // only just ugly calling every time, and most case, will be unnecessary.
      // however this do not effect performance
    } else {
      this.logger.finest('Database version ' + this.sql_db_.version +
        ' opened, but require ' + version + ' version.');
      // HACK: even if user do not yet response whether to allow storage,
      // we are trying to create tables.
      // this is because, when user decided to allow the database,
      // there is no callback to create tables. In IndexedDB API, there is
      // onupgradeneeded callback in such case.
      me.migrate_();
      // interesting fact is, transaction object do not execute SQL,
      // if user is not allow yet or denied.
      // in that case, our migration go limbo.
      // that is a reason, we need to migrate again, again and again,
      // ... every time, to make sure tables exist.
      init_migrated = true;
    }

  } catch (e) {
    if (e.name == 'SECURITY_ERR') {
      this.logger.warning('SECURITY_ERR for opening ' + this.dbname);
      this.sql_db_ = null; // this will purge the tx queue
      // throw new ydn.db.SecurityError(e);
      // don't throw now, so that web app can handle without using
      // database.
      this.last_error_ = new ydn.db.SecurityError(e);
      this.df_sql_db_.errback(this.last_error_);
    } else {
      throw e;
    }
  }



};


/**
 * @const
 * @type {string}
 */
ydn.db.conn.WebSql.TYPE = 'websql';

/**
 * @return {string}
 */
ydn.db.conn.WebSql.prototype.type = function() {
  return ydn.db.conn.WebSql.TYPE;
};


/**
 * Deferred object encapsulating database instance.
 * @type {*}
 * @private
 */
ydn.db.conn.WebSql.prototype.df_sql_db_ = null;


/**
 *
 * @type {Error}
 * @private
 */
ydn.db.conn.WebSql.prototype.last_error_ = null;


/**
 * @type {Database}
 * @private
 */
ydn.db.conn.WebSql.prototype.sql_db_ = null;


/**
 * @protected
 * @return {Database}
 */
ydn.db.conn.WebSql.prototype.getSqlDb = function() {
  return this.sql_db_;
};


/**
 *
 */
ydn.db.conn.WebSql.prototype.getDbInstance = function() {
  return this.sql_db_ || null;
};


/**
 *
 * @return {boolean} true if supported.
 */
ydn.db.conn.WebSql.isSupported = function() {
  return goog.isFunction(goog.global.openDatabase);
};


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.conn.WebSql.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.conn.WebSql.prototype.logger = goog.debug.Logger.getLogger('ydn.db.conn.WebSql');



/**
 * Initialize variable to the schema and prepare SQL statement for creating
 * the table.
 * @private
 * @param {ydn.db.StoreSchema} table_schema name of table in the schema.
 * @return {string} SQL statement for creating the table.
 */
ydn.db.conn.WebSql.prototype.prepareCreateTable_ = function(table_schema) {

  var sql = 'CREATE TABLE IF NOT EXISTS ' + table_schema.getQuotedName() + ' (';

  var id_column_name = table_schema.getQuotedKeyPath() ||
    ydn.db.SQLITE_SPECIAL_COLUNM_NAME;

  var type = table_schema.type;
  if (type == ydn.db.DataType.ARRAY) {
    // key will be converted into string
    type = ydn.db.DataType.TEXT;
  }
  if (goog.isDef(table_schema.keyPath)) {
    sql += table_schema.getQuotedKeyPath() + ' ' + type + ' UNIQUE PRIMARY KEY ';

    if (table_schema.autoIncremenent) {
      sql += ' AUTOINCREMENT ';
    }

  } else if (table_schema.autoIncremenent) {
    sql += ydn.db.SQLITE_SPECIAL_COLUNM_NAME + ' ' + type +
      ' UNIQUE PRIMARY KEY AUTOINCREMENT ';
  } else { // using out of line key.
    // it still has _ROWID_ as column name
    sql += ydn.db.SQLITE_SPECIAL_COLUNM_NAME + ' ' + type + ' UNIQUE PRIMARY KEY ';

  }


  // every table must has a default field.
  if (!table_schema.hasIndex(ydn.db.DEFAULT_BLOB_COLUMN)) {
    table_schema.addIndex(ydn.db.DEFAULT_BLOB_COLUMN);
  }

  var sep = ', ';
  for (var i = 0; i < table_schema.indexes.length; i++) {
    /**
     * @type {ydn.db.IndexSchema}
     */
    var index = table_schema.indexes[i];
    if (index.name == table_schema.keyPath) {
      continue;
    }
    var primary = index.unique ? ' UNIQUE ' : ' ';

    sql += sep + index.name + ' ' + index.type + primary;

  }

  sql += ');';

  return sql;
};


/**
 * @param {SQLTransaction} trans
 * @param {function(Object)} callback
 * @private
 */
ydn.db.conn.WebSql.prototype.table_info_ = function(trans, callback) {

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function (transaction, results) {

    var out = {};
    for (var i = 0; i < results.rows.length; i++) {

      var info = /** @type {SqliteTableInfo} */ (results.rows.item(i));

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

      if (info.type == 'table') {

        var str = info.sql.substr(info.sql.indexOf('('), info.sql.lastIndexOf(')'));
        var column_infos = ydn.string.split_comma_seperated(str);

        var table_info = {
          key: '',
          unique: false,
          type: '',
          indexes: [],
          sql: info.sql
        };

        for (var j = 0; j < column_infos.length; j++) {
          var fields = ydn.string.split_space_seperated(column_infos[j]);
          if (fields.indexOf('PRIMARY') != -1 && fields.indexOf('KEY') != -1) {
            table_info.key = goog.string.stripQuotes(fields[0], '"');
            table_info.type = fields[1];
            if (fields.indexOf('UNIQUE') != -1) {
              table_info.unique = true;
            }
          } else if (fields[0] != ydn.db.DEFAULT_BLOB_COLUMN) {
            var index = {
              name: goog.string.stripQuotes(fields[0], '"'),
              type: fields[1]};
            table_info.indexes.push(index);
          }
        }

        out[info.name] = table_info;
      }
    }
//    if (ydn.db.conn.WebSql.DEBUG) {
//      window.console.log(out);
//    }

    callback(out);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function (tr, error) {
    if (ydn.db.conn.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }

  };

  // var sql = 'PRAGMA table_info(' + goog.string.quote(table_name) + ')';
  // Invoking this will result error of:
  //   "could not prepare statement (23 not authorized)"

  var sql = 'select * from sqlite_master';

  trans.executeSql(sql, [], success_callback, error_callback);
};

/**
 *
 * @param {SQLTransaction} trans
 * @param {ydn.db.StoreSchema} store_schema
 * @param {Function} callback
 * @private
 */
ydn.db.conn.WebSql.prototype.update_store_ = function(trans, store_schema,
                                                      callback) {
  var me = this;
  this.table_info_(trans, function(table_infos) {
    me.update_store_with_info_(trans, store_schema,
      callback, table_infos);
  });
};


/**
 *
 * @param {SQLTransaction} trans
 * @param {ydn.db.StoreSchema} store_schema
 * @param {Function} callback
 * @param {Object} table_infos
 * @private
 */
ydn.db.conn.WebSql.prototype.update_store_with_info_ = function(trans, store_schema,
                                                      callback, table_infos) {

  var me = this;

  var sql = this.prepareCreateTable_(store_schema);
  var table_info = table_infos[store_schema.name];
  var ex_sql = table_info ? table_info.sql : '';

  if (ydn.db.conn.WebSql.DEBUG) {
    window.console.log([sql, ex_sql, table_info]);
  }

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function (transaction, results) {
    me.logger.finest(me.dbname + ' created table: ' + store_schema.name);
    callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function (tr, error) {
    if (ydn.db.conn.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    throw new ydn.db.SQLError(error, 'Error creating table: ' +
      store_schema.name);
  };

  trans.executeSql(sql, [], success_callback, error_callback);
};


/**
 * Migrate from current version to the last version.
 * @private
 * @param {boolean=} is_version_change
 */
ydn.db.conn.WebSql.prototype.migrate_ = function (is_version_change) {

  var action = is_version_change ? 'changing version' : 'setting version';
  this.logger.finest(this.dbname + ': ' + action + ' from ' +
    this.sql_db_.version + ' to ' + this.schema.version);

  //var mode = is_version_change ?
  //    ydn.db.TransactionMode.VERSION_CHANGE : ydn.db.TransactionMode.READ_WRITE;

  // HACK: VERSION_CHANGE can cause subtle error.
  var mode = ydn.db.TransactionMode.READ_WRITE;
  // yes READ_WRITE mode can create table and more robust. :-D

  var me = this;

  var updated_count = 0;

  var oncompleted = function (t, e) {
    var has_created = updated_count == me.schema.stores.length;
    if (!has_created) {
      me.logger.warning(me.dbname + ': ' + action + ' void.');
    } else {
      if (!me.df_sql_db_.hasFired()) { // FIXME: why need to check ?
        // this checking is necessary when browser prompt user,
        // this migration function run two times: one creating table
        // and one without creating table. How annoying ?
        // testing is in /test/test_multi_storage.html page.
        me.logger.finest(me.dbname + ': ready.');
        me.df_sql_db_.callback(me.sql_db_);
      } else {
        me.logger.warning(me.dbname + ': ready again?');
      }
      me.logger.finest(me.dbname + ': ' + action + ' completed.');
    }
  };

  this.doTransaction(function (t) {

    for (var i = 0; i < me.schema.stores.length; i++) {
      me.update_store_(t, me.schema.stores[i], function() {
        updated_count++;
      });
    }

  }, [], mode, oncompleted);

};


/**
 * @return {boolean}
 */
ydn.db.conn.WebSql.prototype.isReady = function() {
  return this.df_sql_db_.hasFired();
};


/**
 *
 * @inheritDoc
 */
ydn.db.conn.WebSql.prototype.onReady = function(cb, eb) {
  // due to the way, this work, database is always ready to use.
  this.df_sql_db_.addCallback(cb);
  this.df_sql_db_.addErrback(eb);
};



/**
 * @final
 */
ydn.db.conn.WebSql.prototype.close = function () {
  // WebSQl API do not have close method.
};


/**
 * Run a transaction. If already in transaction, this will join the transaction.
 * @param {function(SQLTransaction)|Function} trFn
 * @param {Array.<string>} scopes
 * @param {ydn.db.TransactionMode} mode
 * @param {function(ydn.db.TransactionEventTypes, *)} completed_event_handler
 * @protected
 */
ydn.db.conn.WebSql.prototype.doTransaction = function (trFn, scopes, mode, completed_event_handler) {
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
    completed_event_handler(ydn.db.TransactionEventTypes.COMPLETE,
      {'type':ydn.db.TransactionEventTypes.COMPLETE});
  };

  var me = this;
  /**
   * SQLTransactionErrorCallback
   * @param {SQLError} e
   */
  var error_callback = function (e) {
    me.logger.finest(me + ': Tx ' + mode + ' request cause error.');
    completed_event_handler(ydn.db.TransactionEventTypes.ERROR, e);
  };

  if (goog.isNull(this.sql_db_)) {
    // this happen on SECURITY_ERR
    trFn(null);
    completed_event_handler(ydn.db.TransactionEventTypes.ERROR, this.last_error_);
  }

  if (mode == ydn.db.TransactionMode.READ_ONLY) {
    this.sql_db_.readTransaction(transaction_callback,
      error_callback, success_callback);
  } else if (mode == ydn.db.TransactionMode.VERSION_CHANGE) {
    this.sql_db_.changeVersion(this.sql_db_.version, this.schema.version + '',
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
ydn.db.conn.WebSql.prototype.addStoreSchema = function(tx, store_schema) {
  this.update_store_(/** @type {SQLTransaction} */ (tx), store_schema,
    goog.functions.TRUE);
};

