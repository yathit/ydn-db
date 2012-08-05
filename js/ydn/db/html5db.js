/**
 * @fileoverview HTML5 localStorage implemented as deferred async pattern.
 */

goog.provide('ydn.db.Html5Db');
goog.require('goog.async.Deferred');
goog.require('goog.storage.CollectableStorage');
goog.require('goog.storage.mechanism.mechanismfactory');



/**
 * @implements {ydn.db.Db}
 * @param {string} dbname
 * @param {Object=} schema table schema contain table name and keyPath.
 * @param {string=} version
 * @constructor
 */
ydn.db.Html5Db = function(dbname, schema, version) {
  this.version = version || '1';
  dbname = dbname;
  this.dbname = dbname;
  this.schema = schema || {};
  this.schema[ydn.db.Db.DEFAULT_TEXT_STORE] = {'keyPath': 'id'};

  /**
   *
   * @type {Object.<goog.storage.mechanism.IterableMechanism>}
   */
  this.mechanisms = {};
  /**
   *
   * @type {Object.<goog.storage.CollectableStorage>}
   */
  this.stores = {};
  this.is_ready = true;
  for (var tablename in this.schema) {
    if (this.schema.hasOwnProperty(tablename)) {
      var store_name = this.getStoreName(tablename);
      if (tablename == ydn.db.Db.DEFAULT_TEXT_STORE) {
        this.default_store = store_name;
      }
      this.mechanisms[store_name] = goog.storage.mechanism.mechanismfactory.create(store_name);
      if (this.mechanisms[store_name] instanceof goog.storage.mechanism.IterableMechanism) {
        this.stores[store_name] = new goog.storage.CollectableStorage(this.mechanisms[store_name]);
      } else {
        this.is_ready = false;
      }
    }
  }

};


/**
 *
 * @return {boolean}
 */
ydn.db.Html5Db.prototype.isReady = function() {
  return this.is_ready;
};


/**
 * @private
 * @param table
 */
ydn.db.Html5Db.prototype.getStoreName = function(table) {
  return this.dbname + '_v' + this.version + '_' + table;
};


/**
 *
 * @param {string} key
 * @param {string} value
 *  @return {!goog.async.Deferred}
 */
ydn.db.Html5Db.prototype.put = function(key, value) {
  this.stores[this.default_store].set(key, value);
  return goog.async.Deferred.succeed(true);
};


/**
 *
 * @param {Object} value
 * @param {string=} key
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Html5Db.prototype.putObject = function(table, value, key) {
  if (!goog.isDef(key)) {
    key = value[this.schema[table].keyPath];
  }
  var value_str = ydn.json.stringify(value);
  this.stores[this.getStoreName(table)].set(key, value_str);
  return goog.async.Deferred.succeed(true);
};


/**
 *
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.Html5Db.prototype.get = function(key) {
  var value = this.stores[this.default_store].get(key);
  return goog.async.Deferred.succeed(value);
};


/**
 * Return object
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.Html5Db.prototype.getObject = function(table, key) {
  goog.asserts.assertObject(this.stores[this.getStoreName(table)], 'table: ' + table + ' not existed in ' + this.dbname);
  var value = this.stores[this.getStoreName(table)].get(key);
  return goog.async.Deferred.succeed(ydn.json.parse(/** @type {string} */ (value)));
};


/**
 * Deletes all objects from the store.
 */
ydn.db.Html5Db.prototype.clear = function() {
  for (var table in this.mechanisms) {
    this.mechanisms[table].clear();
  }
  return goog.async.Deferred.succeed(true);
};


/**
 * @inheritDoc
 */
ydn.db.Html5Db.prototype.getCount = function(table) {
  var d = new goog.async.Deferred();
  table = table || ydn.db.Db.DEFAULT_TEXT_STORE;
  d.callback(this.mechanisms[this.getStoreName(table)].getCount());
  return d;
};


/**
 * Fetch result of a query
 * @param {ydn.db.Query} q
 * @return {!goog.async.Deferred}
 */
ydn.db.Html5Db.prototype.fetch = function(q) {
  return goog.async.Deferred.fail(true);
};
