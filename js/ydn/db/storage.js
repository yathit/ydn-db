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
 * @fileoverview Wrappers for the all implemented Storage mechanisms.
 *
 * On application use, this is preferable over concrete storage implementation.
 * This wrapper has two purpose:
 * 1) select suitable supported storage mechanism and 2) deferred execute when
 * the database is not initialized. Database is initialized when dbname, version
 * and schema are set.
 *
 * Often, dbname involve login user identification and it is not available at
 * the time of application start up. Additionally schema may be prepared by
 * multiple module. This top level wrapper provide these use cases.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Storage');
goog.require('ydn.async');
goog.require('ydn.db.Html5Db');
goog.require('ydn.db.IndexedDb');
goog.require('ydn.db.MemoryStore');
goog.require('ydn.db.WebSql');
goog.require('ydn.object');
goog.require('goog.userAgent.product');


/**
 * Create a suitable storage mechanism. starting from indexdb, to websql to
 * localStorage.
 * @see goog.db
 * @param {string=} opt_dbname database name.
 * @param {ydn.db.DatabaseSchema=} opt_schema table schema contain table name and keyPath.
 * @implements {ydn.db.Db}
 * @constructor
 */
ydn.db.Storage = function(opt_dbname, opt_schema) {

  /**
   * @private
   * @type {ydn.db.Db} db instance.
   */
  this.db_;

  /**
   *
   * @type {goog.async.Deferred} deferred db instance.
   */
  this.deferredDb = new goog.async.Deferred();

  if (goog.isDef(opt_dbname)) {
    this.setDbName(opt_dbname);
  }
  if (goog.isDef(opt_schema)) {
    this.setSchema(opt_schema);
  }
};



/**
 * @define {string} default key-value (store) table name.
 */
ydn.db.Storage.DEFAULT_TEXT_STORE = 'default_text_store';


/**
 *
 * @return {ydn.db.Storage.Config} configuration.
 */
ydn.db.Storage.prototype.getConfig = function() {
  return {
    dbname: this.db_name,
    schema: ydn.object.clone(this.schema),
    version: this.version
  };
};


/**
 *
 * @param {string} opt_dbname set database name.
 * @return {string} normalized dbname.
 */
ydn.db.Storage.prototype.setDbName = function (opt_dbname) {
  if (this.db_) {
    throw Error('DB already initialized');
  }
  /**
   * @final
   * @type {string}
   */
  this.db_name = opt_dbname.replace(/[@|\.|\s]/g, '');
  this.initDatabase();
  return this.db_name;
};


/**
 * Database schema has following structure
 * <pre>
 *   {'table 1': {
 *      'keyPath': 'key.path',
 *      'index': [
 *        'name': 'index name',
 *        'field': 'field name',
 *        'unique': true
 *      ]
 *      },
 *   'table 2': {
 *      'keyPath': 'key.path',
 *      'index': [
 *        'name': 'index name',
 *        'field': 'field name',
 *        'unique': true
 *      ]
 *      }
 *   }
 * </pre>
 * @see {@link #addTableSchema}
 * @param {Object=} opt_schema schema.
 * @param {string=} opt_version version.
 */
ydn.db.Storage.prototype.setSchema = function(opt_schema, opt_version) {
  this.schema = opt_schema;
  if (goog.isDef(opt_version)) {
    this.version = opt_version;
  }
  this.initDatabase();
};


/**
 *
 * @param {string} version version.
 */
ydn.db.Storage.prototype.setVersion = function(version) {
  this.version = version;
  this.initDatabase();
};


/**
 * Database schema has following structure
 * <pre>
       {
 *      'keyPath': 'key.path',
 *      'index': [
 *        'name': 'index name',
 *        'field': 'field name',
 *        'unique': true
 *      ]
       }
 * </pre>
 * @param {string} tableName table name.
 * @param {Object} tableSchema schema for the table.
 */
