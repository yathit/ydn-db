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
 * @fileoverview Data store in memory.
 */

goog.provide('ydn.db.req.SimpleStore');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('ydn.db.req.RequestExecutor');


/**
 * @extends {ydn.db.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 */
ydn.db.req.SimpleStore = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.req.SimpleStore, ydn.db.req.RequestExecutor);


/**
 * Extract key
 * @final
 * @protected
 * @param {ydn.db.schema.Store} store table name.
 * @param {!Object} value object having key in keyPath field.
 * @return {string} canonical key name.
 */
ydn.db.req.SimpleStore.prototype.extractKey = function(store, value, opt_key) {

  var key;

  if (goog.isDefAndNotNull(store.keyPath)) {
    key = store.getKeyValue(value);
  } else if (goog.isDef(opt_key)) {
    key = opt_key;
  } else if (store.getAutoIncrement()) {
    var store_key = this.makeKey(store);
    var store_obj = ydn.json.parse(this.tx.getItem(store_key));
    store_obj['autoIncrementNo']++;
    key = store_obj['autoIncrementNo'];
    this.tx.setItem(store_key, ydn.json.stringify(store_obj));
  } else {
    throw Error('No key provided.');
  }

  return key;
};


/**
 * Use store name and id to form a key to use in setting key to storage.
 * @protected
 * @final
 * @param {ydn.db.schema.Store} store table name.
 * @param {(string|number|Date|!Array)=} id id.
 * @return {string} canonical key name.
 */
ydn.db.req.SimpleStore.prototype.makeKey = function(store, id) {
  var parts = [ydn.db.con.SimpleStorage.NAMESPACE, this.dbname, + store.name];
  if (goog.isDef(id)) {
    parts.push(ydn.db.utils.encodeKey(id));
  }
  return parts.join(ydn.db.con.SimpleStorage.SEP);
};


/**
 *
 * @param {!ydn.db.schema.Store|string} store_name store schema or name.
 * @param {(string|number|Date|!Array)} id id.
 * @return {*} the value obtained.
 * @protected
 * @final
 */
ydn.db.req.SimpleStore.prototype.getItemInternal = function(store_name, id) {
  var store = store_name instanceof ydn.db.schema.Store ?
    store_name : this.schema.getStore(store_name);
  var key = this.makeKey(store, id);
  var value = this.tx.getItem(key);
  if (!goog.isNull(value)) {
    value = ydn.json.parse(/** @type {string} */ (value));
  } else {
    value = undefined; // localStorage return null for not existing value
  }
  return value;
};


/**
 *
 * @param {!Object} value the value.
 * @param {string} store_name store name.
 * @param {*=} id key.
 * @return {string} key key.
 * @protected
 * @final
 */
ydn.db.req.SimpleStore.prototype.setItemInternal = function(value,
        store_name, id) {
  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(value);
  var obj_id = this.extractKey(store, value, id);
  var key = this.makeKey(store, obj_id);
  var str = ydn.json.stringify(value);
  if (ydn.db.req.SimpleStore.DEBUG) {
    window.console.log(['setItemInternal', obj_id, key, str]);
  }
  this.tx.setItem(key, str);
  return obj_id;
};


/**
 *
 * @param {string} store_name store name or key.
 * @param {(!Array|string|number)} id  id.
 * @protected
 * @final
 */
ydn.db.req.SimpleStore.prototype.removeItemInternal = function(store_name, id){
  var store = this.schema.getStore(store_name);
  var key = this.makeKey(store, id);
  this.tx.removeItem(key);
};


/**
 *
 * @define {boolean} use sync result.
 */
ydn.db.req.SimpleStore.SYNC = true;


/**
 *
 * @type {boolean} debug flag. should always be false.
 */
ydn.db.req.SimpleStore.DEBUG = false;


/**
 * @final
 * @protected
 * @param {string|number} id id.
 * @param {ydn.db.schema.Store|string} store table name.
 * @return {string} canonical key name.
 */
ydn.db.req.SimpleStore.prototype.getKeyValue = function(id, store) {
  var store_name = store instanceof ydn.db.schema.Store ? store.name : store;
  return '_database_' + this.dbname + '-' + store_name + '-' + id;
};


/**
 * @protected
 * @param {*} value value to return.
 * @return {!goog.async.Deferred} return callback with given value in async.
 */
ydn.db.req.SimpleStore.succeed = function(value) {

  var df = new goog.async.Deferred();

  if (ydn.db.req.SimpleStore.SYNC) {
    df.callback(value);
  } else {
    goog.Timer.callOnce(function() {
      df.callback(value);
    }, 0);
  }

  return df;
};


/**
 * @param {!goog.async.Deferred} df return key in deferred function.
 * @param {string} table table name.
* @param {!Object} value object to put.
 * @param {(!Array|string|number)=} opt_key optional out-of-line key.
*/
ydn.db.req.SimpleStore.prototype.putObject = function(
      df, table, value, opt_key) {
  var key = this.setItemInternal(value, table, opt_key);
  df.callback(key);
};


