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

goog.provide('ydn.db.exe.SimpleStore');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.Timer');
goog.require('ydn.db.exe.Executor');


/**
 * @implements {ydn.db.exe.Executor}
 * @param {Object} tx
 * @constructor
 */
ydn.db.exe.SimpleStore = function(tx) {
  this.tx_ = tx;
};




/**
 *
 * @type {Object}
 * @private
 */
ydn.db.exe.SimpleStore.prototype.tx_ = null;

/**
 * @inheritDoc
 */
ydn.db.exe.SimpleStore.prototype.setTx = function(tx) {
  this.tx_ = tx;
};

/**
 * @inheritDoc
 */
ydn.db.exe.SimpleStore.prototype.isActive = function() {
  return !!this.tx_;
};


/**
 *
 * @return {Object} return memory store object.
 */
ydn.db.exe.SimpleStore.getFakeLocalStorage = function() {

  var localStorage = {};
  localStorage.setItem = function(key, value) {
    localStorage[key] = value;
  };
  localStorage.getItem = function(key) {
    return localStorage[key] || null; // window.localStorage return null
    // if the key don't exist.
  };
  localStorage.clear = function() {
    for (var key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        delete localStorage[key];
      }
    }
  };
  return localStorage;
};


/**
 *
 * @return {boolean} true if memory is supported.
 */
ydn.db.exe.SimpleStore.isSupported = function() {
  return true;
};


/**
 *
 * @define {boolean} use sync result.
 */
ydn.db.exe.SimpleStore.SYNC = false;


/**
 * @protected
 * @param {*} value
 * @return {!goog.async.Deferred} return callback with given value in async.
 */
ydn.db.exe.SimpleStore.succeed = function(value) {

  var df = new goog.async.Deferred();

  if (ydn.db.exe.SimpleStore.SYNC) {
    df.callback(value);
  } else {
    goog.Timer.callOnce(function() {
      df.callback(value);
    }, 0);
  }

  return df;
};


/**
 * @param {string} table table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @param {(string|number)=} opt_key
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.exe.SimpleStore.prototype.put = function (table, value, opt_key) {
  var key, value_str;
  var result;

  if (goog.isArray(value)) {
    result = [];
    for (var i = 0; i < value.length; i++) {
      key = this.extractKey(table, value[i]);
      value_str = ydn.json.stringify(value[i]);
      this.setItemInternal(value_str, table, key);
      result.push(key);
    }
  } else if (goog.isObject(value)) {
    key = this.extractKey(table, value);
    value_str = ydn.json.stringify(value);
    this.setItemInternal(value_str, table, key);
    result = key;
  } else {
    throw new ydn.error.ArgumentException();
  }

  return ydn.db.exe.SimpleStore.succeed(result);
};


/**
 * Retrieve an object from store.
 * @private
 * @param {string} store_name
 * @param {string|number} id
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.exe.SimpleStore.prototype.getById_ = function(store_name, id) {
  return goog.async.Deferred.succeed(this.getItemInternal(store_name, id));
};



/**
 * Retrieve all objects from store.
 * @private
 * @param {string=} opt_store_name
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.exe.SimpleStore.prototype.getByStore_ = function (opt_store_name) {
  var arr = [];
  var collect = function (store_name) {
    for (var item in this.cache_) {
      if (this.cache_.hasOwnProperty(item)) {
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

  return goog.async.Deferred.succeed(arr);
};


/**
 * @return {string}
 */
ydn.db.exe.SimpleStore.prototype.type = function() {
  return 'memory';
};


/**
 *
 * @param {!ydn.db.Query} q
 * @return {goog.async.Deferred}
 * @private
 */
ydn.db.exe.SimpleStore.prototype.get1_ = function(q) {
  var df = new goog.async.Deferred();

  var fetch_df = this.fetch(q);
  fetch_df.addCallback(function (value) {
    df.callback(goog.isArray(value) ? value[0] : undefined);
  });
  fetch_df.addErrback(function (value) {
    df.errback(value);
  });

  return df;
};


/**
 *
 * @param {string} store_name
 * @param {!Array.<string|number>} ids
 * @return {!goog.async.Deferred} return result in deferred function.
 * @private
 */
ydn.db.exe.SimpleStore.prototype.getByIds_ = function(store_name, ids) {
  var arr = [];
  for (var i = 0; i < ids.length; i++) {
    arr.push(this.getById_(store_name, ids[i]));
  }
  return goog.async.Deferred.succeed(arr);
};

