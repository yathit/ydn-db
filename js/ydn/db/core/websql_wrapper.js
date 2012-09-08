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

goog.provide('ydn.db.WebSqlWrapper');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.async');
goog.require('ydn.json');
goog.require('ydn.db');


/**
 * Construct WebSql database.
 * Note: Version is ignored, since it does work well.
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @implements {ydn.db.CoreService}
 * @constructor
 */
ydn.db.WebSqlWrapper = function(dbname, schema) {
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
   * Transaction queue
   * @type {!Array.<{fnc: Function, scopes: Array.<string>,
   * mode: IDBTransaction, d: goog.async.Deferred}>}
   */
  this.stxQueue = [];  

  /**
   * Must open the database with empty version, otherwise unrecoverable error
   * will occur in the
   * first instance.
   * @private
   * @type {Database}
   */
  this.sdb_ = goog.global.openDatabase(this.dbname, '', description,
    this.schema.size);

  if (this.sdb_.version != this.schema.version) {
    this.migrate_();
  }

};


/**
 * @const
 * @type {string}
 */
ydn.db.WebSqlWrapper.TYPE = 'websql';

/**
 * @return {string}
 */
ydn.db.WebSqlWrapper.prototype.type = function() {
  return ydn.db.WebSqlWrapper.TYPE;
};

//
//ydn.db.WebSqlWrapper.prototype.getDb = function() {
//  return this.sdb_;
//};


/**
 *
 */
ydn.db.WebSqlWrapper.prototype.getDbInstance = function() {
  return this.sdb_ || null;
};


/**
 *
 * @return {boolean} true if supported.
 */
ydn.db.WebSqlWrapper.isSupported = function() {
  return goog.isFunction(goog.global.openDatabase);
};


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.WebSqlWrapper.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.WebSqlWrapper.prototype.logger = goog.debug.Logger.getLogger('ydn.db.WebSqlWrapper');



/**
 * Run a transaction. If already in transaction, this will join the transaction.
 * @param {Function} transactionFunc
 * @protected
 * @final
 */
ydn.db.WebSqlWrapper.prototype.doTransaction = function(transactionFunc) {

  var me = this;
  if (this.stx_.isActive()) {
    var ctx = this.stx_.getTx();
    transactionFunc(ctx);
  } else {
    this.sdb_.transaction(

      function callback(tx) {
        me.stx_.up(tx);
        transactionFunc(tx);
      },

      function errorCallback(e) {
        me.stx_.down();
      },

      function successCallback(e) {
        me.stx_.down();
      }
    );
  }

};




/**
 * Provide transaction object to subclass and keep a result.
 * This also serve as mutex on transaction.
 * @private
 * @constructor
 */
ydn.db.WebSqlWrapper.Transaction = function() {

};


/**
 * @override
 */
ydn.db.WebSqlWrapper.Transaction.type = function() {
  return ydn.db.WebSqlWrapper.TYPE;
};


/**
 * Start a new transaction.
 * @private
 * @param {!SQLTransaction} tx the transaction object.
 */
ydn.db.WebSqlWrapper.Transaction.prototype.up = function(tx) {
  /**
   * @private
   * @type {SQLTransaction}
   */
  this.transaction_ = tx;

};

/**
 * @private
 */
ydn.db.WebSqlWrapper.Transaction.prototype.down = function() {
  this.transaction_ = null;
};


/**
 * @private
 * @return {boolean}
 */
ydn.db.WebSqlWrapper.Transaction.prototype.isActive = function() {
  return !!this.transaction_;
};


/**
 *
 * @return {!SQLTransaction}
 */
ydn.db.WebSqlWrapper.Transaction.prototype.getTx = function() {
  goog.asserts.assertObject(this.transaction_);
  return /** @type {!SQLTransaction} */ (this.transaction_);
};



/**
 * Existence of transaction object indicate that this database is in
 * transaction. This must be set to null on finished.
 * @private
 * @final
 * @type {!ydn.db.WebSqlWrapper.Transaction}
 */
ydn.db.WebSqlWrapper.prototype.stx_ = new ydn.db.WebSqlWrapper.Transaction();


/**
 * @protected
 * @return {ydn.db.WebSqlWrapper.Transaction} transaction object if in
 * transaction.
 */
