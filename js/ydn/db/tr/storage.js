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
goog.require('ydn.db.core.Storage');
goog.require('ydn.db.tr.ITxStorage');
goog.require('ydn.db.tr.IStorage');
goog.require('ydn.db.tr.TxStorage');



/**
 * Create a suitable storage mechanism from indexdb, to websql to
 * localStorage.
 *
 * If database name and schema are provided, this will immediately initialize
 * the database and ready to use. However if any of these two are missing,
 * the database is not initialize until they are set by calling
 * {@link #setName} and {@link #setSchema}.
 * @see goog.db Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * schema used in chronical order.
 * @param {!Object=} opt_options options.
 * @implements {ydn.db.tr.IStorage}
 * @extends{ydn.db.core.Storage}
 * @constructor
 */
ydn.db.tr.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);
};
goog.inherits(ydn.db.tr.Storage, ydn.db.core.Storage);
//
//
///**
// * @override
// */
//ydn.db.tr.Storage.prototype.createDbInstance = function(db_type, db_name, config) {
//  //noinspection JSValidateTypes
//  if (db_type == ydn.db.adapter.IndexedDb.TYPE) {
//    return new ydn.db.tr.IndexedDb(db_name, config);
//  } else if (db_type == ydn.db.adapter.WebSql.TYPE) {
//    return new ydn.db.tr.WebSql(db_name, config);
//  } else if (db_type == ydn.db.adapter.LocalStorage.TYPE) {
//    return new ydn.db.tr.LocalStorage(db_name, config);
//  } else if (db_type == ydn.db.adapter.SessionStorage.TYPE) {
//    return new ydn.db.tr.SessionStorage(db_name, config);
//  } else if (db_type == ydn.db.adapter.SimpleStorage.TYPE)  {
//    return new ydn.db.tr.SimpleStorage(db_name, config);
//  }
//  return null;
//};



/**
 * @protected
 * @param {string} scope
 * @return {!ydn.db.tr.TxStorage}
 */
ydn.db.tr.Storage.prototype.newTxInstance = function(scope) {
  return new ydn.db.tr.TxStorage(this, scope);
};



/**
 * One database can have only one transaction.
 * @private
 * @final
 * @type {!ydn.db.tr.Mutex}
 */
ydn.db.tr.Storage.prototype.mu_tx_ = new ydn.db.tr.Mutex();


/**
 *
 * @return {!ydn.db.tr.Mutex}
 */
ydn.db.tr.Storage.prototype.getMuTx = function() {
  return this.mu_tx_;
};

/**
 *
 * @return {number}
 */
ydn.db.tr.Storage.prototype.getTxNo = function() {
  return this.mu_tx_.getTxCount();
};


/**
 * Obtain active consumable transaction object.
 * @return {ydn.db.tr.Mutex} transaction object if active and available.
 */
ydn.db.tr.Storage.prototype.getActiveTx = function() {
  return this.mu_tx_.isActiveAndAvailable() ? this.mu_tx_ : null;
};



/**
 * Run a transaction.
 * @export
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.TransactionEventTypes, *)=} oncompleted
 * @param {...} opt_args
 * @override
 */
ydn.db.tr.Storage.prototype.transaction = function (trFn, store_names, opt_mode,
                                                    oncompleted, opt_args) {

  //console.log('tr starting ' + trFn.name);
  var scope_name = trFn.name || '';

  var names = store_names;
  if (goog.isString(store_names)) {
    names = [store_names];
  } else if (!goog.isArray(store_names) ||
      (store_names.length > 0 && !goog.isString(store_names[0]))) {
    throw new ydn.error.ArgumentException("storeNames");
  }
  var mode = goog.isDef(opt_mode) ? opt_mode : ydn.db.TransactionMode.READ_ONLY;
  var outFn = trFn;
  if (arguments.length > 4) { // handle optional parameters
    // see how this works in goog.partial.
    var args = Array.prototype.slice.call(arguments, 4);
    outFn = function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      newArgs.unshift.apply(newArgs, args);
      return trFn.apply(this, newArgs);
    }
  }

  var me = this;

  var tx_db;
  var transaction_process = function(tx) {

    //console.log('tr running ' + trFn.name);

    me.mu_tx_.up(tx, scope_name);

    // wrap this database and hold active transaction instance
    tx_db = me.newTxInstance(scope_name);
    // now execute transaction process
    trFn(tx_db);
    me.mu_tx_.out(); // flag transaction callback scope is over.
    // transaction is still active and use in followup request handlers
  };

  var completed_handler = function(type, event) {
    me.mu_tx_.down(type, event);
    if (goog.isFunction(oncompleted)) {
      /**
       * @preserve_try
       */
      try {
        oncompleted(type, event);
      } catch (e) {
        // swallow error. document it publicly.
        // this is necessary and
        if (goog.DEBUG) {
          throw e;
        }
      }
    }
  };

  goog.base(this, 'transaction', transaction_process, names, mode, completed_handler);

};



goog.exportSymbol('ydn.db.tr.Storage', ydn.db.tr.Storage);
goog.exportProperty(ydn.db.core.Storage.prototype, 'type',
  ydn.db.core.Storage.prototype.type);
goog.exportProperty(ydn.db.core.Storage.prototype, 'setName',
  ydn.db.core.Storage.prototype.setName);
goog.exportProperty(ydn.db.core.Storage.prototype, 'getConfig',
  ydn.db.core.Storage.prototype.getConfig);
goog.exportProperty(ydn.db.core.Storage.prototype, 'transaction',
  ydn.db.core.Storage.prototype.transaction);
goog.exportProperty(ydn.db.core.Storage.prototype, 'close',
  ydn.db.core.Storage.prototype.close);
// for hacker.
goog.exportProperty(ydn.db.core.Storage.prototype, 'onReady',
  ydn.db.core.Storage.prototype.onReady);
