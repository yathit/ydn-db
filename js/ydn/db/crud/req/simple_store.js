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

goog.provide('ydn.db.crud.req.SimpleStore');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('ydn.db.crud.req.RequestExecutor');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.ConstraintError');


/**
 * @extends {ydn.db.crud.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 *  @param {string} scope
 * @constructor
 * @implements {ydn.db.crud.req.IRequestExecutor}
 */
ydn.db.crud.req.SimpleStore = function(dbname, schema, scope) {
  goog.base(this, dbname, schema, scope);
};
goog.inherits(ydn.db.crud.req.SimpleStore, ydn.db.crud.req.RequestExecutor);



/**
 *
 * @define {boolean} use sync result.
 */
ydn.db.crud.req.SimpleStore.SYNC = true;


/**
 *
 * @type {boolean} debug flag. should always be false.
 */
ydn.db.crud.req.SimpleStore.DEBUG = false;



/**
 * @protected
 * @param {*} value value to return.
 * @return {!goog.async.Deferred} return callback with given value in async.
 */
ydn.db.crud.req.SimpleStore.succeed = function(value) {

  var df = new goog.async.Deferred();

  if (ydn.db.crud.req.SimpleStore.SYNC) {
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
ydn.db.crud.req.SimpleStore.prototype.getTx = function() {
  return /** @type {ydn.db.con.SimpleStorage} */ (this.tx);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.keysByIndexKeyRange = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.keysByKeyRange =  function(tx, tx_no, df,
   store_name, key_range, reverse, limit, offset) {
  goog.Timer.callOnce(function () {
    var store = tx.getSimpleStore(store_name);
    df(store.getKeys(null, key_range, reverse, limit, offset));
  }, 0, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putByKeys = function(tx, tx_no, df, objs,
                                                           keys) {
  this.insertRecord_(tx, tx_no, df, null, objs, keys, true, false);
};


/**
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {string} tx_no tx number.
 * @param {?function(*, boolean=)} df deferred to feed result.
 * @param {string?} store_name table name.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {(!IDBKey|!Array.<IDBKey>|!Array.<!ydn.db.Key>)=} opt_key optional
 * out-of-line key.
 * @param {boolean=} is_update true if call from put.
 * @param {boolean=} single true if call from put.
 * @private
 */
ydn.db.crud.req.SimpleStore.prototype.insertRecord_ = function(tx, tx_no, df,
    store_name, value, opt_key, is_update, single) {

  var msg = tx_no + ' ' + (is_update ? 'put' : 'add') + 'Object' +
    (single ? '' : 's ' + value.length + ' objects');

  this.logger.finest(msg);
  var me = this;

  goog.Timer.callOnce(function () {
    var store;
    if (single) {
      store = tx.getSimpleStore(store_name);
      var key = store.addRecord(opt_key, value, !is_update);
      if (goog.isDefAndNotNull(key)) {
        df(key);
      } else {
        var msg = goog.DEBUG ? ydn.json.toShortString(key) : '';
        var e = new ydn.db.ConstraintError(msg);
        df(e, true);
      }
    } else {
      var st = store_name;
      var arr = [];
      var has_error = false;
      var keys = opt_key || {};
      for (var i = 0; i < value.length; i++) {
        var id;
        if (!store_name) {
          /**
           * @type {ydn.db.Key}
           */
          var db_key = opt_key[i];
          id = db_key.getId();
          st = db_key.getStoreName();
        } else {
          id = keys[i];
        }
        if (!store || store.getName() != st) {
          store =  tx.getSimpleStore(st);
        }
        var result_key = store.addRecord(id, value[i], !is_update);
        if (!goog.isDefAndNotNull(result_key)) {
          has_error = true;
        }
        arr.push(result_key);
      }
      me.logger.finer((has_error ? 'error: ' : 'success: ') + msg);
      df(arr, has_error);
    }
  }, 0, this);
};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.addObject = function(
    tx, tx_no, df, store_name, value, opt_key) {

  this.insertRecord_(tx, tx_no, df, store_name, value, opt_key, false, true);
};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putObject = function(
      tx, tx_no, df, store_name, value, opt_key) {
  this.insertRecord_(tx, tx_no, df, store_name, value, opt_key, true, true);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.addObjects = function(
    tx, tx_no, df, store_name, value, opt_key) {

  this.insertRecord_(tx, tx_no, df, store_name, value, opt_key, false, false);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putData = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putObjects = function(
      tx, tx_no,  df, store_name, value, opt_key) {
  this.insertRecord_(tx, tx_no, df, store_name, value, opt_key, true, false);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.getById = function(tx, tx_no, df,
                                                         store_name, id) {
  goog.Timer.callOnce(function () {
    /**
     * @type  {!ydn.db.con.simple.Store}
     */
    var store = tx.getSimpleStore(store_name);
    var key = store.getRecord(null, id);
    df(key);
  }, 0, this);
};



/**
* @inheritDoc
*/
ydn.db.crud.req.SimpleStore.prototype.listByStore = function (tx, tx_no, df,
                                                               store_name) {
  var tx_ =  /** {ydn.db.con.SimpleStorage} */ (tx);
  goog.Timer.callOnce(function () {
    var store = tx_.getSimpleStore(store_name);
    df(store.getRecords());
  }, 0, this);

};


/**
 *
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 *  @param {string} tx_no transaction number
 * @param {?function(*, boolean=)} df deferred to feed result.
 * @param {string?} store_name table name.
 * @param {!Array.<(IDBKey|!ydn.db.Key)>} ids id to get.
 * @private
 */
ydn.db.crud.req.SimpleStore.prototype.listByIds_ = function (tx, tx_no, df,
                                                        store_name, ids) {
  goog.Timer.callOnce(function () {
    var arr = [];
    var has_error = false;
    var st = store_name;
    /**
     * @type  {!ydn.db.con.simple.Store}
     */
    var store;

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (id instanceof ydn.db.Key) {
        /**
         * @type {ydn.db.Key}
         */
        var db_key = id;
        id = db_key.getId();
        st = db_key.getStoreName();
      }
      if (!store || store.getName() != st) {
        store = tx.getSimpleStore(st);
      }
      var key = store.getRecord(null, id);
      if (!goog.isDefAndNotNull(key)) {
        has_error = true;
      }
      arr.push(key);
    }

    df(arr, has_error);
  }, 0, this);
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.listByIds = function(tx, tx_no, df,
                                                           store_name, ids) {
  this.listByIds_(tx, tx_no, df, store_name, ids);
};


/**
* @inheritDoc
*/
ydn.db.crud.req.SimpleStore.prototype.listByKeys = function(tx, tx_no, df,
                                                            keys) {
  this.listByIds_(tx, tx_no, df, null, keys);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.listByKeyRange = function(tx, tx_no, df,
      store_name, key_range, reverse, limit, offset) {
  goog.Timer.callOnce(function () {
    var store = tx.getSimpleStore(store_name);
    df(store.getRecords(null, key_range, reverse, limit, offset));
  }, 0, this);
};



/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.listByIndexKeyRange = function(tx, tx_no,
      df, store_name, index, key_range, reverse, limit, offset) {
  goog.Timer.callOnce(function () {
    var store = tx.getSimpleStore(store_name);
    df(store.getRecords(index, key_range, reverse, limit, offset));
  }, 0, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeById = function(tx, tx_no, df,
                                                            store_name, id) {
  var msg = tx_no + ' removeById ' + store_name + ' ' + id;
  this.logger.finest(msg);
  var me = this;
  goog.Timer.callOnce(function () {
    var store = tx.getSimpleStore(store_name);
    var cnt = store.removeRecord(id);
    me.logger.finer('success ' + msg + (cnt == 0 ? ' [not found]' : ''));
    df(cnt);
  }, 0, this);
};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByKeys = function(tx, tx_no, df,
                                                              keys) {
  var msg = tx_no + ' removeByKeys ' + keys.length + ' keys';
  this.logger.finest(msg);
  var me = this;
  var store;
  var deleted = 0;
  goog.Timer.callOnce(function () {
    for (var i = 0; i < keys.length; i++) {
      var store_name = keys[i].getStoreName();
      var id = keys[i].getId();
      if (!store || store.getName() != store_name) {
        store = tx.getSimpleStore(store_name);
      }
      deleted += store.removeRecord(id);
    }
    me.logger.finer('success ' + msg + deleted + ' deleted');
    df(deleted);
  }, 0, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByKeyRange = function (
  tx, tx_no, df, store_name, key_range) {
  var msg = tx_no + ' removeByKeyRange';
  this.logger.finest(msg);
  var me = this;
  goog.Timer.callOnce(function () {
    var store = tx.getSimpleStore(store_name);
    var cnt = store.removeRecords(key_range);
    me.logger.finer('success ' + msg);
    df(cnt);
  }, 0, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.clearByKeyRange = function (
    tx, tx_no, df, store_name, key_range) {
  var msg = tx_no + ' clearByKeyRange ' +
    (key_range ? ydn.json.stringify(key_range) : '');
  this.logger.finest(msg);
  var me = this;
  goog.Timer.callOnce(function () {
    var store = tx.getSimpleStore(store_name);
    var cnt = store.removeRecords(key_range);
    me.logger.finer('success ' + msg);
    df(undefined);
  }, 0, this);
};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByIndexKeyRange = goog.abstractMethod;


/**
 * @inheritDoc
*/
ydn.db.crud.req.SimpleStore.prototype.clearByStores = function(tx, tx_no, df, store_names) {
  var msg = tx_no + ' clearByStores';
  this.logger.finest(msg);
  var me = this;
  goog.Timer.callOnce(function () {
    for (var i = 0; i < store_names.length; i++) {
      var store = tx.getSimpleStore(store_names[i]);
      store.clear();
    }
    me.logger.finer('success ' + msg);
    df(store_names.length);
  }, 0, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.countStores = function (tx, tx_no, df, store_names) {

  goog.Timer.callOnce(function () {
    var arr = [];
    for (var i = 0; i < store_names.length; i++) {
      var store = tx.getSimpleStore(store_names[i]);
      arr.push(store.countRecords());
    }
    df(arr);
  }, 0, this);

};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.countKeyRange = function(tx, tx_no, df,
      store_name, keyRange, index_name) {

  goog.Timer.callOnce(function () {
    var store = tx.getSimpleStore(store_name);
    df(store.countRecords(index_name, keyRange));
  }, 0, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.getIndexKeysByKeys = goog.abstractMethod;