ydn.db.Storage.prototype.addTableSchema = function(tableName, tableSchema) {
  if (this.db_) {
    throw Error('Db already online.'); // should introduce setVersion
  }
  this.schema = this.schema || {};
  this.schema[tableName] = tableSchema;
};


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * 1. IndexedDb
 * 2. Sqlite
 * 3. Html5Db
 * 4. MemoryStore
 * @protected
 */
ydn.db.Storage.prototype.initDatabase = function() {
  // handle version change
  if (goog.isDef(this.db_name) && goog.isDef(this.schema) &&
      goog.isDef(this.version)) {

    if (goog.userAgent.product.ASSUME_CHROME || goog.userAgent.product.ASSUME_FIREFOX) {
      // for dead-code elimination
      this.db_ = new ydn.db.IndexedDb(this.db_name, this.schema, this.version);
    } else if (goog.userAgent.product.ASSUME_SAFARI || goog.userAgent.ASSUME_WEBKIT) {
      // for dead-code elimination
      this.db_ = new ydn.db.WebSql(this.db_name, this.schema, this.version);
    } else if (ydn.db.IndexedDb.isSupported()) { // run-time detection
      this.db_ = new ydn.db.IndexedDb(this.db_name, this.schema, this.version);
    } else if (ydn.db.WebSql.isSupported()) {
      this.db_ = new ydn.db.WebSql(this.db_name, this.schema, this.version);
    } else if (ydn.db.Html5Db.isSupported()) {
      this.db_ = new ydn.db.Html5Db(this.db_name, this.schema, this.version);
    } else {
      this.db_ = new ydn.db.MemoryStore(this.db_name, this.schema,
          this.version);
    }

    if (this.deferredDb.hasFired()) {
      this.deferredDb = new goog.async.Deferred();
    }
    this.deferredDb.callback(this.db_);
  }
};


/**
 * Store a value to default key-value store.
 * @param {string} key key.
 * @param {string} value value.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Storage.prototype.setItem = function(key, value) {

    return this.put(ydn.db.Storage.DEFAULT_TEXT_STORE, {'id': key, 'value': value});

};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.put = function(table, value) {
  if (this.db_) {
    return this.db_.put(table, value);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.put(table, value).chainDeferred(df);
    });
    return df;
  }
};


/**
 * Retrieve a value from default key-value store.
 * @param {string} key key.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.Storage.prototype.getItem = function(key) {
  var out = this.get(ydn.db.Storage.DEFAULT_TEXT_STORE, key);
  var df = new goog.async.Deferred();
  df.addCallback(function(data) {
    df.callback(data['value']);
  });
  df.addErrback(function(data) {
    df.callback(data);
  });
  return df;
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.get = function(table, key) {
  if (this.db_) {
    return this.db_.get(table, key);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.get(table, key).chainDeferred(df);
    });
    return df;
  }
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.clear = function(opt_table) {
  if (this.db_) {
    return this.db_.clear(opt_table);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.clear(opt_table).chainDeferred(df);
    });
    return df;
  }
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.getCount = function(table) {
  if (this.db_) {
    return this.db_.getCount(table);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.getCount(table).chainDeferred(df);
    });
    return df;
  }

};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.fetch = function(q) {
  if (this.db_) {
    return this.db_.fetch(q);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.fetch(q).chainDeferred(df);
    });
    return df;
  }

};


/**
 * Debug information about this database.
 */
ydn.db.Storage.prototype.disp = function() {
  if (goog.DEBUG) {
    window.console.log(this.db_name + ' ver: ' + this.version);
    var self = this;

    var print_table_description = function(table, count) {
      window.console.log('Table: ' + table + ', keyPath: ' +
          self.schema[table].keyPath +
          ', count: ' + count);
    };

    for (var table in this.schema) {
      this.getCount(table).addBoth(goog.partial(print_table_description,
          table));
    }
  }
};
