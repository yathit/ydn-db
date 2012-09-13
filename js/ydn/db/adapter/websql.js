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

goog.provide('ydn.db.adapter.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.json');
goog.require('ydn.db');
goog.require('ydn.db.adapter.IDatabase');


/**
 * Construct WebSql database.
 * Note: Version is ignored, since it does work well.
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @implements {ydn.db.adapter.IDatabase}
 * @constructor
 */
ydn.db.adapter.WebSql = function(dbname, schema) {
  var self = this;
  this.dbname = dbname;
  /**
   * @final
   * @protected
   * @type {!ydn.db.DatabaseSchema}
   */
  this.schema = schema; // we always use the last schema.

  var description = this.dbname;

  /**
   * Must open the database with empty version, otherwise unrecoverable error
   * will occur in the first instance.
   */
  this.sql_db_ = goog.global.openDatabase(this.dbname, '', description,
    this.schema.size);
  // we can immediately set this to sql_db_ because database table creation
  // are going through doTranaction process, it already lock out
  // for using this database.

  if (this.sql_db_.version != this.schema.version) {
    this.migrate_();
  }

};


/**
 * @const
 * @type {string}
 */
ydn.db.adapter.WebSql.TYPE = 'websql';

/**
 * @return {string}
 */
ydn.db.adapter.WebSql.prototype.type = function() {
  return ydn.db.adapter.WebSql.TYPE;
};


/**
 *
 * @type {Database}
 * @private
 */
ydn.db.adapter.WebSql.prototype.sql_db_ = null;


/**
 * @protected
 * @return {Database}
 */
ydn.db.adapter.WebSql.prototype.getSqlDb = function() {
  return this.sql_db_;
};


/**
 *
 */
ydn.db.adapter.WebSql.prototype.getDbInstance = function() {
  return this.sql_db_ || null;
};


/**
 *
 * @return {boolean} true if supported.
 */
ydn.db.adapter.WebSql.isSupported = function() {
  return goog.isFunction(goog.global.openDatabase);
};


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.adapter.WebSql.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.adapter.WebSql.prototype.logger = goog.debug.Logger.getLogger('ydn.db.adapter.WebSql');



/**
 * Initialize variable to the schema and prepare SQL statement for creating
 * the table.
 * @private
 * @param {ydn.db.StoreSchema} schema name of table in the schema.
 * @return {string} SQL statement for creating the table.
 */
ydn.db.adapter.WebSql.prototype.prepareCreateTable_ = function(schema) {

  var sql = 'CREATE TABLE IF NOT EXISTS ' + schema.getQuotedName() + ' (';

  var id_column_name = schema.getQuotedKeyPath() ||
      ydn.db.DEFAULT_KEY_COLUMN;

  if (goog.isDef(schema.keyPath)) {
      sql += schema.getQuotedKeyPath() + ' TEXT UNIQUE PRIMARY KEY';
  } else {
    // NOTE: we could have use AUTOINCREMENT here,
    // however put request require to return key. If we use AUTOINCREMENT, the key value
    // have to query again after INSERT since it does not return any result.
    // generating the by ourselves eliminate this.
    // for generating see ydn.db.StoreSchema.prototype.generateKey
    sql += ydn.db.DEFAULT_KEY_COLUMN + ' INTEGER PRIMARY KEY';
  }

  // every table must has a default field.
  if (!schema.hasIndex(ydn.db.DEFAULT_BLOB_COLUMN)) {
    schema.addIndex(ydn.db.DEFAULT_BLOB_COLUMN);
  }

  for (var i = 0; i < schema.indexes.length; i++) {
    /**
     * @type {ydn.db.IndexSchema}
     */
    var index = schema.indexes[i];
    if (index.name == schema.keyPath) {
      continue;
    }
    var primary = index.unique ? ' UNIQUE ' : ' ';
    sql += ', ' + index.name + ' ' + index.type + primary;
  }

  sql += ');';

  return sql;
};


/**
 * Migrate from current version to the last version.
 * @private
 */
ydn.db.adapter.WebSql.prototype.migrate_ = function() {

  var me = this;


  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.adapter.WebSql.DEBUG) {
      window.console.log(results);
    }
    me.logger.finest('Creating tables OK.');

  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.adapter.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Error creating tables: ' + error.message);
  };

  var sqls = [];
  for (var i = 0; i < this.schema.stores.length; i++) {
    sqls.push(this.prepareCreateTable_(this.schema.stores[i]));
  }


  // TODO: deleting tables.

  var oncompleted = function(t, e) {
    me.is_ready_ = true;
  };

  this.doTransaction(function (t) {

    me.logger.finest('Creating tables ' + sqls.join('\n'));
    for (var i = 0; i < sqls.length; i++) {
      if (ydn.db.adapter.WebSql.DEBUG) {
        window.console.log(sqls[i]);
      }
      t.executeSql(sqls[i], [],
        i == sqls.length - 1 ? success_callback : undefined,
        error_callback);
    }
  }, [], ydn.db.TransactionMode.READ_WRITE, oncompleted);

};


/**
 * @return {boolean}
 */
ydn.db.adapter.WebSql.prototype.isReady = function() {
  return true;
};


/**
 *
 * @inheritDoc
 */
ydn.db.adapter.WebSql.prototype.onReady = function(cb) {
  // due to the way, this work, database is always ready to use.
  cb(this);
};


/**
 * @final
 */
ydn.db.adapter.WebSql.prototype.close = function () {
  // WebSQl API do not have close method.
};



/**
 * Run a transaction. If already in transaction, this will join the transaction.
 * @param {function(SQLTransaction)|Function} trFn
 * @param {Array.<string>} scopes
 * @param {ydn.db.TransactionMode} mode
 * @param {function(ydn.db.TransactionEventTypes, *)=} completed_event_handler
 * @protected
 */
ydn.db.adapter.WebSql.prototype.doTransaction = function(trFn, scopes, mode,
          completed_event_handler) {
    goog.asserts.assertFunction(completed_event_handler);
        /**
     * SQLTransactionCallback
     * @param {!SQLTransaction} tx
     */
    var transaction_callback = function(tx) {
      trFn(tx);
    };

    /**
     * SQLVoidCallback
     */
    var success_callback = function() {
      completed_event_handler(ydn.db.TransactionEventTypes.COMPLETE,
        {'type': ydn.db.TransactionEventTypes.COMPLETE});
    };

    /**
     * SQLTransactionErrorCallback
     * @param {SQLError} e
     */
    var error_callback = function(e) {
      completed_event_handler(ydn.db.TransactionEventTypes.ERROR, e);
    };

    if (mode == ydn.db.TransactionMode.READ_ONLY) {
      this.sql_db_.readTransaction(transaction_callback,
          error_callback, success_callback);
    } else {
      this.sql_db_.transaction(transaction_callback,
          error_callback, success_callback);
    }


};


