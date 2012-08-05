/**
 * @fileoverview Store data in memory.
 *
 * This is used for mocking database.
 */

goog.provide('ydn.db.MemoryStore');
goog.require('ydn.db.Db');



/**
 * @implements {ydn.db.Db}
 * @constructor
 * @param {string} dbname
 * @param {Object=} schema table schema contain table name and keyPath.
 * @param {string=} version
 */
ydn.db.MemoryStore = function(dbname, schema, version) {
  this.version = version || 1;
  dbname = dbname;
  this.dbname = dbname;
  this.schema = schema || {};
  this.schema[ydn.db.Db.DEFAULT_TEXT_STORE] = {'keyPath': 'id'};
  this.setVersion();
};


/**
 * @private
 */
ydn.db.MemoryStore.prototype.setVersion = function() {
  /**
   * @final
   * @private
   * @type {Object}
   */
  this.cache = {};
  for (var table in this.schema) {
    goog.asserts.assertString(this.schema[table].keyPath, 'keyPath ' + this.schema[table].keyPath + ' not defined in ' + table + ' ' + JSON.stringify(this.schema[table]));
    this.cache[table] = {};
  }
};


/**
 *
 * @param {string} key
 * @param {string} value
 *  @return {!goog.async.Deferred}
 */
ydn.db.MemoryStore.prototype.put = function(key, value) {
  this.cache[ydn.db.Db.DEFAULT_TEXT_STORE][key] = value;
  return goog.async.Deferred.succeed(true);
};


/**
 *
 * @param {Object} value
 * @param {string=} key
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.MemoryStore.prototype.putObject = function(table, value, key) {
  if (!goog.isDef(key)) {
    goog.asserts.assertObject(this.schema[table], 'table: ' + table + ' is not defined in ' + this.dbname);
    goog.asserts.assertString(this.schema[table].keyPath, 'keyPath ' + this.schema[table].keyPath + ' not defined in ' + table + ' ' + JSON.stringify(this.schema[table]));
    key = value[this.schema[table].keyPath];
  }
  goog.asserts.assertString(key, 'keyPath: ' + this.schema[table].keyPath + ' not defined in ' + JSON.stringify(value));
  this.cache[table][key] = value;
  return goog.async.Deferred.succeed(true);
};


/**
 *
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.MemoryStore.prototype.get = function(key) {
  var value = this.cache[ydn.db.Db.DEFAULT_TEXT_STORE][key];
  return goog.async.Deferred.succeed(value);
};


/**
 * Return object
 * @param {string} table
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.MemoryStore.prototype.getObject = function(table, key) {
  goog.asserts.assertString(table);
  goog.asserts.assertString(key);
  var keyPath = this.schema[table].keyPath;
  for (var k in this.cache[table]) {
    var value = this.cache[table][k];
    if (value[keyPath] === key) {
      return goog.async.Deferred.succeed(value);
    }
  }

  return goog.async.Deferred.fail(undefined);
};


/**
 * Deletes all objects from the store.
 * @inheritDoc
 */
ydn.db.MemoryStore.prototype.clear = function(table) {
  if (goog.isDef(table)) {
    this.cache[table] = {};
  } else {
    for (var tb in this.cache) {
      this.cache[tb] = {};
    }
  }
  return goog.async.Deferred.succeed(true);
};


/**
 * @inheritDoc
 */
ydn.db.MemoryStore.prototype.getCount = function(table) {
  table = table || ydn.db.Db.DEFAULT_TEXT_STORE;
  var d = new goog.async.Deferred();
  var n = 0;
  for (var key in this.cache[table]) {
    n++;
  }
  d.callback(n);
  return d;
};


/**
 * Fetch result of a query
 * @param {ydn.db.Query} q
 * @return {!goog.async.Deferred}
 */
ydn.db.MemoryStore.prototype.fetch = function(q) {
  return goog.async.Deferred.fail(true);
};
