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
goog.require('ydn.db.Sqlite');
goog.require('ydn.object');
goog.require('goog.userAgent.product');



/**
 * Create a suitable storage mechanism. starting from indexdb, to websql to
 * localStorage.
 * @see goog.db
 * @param {string=} opt_dbname database name.
 * @param {Object=} opt_schema table schema contain table name and keyPath.
 * @param {string=} opt_version version.
 * @implements {ydn.db.Db}
 * @constructor
 */
ydn.db.Storage = function(opt_dbname, opt_schema, opt_version) {

  /**
   * @type {ydn.db.Db} db instance.
   */
  this.db;

  /**
   *
   * @type {goog.async.Deferred} deferred db instance.
   */
  this.deferredDb = new goog.async.Deferred();

  this.setDbName(opt_dbname);
  this.setSchema(opt_schema, opt_version);
};


/**
 * @typedef {{dbname: (string|undefined), schema: (Object|undefined), version:
 * (string|undefined)}}
 */
ydn.db.Storage.Config;


/**
 *
 * @return {ydn.db.Storage.Config} configuration.
 */
ydn.db.Storage.prototype.getConfig = function() {
  return {
    dbname: this.dbname,
    schema: ydn.object.clone(this.schema),
    version: this.version
  };
};


/**
 *
 * @param {string=} opt_dbname set database name.
 * @return {string|undefined} normalized dbname.
 */
ydn.db.Storage.prototype.setDbName = function(opt_dbname) {
  if (goog.isDef(opt_dbname)) {
    opt_dbname = opt_dbname.replace(/[@|\.|\s]/g, '');
  } else {
    opt_dbname = undefined;
  }
  if (this.dbname !== opt_dbname) {
    this.dbname = opt_dbname;
    this.initDatabase();
  }
  return this.dbname;
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
  if (this.db) {
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
  if (goog.isDef(this.dbname) && goog.isDef(this.schema) &&
      goog.isDef(this.version)) {

    if (goog.userAgent.product.ASSUME_CHROME || goog.userAgent.product.ASSUME_FIREFOX) {
      // for dead-code elimination
      this.db = new ydn.db.IndexedDb(this.dbname, this.schema, this.version);
    } else if (goog.userAgent.product.ASSUME_SAFARI || goog.userAgent.ASSUME_WEBKIT) {
      // for dead-code elimination
      this.db = new ydn.db.Sqlite(this.dbname, this.schema, this.version);
    } else if (ydn.db.IndexedDb.isSupported()) { // run-time detection
      this.db = new ydn.db.IndexedDb(this.dbname, this.schema, this.version);
    } else if (ydn.db.Sqlite.isSupported()) {
      this.db = new ydn.db.Sqlite(this.dbname, this.schema, this.version);
    } else if (ydn.db.Html5Db.isSupported()) {
      this.db = new ydn.db.Html5Db(this.dbname, this.schema, this.version);
    } else {
      this.db = new ydn.db.MemoryStore(this.dbname, this.schema,
          this.version);
    }

    if (this.deferredDb.hasFired()) {
      this.deferredDb = new goog.async.Deferred();
    }
    this.deferredDb.callback(this.db);
  }
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.setItem = function(key, value) {
  if (this.db) {
    return this.db.setItem(key, value);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.setItem(key, value).chainDeferred(df);
    });
    return df;
  }

};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.put = function(table, value) {
  if (this.db) {
    return this.db.put(table, value);
  }
  return goog.async.Deferred.fail(undefined);
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.getItem = function(key) {
  if (this.db) {
    return this.db.getItem(key);
  } else {
    var df = new goog.async.Deferred();
    this.deferredDb.addCallback(function(db) {
      db.getItem(key).chainDeferred(df);
    });
    return df;
  }
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.get = function(table, key) {
  if (this.db) {
    return this.db.get(table, key);
  }
  return goog.async.Deferred.fail(false);
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.clear = function() {
  if (this.db) {
    this.db.clear();
  }
  return goog.async.Deferred.fail(undefined);
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.getCount = function(table) {
  if (this.db) {
    return this.db.getCount(table);
  }
  return goog.async.Deferred.fail(undefined);
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.fetch = function(q) {
  if (this.db) {
    return this.db.fetch(q);
  }
  return goog.async.Deferred.fail(undefined);
};


/**
 * Debug information about this database.
 */
ydn.db.Storage.prototype.disp = function() {
  if (goog.DEBUG) {
    window.console.log(this.dbname + ' ver: ' + this.version);
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