/**
 *
 * @param {!Array.<!ydn.db.Key>} keys
 * @return {!goog.async.Deferred} return result in deferred function.
 * @private
 */
ydn.db.exe.SimpleStore.prototype.getByKeys_ = function(keys) {
  var arr = [];
  for (var i = 0; i < keys.length; i++) {
    arr.push(this.getById_(keys[i].getStoreName(), keys[i].getId()));
  }
  return goog.async.Deferred.succeed(arr);
};


/**
 * Return object
 * @param {IDBTransaction|IDBTransaction|Object} tx
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(string|number|!Array.<string>)=} arg2 object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.exe.SimpleStore.prototype.getInTx = function (tx, arg1, arg2) {

  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {ydn.db.Key}
     */
    var k = arg1;
    return this.getById_(k.getStoreName(), k.getId());
  } else if (goog.isString(arg1)) {
    if (goog.isString(arg2) || goog.isNumber(arg2)) {
      /** @type {string} */
      var store_name = arg1;
      /** @type {string|number} */
      var id = arg2;
      return this.getById_(store_name, id);
    } else if (!goog.isDef(arg2)) {
      return this.getByStore_(arg1);
    } else if (goog.isArray(arg2)) {
      if (goog.isString(arg2[0]) || goog.isNumber(arg2[0])) {
        return this.getByIds_(arg1, arg2);
      } else {
        throw new ydn.error.ArgumentException();
      }
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (goog.isArray(arg1)) {
    if (arg1[0] instanceof ydn.db.Key) {
      return this.getByKeys_(arg1);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (!goog.isDef(arg1) && !goog.isDef(arg2)) {
    return this.getByStore_();
  } else {
    throw new ydn.error.ArgumentException();
  }
};


/**
 * Return object
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=}  arg1 table name.
 * @param {(string|number|!Array.<string>)=} arg2 object key to be retrieved, if not provided,
 * all entries in the store will return.
 * param {number=} start start number of entry.
 * param {number=} limit maximun number of entries.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.exe.SimpleStore.prototype.get = function (arg1, arg2) {
  return this.getInTx(this.cache_, arg1, arg2);
};


/**
 * Remove all data in a store (table).
 * @param {string=} opt_table delete a specific table or all tables.
 * @param {(string|number)=} opt_key delete a specific row.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.exe.SimpleStore.prototype.clear = function(opt_table, opt_key) {

  if (goog.isDef(opt_table) && goog.isDef(opt_key)) {
    this.removeItemInternal(opt_table, opt_key);
  } else {
    var tables_to_clear = goog.isDef(opt_table) ?
        [opt_table] : this.schema.listStores();
    for (var key in this.cache_) {
      if (this.cache_.hasOwnProperty(key)) {
        for (var table, i = 0; table = tables_to_clear[i]; i++) {
          if (goog.string.startsWith(key, '_database_' + this.dbname + '-' + table)) {
            delete this.cache_[key];
          }
        }
      }
    }
  }
  return ydn.db.exe.SimpleStore.succeed(true);
};


/**
 * Delete the database, store or an entry.
 * @param {string=} opt_table delete a specific store.
 * @param {(string|number)=} opt_id delete a specific row.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.exe.SimpleStore.prototype.remove = function(opt_table, opt_id) {
  if (goog.isDef(opt_id) && goog.isDef(opt_table)) {
    var key = this.makeKey(opt_table, opt_id);
    delete this.cache_[key];
    return ydn.db.exe.SimpleStore.succeed(true);
  } else {
    return this.clear(opt_table);
  }
};


/**
 * Get number of items stored.
 * @param {string=} opt_table table name
 * @return {!goog.async.Deferred} return number of items in deferred function.
 */
ydn.db.exe.SimpleStore.prototype.count = function(opt_table) {

  var pre_fix = '_database_' + this.dbname;
  if (goog.isDef(opt_table)) {
    pre_fix += '-' + opt_table;
  }

  var n = 0;
  for (var key in this.cache_) {
    if (this.cache_.hasOwnProperty(key)) {
      if (goog.string.startsWith(key, pre_fix)) {
        n++;
      }
    }
  }
  return ydn.db.exe.SimpleStore.succeed(n);
};


/**
* @param {!ydn.db.Query} q query.
* @param {number=} limit
* @param {number=} offset
* @return {!goog.async.Deferred}
*/
ydn.db.exe.SimpleStore.prototype.fetch = function(q, limit, offset) {
  throw new ydn.error.NotImplementedException();
};


