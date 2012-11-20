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

goog.provide('ydn.db.core.req.SimpleStore');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('ydn.db.req.RequestExecutor');
goog.require('ydn.db.core.req.IRequestExecutor');


/**
 * @extends {ydn.db.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.core.req.SimpleStore = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.SimpleStore, ydn.db.req.RequestExecutor);



/**
 *
 * @define {boolean} use sync result.
 */
ydn.db.core.req.SimpleStore.SYNC = true;


/**
 *
 * @type {boolean} debug flag. should always be false.
 */
ydn.db.core.req.SimpleStore.DEBUG = false;



/**
 * @protected
 * @param {*} value value to return.
 * @return {!goog.async.Deferred} return callback with given value in async.
 */
ydn.db.core.req.SimpleStore.succeed = function(value) {

  var df = new goog.async.Deferred();

  if (ydn.db.core.req.SimpleStore.SYNC) {
    df.callback(value);
  } else {
    goog.Timer.callOnce(function() {
      df.callback(value);
    }, 0);
  }

  return df;
};


/**
 *
 * @return {ydn.db.con.SimpleStorage}
 */
ydn.db.core.req.SimpleStore.prototype.getTx = function() {
  return /** @type {ydn.db.con.SimpleStorage} */ (this.tx);
};

/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.keysByIndexKeyRange = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.keysByIndexKeys = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.keysByKeyRange = goog.abstractMethod;



/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.keysByIndexKeyRange = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.keysByIndexKeys = goog.abstractMethod;

/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.keysByStore = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.keysByStore = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.putByKeys = goog.abstractMethod;


/**
 * @param {!goog.async.Deferred} df return key in deferred function.
 * @param {string} table table name.
* @param {!Object} value object to put.
 * @param {(!Array|string|number)=} opt_key optional out-of-line key.
*/
ydn.db.core.req.SimpleStore.prototype.putObject = function(
      df, table, value, opt_key) {
  var key = this.getTx().setItemInternal(value, table, opt_key);
  df.callback(key);
};


/**
 * @param {!goog.async.Deferred} df return key in deferred function.
 * @param {string} table table name.
 * @param {Array.<!Object>} value object to put.
 * @param {!Array.<(!Array|string|number)>=} opt_key optional out-of-line keys.
 */
ydn.db.core.req.SimpleStore.prototype.putObjects = function(
      df, table, value, opt_key) {

  var result = [];
  for (var i = 0; i < value.length; i++) {
    var key = goog.isDef(opt_key) ? opt_key[i] : undefined;
    result[i] = this.getTx().setItemInternal(value[i], table, key);
  }

  df.callback(result);
};


/**
* Retrieve an object from store.
 * @param {!goog.async.Deferred} df return object in deferred function.
 * @param {string} store_name store name.
* @param {(string|number|Date|!Array)} id id.
*/
ydn.db.core.req.SimpleStore.prototype.getById = function(df, store_name, id) {
  df.callback(this.getTx().getItemInternal(store_name, id));
};



/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.listByStore = goog.abstractMethod;


/**
* @inheritDoc
*/
ydn.db.core.req.SimpleStore.prototype.listByStores = function (df, store_names) {

  goog.Timer.callOnce(function () {

    var arr = [];

    for (var i = 0; i < store_names.length; i++) {
      arr = arr.concat(this.tx.getKeys(store_names[i]));
    }

    df.callback(arr);
  }, 0, this);

};


/**
 *
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.listByIds = function(df, store_name, ids) {
  var arr = [];
  for (var i = 0; i < ids.length; i++) {
    var value = this.getTx().getItemInternal(store_name, ids[i]);
    arr.push(value);
  }
  df.callback(arr);
};

/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.listByKeyRange = goog.abstractMethod;


/**
* @inheritDoc
*/
ydn.db.core.req.SimpleStore.prototype.listByKeys = function(df, keys) {
  var arr = [];
  for (var i = 0; i < keys.length; i++) {
    var value = this.getTx().getItemInternal(keys[i].getStoreName(), keys[i].getId());
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
ydn.db.core.req.SimpleStore.prototype.clearById = function(df, table, id) {

  this.getTx().removeItemInternal(table, id);

  df.callback(true);
};


/**
 * @inheritDoc
*/
ydn.db.core.req.SimpleStore.prototype.clearByStore = function(df, stores) {

  var store_names = goog.isString(stores) ? [stores] : stores;

  for (var i = 0; i < store_names.length; i++) {
    this.tx.removeItemInternal(store_names[i]);
  }

  df.callback(true);
};


/**
* Get number of items stored.
 * @param {!goog.async.Deferred} df return number of items in deferred function.
 * @param {!Array.<string>}  store_names table name.
*/
ydn.db.core.req.SimpleStore.prototype.countStores = function (df, store_names) {

  goog.Timer.callOnce(function () {
    var n = 0;
    for (var i = 0; i < store_names.length; i++) {
      var arr = this.tx.getKeys(store_names[i]);
      n += arr.length;
    }
    df.callback(n);
  }, 0, this);

};

/**
 * Get number of items stored.
 * @param {!goog.async.Deferred} df return number of items in deferred function.
 * @param {string} opt_table table name.
 *  @param {ydn.db.KeyRange} keyRange the key range.
 */
ydn.db.core.req.SimpleStore.prototype.countKeyRange = function(df, opt_table,
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


