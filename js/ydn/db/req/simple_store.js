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

/**
 * @final
 * @protected
 * @param {string} store_name table name.
 * @param {!Object} value object having key in keyPath field.
 * @return {string|number} canonical key name.
 */
ydn.db.req.SimpleStore.prototype.extractKey = function(store_name, value) {
  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store, 'store: ' + store_name + ' not found.');
  var key;
  // we don't need to check, because this function is not used by user.
  goog.asserts.assertObject(value, 'id or object must be defined.');
  if (goog.isDef(store.keyPath)) {
    key = store.getKeyValue(value);
  }
  if (!goog.isDefAndNotNull(key)) {
    key = store.generateKey();
  }

  key = ydn.db.schema.Index.js2sql(key, store.type);
  return /** @type {string|number} */ (key);
};



/**
 * @protected
 * @final
 * @param {ydn.db.schema.Store} store table name.
 * @param {(string|number|Date|!Array)} id id.
 * @return {string} canonical key name.
 */
ydn.db.req.SimpleStore.prototype.makeKey = function(store, id) {
  var s = ydn.db.schema.Index.js2sql(id, store.type);
  return '_database_' + this.dbname + '-' + store.name + '-' + s;
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
 * @param {*} value the value.
 * @param {string} store_name_or_key store name or key.
 * @param {(string|number)=} id key.
 * @protected
 * @final
 */
ydn.db.req.SimpleStore.prototype.setItemInternal = function(value,
        store_name_or_key, id) {
  var key;
  if (goog.isDef(id)) {
    var store = this.schema.getStore(store_name_or_key);
    key = this.makeKey(store, id);
  } else {
    key = store_name_or_key;
  }

  this.tx.setItem(key, value);
};


/**
 *
 * @param {string} store_name_or_key store name or key.
 * @param {(!Array|string|number)=} id  id.
 * @protected
 * @final
 */
ydn.db.req.SimpleStore.prototype.removeItemInternal = function(
  store_name_or_key, id) {
  var key;
  if (goog.isDef(id)) {
    var store = this.schema.getStore(store_name_or_key);
    key = this.makeKey(store, id);
  } else {
    key = store_name_or_key;
  }
  this.tx.removeItem(key);
};


/**
 *
 * @define {boolean} use sync result.
 */
ydn.db.req.SimpleStore.SYNC = true;



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
*/
ydn.db.req.SimpleStore.prototype.putObject = function(df, table, value) {
  var key = this.extractKey(table, value);
  var value_str = ydn.json.stringify(value);
  this.setItemInternal(value_str, table, key);
  df.callback(key);
};


/**
 * @param {!goog.async.Deferred} df return key in deferred function.
 * @param {string} table table name.
 * @param {Array.<!Object>} value object to put.
 */
ydn.db.req.SimpleStore.prototype.putObjects = function(df, table, value) {

  var result = [];
  for (var i = 0; i < value.length; i++) {
    var key = this.extractKey(table, value[i]);
    var value_str = ydn.json.stringify(value[i]);
    this.setItemInternal(value_str, table, key);
    result.push(key);
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


