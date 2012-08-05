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
 * On application use, this is preferable over concrete storage implementation. This wrapper has two purpose:
 * 1) select suitable supported storage mechanism and 2) silently fail when the database is not initialized.
 * Database is initialized when dbname, versiona and schema are set. Often, dbname involve login user identification
 * and it is not available at the time of application start up. Additionally schema may be prepared by multiple
 * module.
 *
 * @author Kyaw Tun
 */

goog.provide('ydn.db.Storage');
goog.require('ydn.db.IndexedDb');
goog.require('ydn.db.Sqlite');
goog.require('ydn.db.Html5Db');
goog.require('ydn.db.MemoryStore');
goog.require('ydn.object');
goog.require('ydn.async');


/**
 * Create a suitable storage mechanism. starting from indexdb, to websql to localStorage.
 * @param {string=} dbname
 * @param {Object=} schema table schema contain table name and keyPath
 * @param {string=} version
 * @implements {ydn.db.Db}
 * @constructor
 */
ydn.db.Storage = function(dbname, schema, version) {

  /**
   * @type {ydn.db.Db}
   */
  this.db;

  this.setDbName(dbname);
  this.setSchema(schema, version);
};


/**
 * @typedef {{dbname: (string|undefined), schema: (Object|undefined), version: (string|undefined)}}
 */
ydn.db.Storage.Config;


/**
 *
 * @return {ydn.db.Storage.Config}
 */
ydn.db.Storage.prototype.getConfig = function() {
  return {
    dbname: this.dbname,
    schema: ydn.object.clone(this.schema),
    version: this.version
  }
};


/**
 *
 * @param {string=} dbname
 * @return {string|undefined} normalized dbname
 */
ydn.db.Storage.prototype.setDbName = function(dbname) {
  if (goog.isDef(dbname)) {
    dbname = dbname.replace(/[@|\.|\s]/g, '');
  } else {
    dbname = undefined;
  }
  if (this.dbname !== dbname) {
    this.dbname = dbname;
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
 * @param {Object=} schema
 * @param {string=} version
 */
ydn.db.Storage.prototype.setSchema = function(schema, version) {
  this.schema = schema;
  if (goog.isDef(version)) {
    this.version = version;
  }
  this.initDatabase();
};


/**
 *
 * @param {string} version
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
 * @param {string} tableName
 * @param {Object} tableSchema
 */
ydn.db.Storage.prototype.addTableSchema = function(tableName, tableSchema) {
  if (this.db) {
    throw Error('Db already online.'); // should introduce setVersion
  }
  this.schema = this.schema || {};
  this.schema[tableName] = tableSchema;
};


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set, starting in the following order of preference.
 * 1. IndexedDb
 * 2. Sqlite
 * 3. Html5Db
 * 4. MemoryStore
 * @private
 */
ydn.db.Storage.prototype.initDatabase = function() {
  // handle version change
  if (goog.isDef(this.dbname) && goog.isDef(this.schema) && goog.isDef(this.version)) {
    if (ydn.db.IndexedDb.isSupportedIndexedDb()) {
      this.db = new ydn.db.IndexedDb(this.dbname, this.schema, this.version);
    } else if (ydn.db.Sqlite.isSupported()) {
      this.db = new ydn.db.Sqlite(this.dbname, this.schema, this.version);
    } else {
      this.db = new ydn.db.Html5Db(this.dbname, this.schema, this.version);
      if (!this.db.isReady()) {
        this.db = new ydn.db.MemoryStore(this.dbname, this.schema, this.version);
      }
    }
  }
};


/**
 * This will silently ignore if user is not login.
 * @param {string} key
 * @param {string} value
 * @return {!goog.async.Deferred}
 */
ydn.db.Storage.prototype.put = function (key, value) {
  if (this.db) {
    this.db.put(key, value);
  }
  return goog.async.Deferred.fail(undefined);
};

/**
 * @param {string} table
 * @param {Object|Array} value
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Storage.prototype.putObject = function (table, value) {
  if (this.db) {
    return this.db.putObject(table, value);
  }
  return goog.async.Deferred.fail(undefined);
};


/**
 *
 * @param {string} key
 * @return {!goog.async.Deferred} string
 */
ydn.db.Storage.prototype.get = function (key) {
  if (this.db) {
    return this.db.get(key);
  }
  return goog.async.Deferred.fail(undefined);
};

/**
 * Return object
 * @param {string} table
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.Storage.prototype.getObject = function (table, key) {
  if (this.db) {
    return this.db.getObject(table, key);
  }
  return goog.async.Deferred.fail(false);
};


/**
 * @inheritDoc
 */
ydn.db.Storage.prototype.clear = function () {
  if (this.db) {
    this.db.clear();
  }
  return goog.async.Deferred.fail(undefined);
};


/**
 * Get number of items stored.
 * @param {string=} table
 * @return {!goog.async.Deferred} {@code number}
 */
ydn.db.Storage.prototype.getCount = function (table) {
  if (this.db) {
    return this.db.getCount(table);
  }
  return goog.async.Deferred.fail(undefined);
};



/**
 * Fetch result of a query
 * @param {ydn.db.Query} q
 * @return {!goog.async.Deferred}
 */
ydn.db.Storage.prototype.fetch = function (q) {
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
      window.console.log('Table: ' + table + ', keyPath: ' + self.schema[table].keyPath +
        ', count: ' + count);
    };

    for (var table in this.schema) {
      this.getCount(table).addBoth(goog.partial(print_table_description, table));
    }
  }
};