ydn.db.WebSqlWrapper.prototype.getTx = function() {
  return this.stx_.isActive() ? this.stx_ : null;
};


/**
 * Initialize variable to the schema and prepare SQL statement for creating
 * the table.
 * @private
 * @param {ydn.db.StoreSchema} schema name of table in the schema.
 * @return {string} SQL statement for creating the table.
 */
ydn.db.WebSqlWrapper.prototype.prepareCreateTable_ = function(schema) {

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
ydn.db.WebSqlWrapper.prototype.migrate_ = function() {

  var me = this;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.WebSqlWrapper.DEBUG) {
      window.console.log(results);
    }
    me.logger.finest('Creating tables OK.');
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.WebSqlWrapper.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Error creating tables: ' + error.message);
  };

  var sqls = [];
  for (var i = 0; i < this.schema.stores.length; i++) {
    sqls.push(this.prepareCreateTable_(this.schema.stores[i]));
  }

  this.sdb_.transaction(function(t) {

    me.logger.finest('Creating tables ' + sqls.join('\n'));
    for (var i = 0; i < sqls.length; i++) {
      if (ydn.db.WebSqlWrapper.DEBUG) {
        window.console.log(sqls[i]);
      }
      t.executeSql(sqls[i], [],
          i == sqls.length - 1 ? success_callback : undefined,
          error_callback);
    }
  });
};



/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @final
 * @protected
 * @param {ydn.db.StoreSchema} table table of concern.
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.WebSqlWrapper.prototype.parseRow = function(table, row) {
  goog.asserts.assertObject(row);
  var value = ydn.json.parse(row[ydn.db.DEFAULT_BLOB_COLUMN]);
  var key = row[table.keyPath]; // NOT: table.getKey(row);
  table.setKey(value, key);
  for (var j = 0; j < table.indexes.length; j++) {
    var index = table.indexes[j];
    if (index.name == ydn.db.DEFAULT_BLOB_COLUMN) {
      continue;
    }
    var x = row[index.name];
    if (!goog.isDef(x)) {
      continue;
    }
    if (index.type == ydn.db.DataType.INTEGER) {
      x = parseInt(x, 10);
    } else if (index.type == ydn.db.DataType.FLOAT) {
      x = parseFloat(x);
    }
    value[index.name] = x;
  }
  return value;
};


/**
 * Extract key from row result.
 * @final
 * @protected
 * @param {ydn.db.StoreSchema} table table of concern.
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.WebSqlWrapper.prototype.getKeyFromRow = function(table, row) {
  return row[table.keyPath || ydn.db.DEFAULT_KEY_COLUMN];
};



/**
 * @final
 * @param {string} table table name.
 * @param {string} id row name.
 * @return {!goog.async.Deferred} deferred result.
 * @protected
 */
ydn.db.WebSqlWrapper.prototype.deleteRow_ = function(table, id) {
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
    if (ydn.db.WebSqlWrapper.DEBUG) {
      window.console.log(results);
    }
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.WebSqlWrapper.DEBUG) {
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
 * Delete the database, store or an entry.
 *
 * @param {string=} opt_table delete a specific store.
 * @param {string=} opt_id delete a specific row.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.WebSqlWrapper.prototype.remove = function(opt_table, opt_id) {

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
 * @param {string=} opt_table table name to be deleted, if not specified all
 * tables will be deleted.
 * @return {!goog.async.Deferred} deferred result.
 * @protected
 */
ydn.db.WebSqlWrapper.prototype.dropTable_ = function(opt_table) {

  var d = new goog.async.Deferred();
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
    if (ydn.db.WebSqlWrapper.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('Delete TABLE: ' + error.message);
    d.errback(error);
  };

  this.sdb_.transaction(function(t) {
    //console.log(sql);
    t.executeSql(sql, [], callback, error_callback);
  });

  return d;
};


/**
 *
 */
ydn.db.WebSqlWrapper.prototype.close = function () {
  // no need to close WebSQl database.
  return goog.async.Deferred.succeed(true);
};




/**
 * @inheritDoc
 * @final
 */
ydn.db.WebSqlWrapper.prototype.transaction = function(trFn, scopes, mode) {

  this.doTransaction(function(tx) {
    // now execute transaction process
    trFn(tx);
  });

};