/**
 * @param {!goog.async.Deferred} df return key in deferred function.
 * @param {string} table table name.
 * @param {Array.<!Object>} value object to put.
 * @param {!Array.<(!Array|string|number)>=} opt_key optional out-of-line keys.
 */
ydn.db.req.SimpleStore.prototype.putObjects = function(
      df, table, value, opt_key) {

  var result = [];
  for (var i = 0; i < value.length; i++) {
    result[i] = this.setItemInternal(value[i], table, opt_key);
  }

  df.callback(result);
};


/**
* Retrieve an object from store.
 * @param {!goog.async.Deferred} df return object in deferred function.
 * @param {string} store_name store name.
* @param {(string|number|Date|!Array)} id id.
*/
ydn.db.req.SimpleStore.prototype.getById = function(df, store_name, id) {
  df.callback(this.getItemInternal(store_name, id));
};


/**
* @inheritDoc
*/
ydn.db.req.SimpleStore.prototype.getByStore = function(df, opt_store_name) {
  var arr = [];
  var collect = function(store_name) {
    for (var item in this.tx) {
      if (this.tx.hasOwnProperty(item)) {
        if (goog.string.startsWith(item, '_database_' + this.dbname + '-' +
            store_name)) {
          var value = this.getItemInternal(item);
          arr.push(ydn.json.parse(
              /** @type {string} */ (value)));
        }
      }
    }
  };

  if (goog.isString(opt_store_name)) {
    collect(opt_store_name);
  } else {
    for (var i = 0; i < this.schema.stores.length; i++) {
      collect(this.schema.stores[i].name);
    }
  }

  df.callback(arr);
};


/**
 *
 * @param {!goog.async.Deferred} df return result in deferred function.
 * @param {string} store_name store name.
 * @param {!Array.<string|number>} ids list of ids.
 */
ydn.db.req.SimpleStore.prototype.getByIds = function(df, store_name, ids) {
  var arr = [];
  for (var i = 0; i < ids.length; i++) {
    var value = this.getItemInternal(store_name, ids[i]);
    arr.push(value);
  }
  df.callback(arr);
};


/**
* @inheritDoc
*/
ydn.db.req.SimpleStore.prototype.getByKeys = function(df, keys) {
  var arr = [];
  for (var i = 0; i < keys.length; i++) {
    var value = this.getItemInternal(keys[i].getStoreName(), keys[i].getId());
    arr.push(value);
  }
  df.callback(arr);
};


/**
 * Remove all data in a store (table).
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {string} table delete a specific table or all tables.
 * @param {(!Array|string|number)} id delete a specific row.
 */
ydn.db.req.SimpleStore.prototype.clearById = function(df, table, id) {

  this.removeItemInternal(table, id);

  df.callback(true);
};


/**
 * @inheritDoc
*/
ydn.db.req.SimpleStore.prototype.clearByStore = function(df, opt_table) {

  var tables_to_clear = goog.isDef(opt_table) ?
    [opt_table] : this.schema.listStores();
  for (var key in this.tx) {
    if (this.tx.hasOwnProperty(key)) {
      for (var table, i = 0; table = tables_to_clear[i]; i++) {
        if (goog.string.startsWith(key, '_database_' + this.dbname + '-' +
          table)) {
          delete this.tx[key];
        }
      }
    }
  }
  df.callback(true);
};


/**
* Get number of items stored.
 * @param {!goog.async.Deferred} df return number of items in deferred function.
 * @param {!Array.<string>}  tables table name.
*/
ydn.db.req.SimpleStore.prototype.countStores = function(df, tables) {

  var store = tables[0];
  var pre_fix = '_database_' + this.dbname;
  if (goog.isDef(store)) {
    pre_fix += '-' + store;
  }

  var n = 0;
  for (var key in this.tx) {
    if (this.tx.hasOwnProperty(key)) {
      if (goog.string.startsWith(key, pre_fix)) {
        n++;
      }
    }
  }
  df.callback(n);
};

/**
 * Get number of items stored.
 * @param {!goog.async.Deferred} df return number of items in deferred function.
 * @param {string} opt_table table name.
 *  @param {ydn.db.KeyRange} keyRange the key range.
 */
ydn.db.req.SimpleStore.prototype.countKeyRange = function(df, opt_table,
                                                          keyRange) {

  var pre_fix = '_database_' + this.dbname;
  if (goog.isDef(opt_table)) {
    pre_fix += '-' + opt_table;
  }

  var n = 0;
  for (var key in this.tx) {
    if (this.tx.hasOwnProperty(key)) {
      if (goog.string.startsWith(key, pre_fix)) {
        n++;
      }
    }
  }
  df.callback(n);
};


