/**
 * @license Copyright 2012 YDN Authors. All Rights Reserved.
 */
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

goog.provide('ydn.db.tr.Storage');
goog.require('ydn.db.Core');
goog.require('ydn.db.tr.IndexedDb');
goog.require('ydn.db.tr.WebSql');
goog.require('ydn.db.tr.LocalStorage');
goog.require('ydn.db.tr.SessionStorage');
goog.require('ydn.db.tr.SimpleStorage');
goog.require('ydn.db.tr.TxStorage');



/**
 * Create a suitable storage mechanism from indexdb, to websql to
 * localStorage.
 *
 * If database name and schema are provided, this will immediately initialize
 * the database and ready to use. However if any of these two are missing,
 * the database is not initialize until they are set by calling
 * {@link #setsetDbName} and {@link #setSchema}.
 * @see goog.db Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * schema used in chronical order.
 * @param {!Object=} opt_options options.
 * @extends{ydn.db.Core}
 * @constructor
 */
ydn.db.tr.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);
};
goog.inherits(ydn.db.tr.Storage, ydn.db.Core);


/**
 * @override
 */
ydn.db.tr.Storage.prototype.createDbInstance = function(db_type, db_name, config) {
  //noinspection JSValidateTypes
  if (db_type == ydn.db.adapter.IndexedDb.TYPE) {
    return new ydn.db.tr.IndexedDb(db_name, config);
  } else if (db_type == ydn.db.adapter.WebSql.TYPE) {
    return new ydn.db.tr.WebSql(db_name, config);
  } else if (db_type == ydn.db.adapter.LocalStorage.TYPE) {
    return new ydn.db.tr.LocalStorage(db_name, config);
  } else if (db_type == ydn.db.adapter.SessionStorage.TYPE) {
    return new ydn.db.tr.SessionStorage(db_name, config);
  } else if (db_type == ydn.db.adapter.SimpleStorage.TYPE)  {
    return new ydn.db.tr.SimpleStorage(db_name, config);
  }
  return null;
};


/**
 * @protected
 * @param {!ydn.db.tr.Mutex} tx
 * @return {!ydn.db.tr.TxStorage}
 */
ydn.db.tr.Storage.prototype.newTxInstance = function(tx) {
  return new ydn.db.tr.TxStorage(this, tx);
};


/**
 * Run a transaction.
 * @export
 * @final
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} mode mode, default to 'readonly'.
 * @param {...} opt_args
 */
ydn.db.tr.Storage.prototype.transaction = function (trFn, store_names, mode, opt_args) {
  goog.asserts.assert(this.db_, 'database not ready');
  var names = store_names;
  if (goog.isString(store_names)) {
    names = [store_names];
  } else if (!goog.isArray(store_names) ||
      (store_names.length > 0 && !goog.isString(store_names[0]))) {
    throw new ydn.error.ArgumentException("storeNames");
  }
  mode = goog.isDef(mode) ? mode : ydn.db.TransactionMode.READ_ONLY;
  var outFn = trFn;
  if (arguments.length > 3) { // handle optional parameters
    // see how this works in goog.partial.
    var args = Array.prototype.slice.call(arguments, 3);
    outFn = function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      newArgs.unshift.apply(newArgs, args);
      return trFn.apply(this, newArgs);
    }
  }


  var me = this;
  this.db_.doTxTransaction(function (tx) {
    // wrap this database and hold active transaction instance
    var tx_db = me.newTxInstance(tx);
    // now execute transaction process
    trFn(tx_db);
    tx_db.out(); // flag transaction callback scope is over.
    // transaction is still active and use in followup request handlers
  }, names, mode);
};


goog.exportSymbol('ydn.db.tr.Storage', ydn.db.tr.Storage);
goog.exportProperty(ydn.db.Core.prototype, 'type',
  ydn.db.Core.prototype.type);
goog.exportProperty(ydn.db.Core.prototype, 'setName',
  ydn.db.Core.prototype.setName);
goog.exportProperty(ydn.db.Core.prototype, 'valueOf',
  ydn.db.Core.prototype.valueOf);
goog.exportProperty(ydn.db.Core.prototype, 'transaction',
  ydn.db.Core.prototype.transaction);
goog.exportProperty(ydn.db.Core.prototype, 'close',
  ydn.db.Core.prototype.close);
// for hacker
goog.exportProperty(ydn.db.Core.prototype, 'db',
  ydn.db.Core.prototype.getDbInstance);
