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
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */



goog.provide('ydn.db.crud.req.SimpleStore');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('ydn.db.ConstraintError');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.crud.req.RequestExecutor');



/**
 * @extends {ydn.db.crud.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.crud.req.IRequestExecutor}
 * @struct
 */
ydn.db.crud.req.SimpleStore = function(dbname, schema) {
  goog.base(this, dbname, schema);
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
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.keysByIndexKeyRange = function(tx, tx_no,
    df, store_name, index_name, key_range, reverse, limit, offset) {
  var msg = tx_no + ' keysByIndexKeyRange ' + store_name + ':' + index_name +
      ' ' + (key_range ? ydn.json.toShortString(key_range) : '');
  this.logger.finest(msg);

  var on_complete = tx.getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var arr = store.getKeys(index_name, key_range, reverse, limit, offset);
    this.logger.finer('success ' + msg);
    df(arr);
    on_complete();
    on_complete = null;
  }, this);

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.keysByKeyRange = function(tx, tx_no, df,
    store_name, key_range, reverse, limit, offset) {
  var msg = tx_no + ' keysByKeyRange ' + store_name + ' ' +
      (key_range ? ydn.json.toShortString(key_range) : '');
  this.logger.finest(msg);
  var comp = tx.getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var arr = store.getKeys(null, key_range, reverse, limit, offset);
    this.logger.finer('success ' + msg);
    df(arr);
    comp();
    comp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putByKeys = function(tx, tx_no, df, objs,
                                                           keys) {
  this.insertRecord_(tx, tx_no, df, null, objs, keys, true, false);
};


/**
 * @param {ydn.db.con.IDatabase.Transaction} tx
 * @param {string} tx_no tx number.
 * @param {?function(*, boolean=)} df deferred to feed result.
 * @param {string?} store_name table name.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {(!IDBKey|!Array.<IDBKey>|!Array.<!ydn.db.Key>)=} opt_key optional
 * out-of-line key.
 * @param {boolean=} opt_is_update true if call from put.
 * @param {boolean=} opt_single true if call from put.
 * @private
 */
ydn.db.crud.req.SimpleStore.prototype.insertRecord_ = function(tx, tx_no, df,
    store_name, value, opt_key, opt_is_update, opt_single) {

  var label = tx_no + ' ' + (opt_is_update ? 'put' : 'add') + 'Object' +
      (opt_single ? '' : 's ' + value.length + ' objects');

  this.logger.finest(label);
  var me = this;

  var on_comp = tx.getStorage(function(storage) {
    var store;
    if (opt_single) {
      store = storage.getSimpleStore(store_name);
      var key = store.addRecord(opt_key, value, !opt_is_update);
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
          store = storage.getSimpleStore(st);
        }
        var result_key = store.addRecord(id, value[i], !opt_is_update);
        if (!goog.isDefAndNotNull(result_key)) {
          has_error = true;
        }
        arr.push(result_key);
      }
      me.logger.finer((has_error ? 'error ' : 'success ') + label);
      df(arr, has_error);
    }
    on_comp();
    on_comp = null;
  }, this);
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
ydn.db.crud.req.SimpleStore.prototype.putData = function(tx, tx_no, df,
    store_name, data, delimiter) {
  throw 'not impl';
};


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
  var onComp = tx.getStorage(function(storage) {
    /**
     * @type  {!ydn.db.con.simple.Store}
     */
    var store = storage.getSimpleStore(store_name);
    var key = store.getRecord(null, id);
    df(key);
    onComp();
    onComp = null;
  }, this);
};


/**
* @inheritDoc
*/
ydn.db.crud.req.SimpleStore.prototype.listByStore = function(tx, tx_no, df,
                                                             store_name) {
  var onComp = tx.getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    df(store.getRecords());
    onComp();
    onComp = null;
  }, this);

};


/**
 *
 * @param {ydn.db.con.IDatabase.Transaction} tx
 *  @param {string} tx_no transaction number.
 * @param {?function(*, boolean=)} df deferred to feed result.
 * @param {string?} store_name table name.
 * @param {!Array.<(IDBKey|!ydn.db.Key)>} ids id to get.
 * @private
 */
ydn.db.crud.req.SimpleStore.prototype.listByIds_ = function(tx, tx_no, df,
    store_name, ids) {
  var onComp = tx.getStorage(function(storage) {
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
        store = storage.getSimpleStore(st);
      }
      var key = store.getRecord(null, id);
      if (!goog.isDefAndNotNull(key)) {
        has_error = true;
      }
      arr.push(key);
    }

    df(arr, has_error);
    onComp();
    onComp = null;
  }, this);
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
  var msg = tx_no + ' listByKeyRange ' + store_name + ' ' +
      (key_range ? ydn.json.toShortString(key_range) : '');
  this.logger.finest(msg);
  var onComp = tx.getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var results = store.getRecords(null, key_range, reverse, limit, offset);
    this.logger.finer('success ' + msg + results.length + ' records found.');
    df(results);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.listByIndexKeyRange = function(tx, tx_no,
      df, store_name, index, key_range, reverse, limit, offset) {
  var onComp = tx.getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    df(store.getRecords(index, key_range, reverse, limit, offset));
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeById = function(tx, tx_no, df,
                                                            store_name, id) {
  var msg = tx_no + ' removeById ' + store_name + ' ' + id;
  this.logger.finest(msg);
  var me = this;
  var onComp = tx.getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var cnt = store.removeRecord(id);
    me.logger.finer('success ' + msg + (cnt == 0 ? ' [not found]' : ''));
    df(cnt);
    onComp();
    onComp = null;
  }, this);
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
  var onComp = tx.getStorage(function(storage) {
    for (var i = 0; i < keys.length; i++) {
      var store_name = keys[i].getStoreName();
      var id = keys[i].getId();
      if (!store || store.getName() != store_name) {
        store = storage.getSimpleStore(store_name);
      }
      deleted += store.removeRecord(id);
    }
    me.logger.finer('success ' + msg + deleted + ' deleted');
    df(deleted);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByKeyRange = function(
    tx, tx_no, df, store_name, key_range) {
  var msg = tx_no + ' removeByKeyRange';
  this.logger.finest(msg);
  var me = this;
  var onComp = tx.getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var cnt = store.removeRecords(key_range);
    me.logger.finer('success ' + msg);
    df(cnt);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.clearByKeyRange = function(
    tx, tx_no, df, store_name, key_range) {
  var msg = tx_no + ' clearByKeyRange ' +
      (key_range ? ydn.json.stringify(key_range) : '');
  this.logger.finest(msg);
  var me = this;
  var onComp = tx.getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var cnt = store.removeRecords(key_range);
    me.logger.finer('success ' + msg);
    df(undefined);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByIndexKeyRange = function(
    tx, tx_no, df, store_name, index_name, key_range) {
  throw 'not impl';
};

/**
 * @inheritDoc
*/
ydn.db.crud.req.SimpleStore.prototype.clearByStores = function(tx, tx_no, df,
                                                               store_names) {
  var msg = tx_no + ' clearByStores';
  this.logger.finest(msg);
  var onComp = tx.getStorage(function(storage) {
    for (var i = 0; i < store_names.length; i++) {
      var store = storage.getSimpleStore(store_names[i]);
      store.clear();
    }
    this.logger.finer('success ' + msg);
    df(store_names.length);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.countStores = function(tx, tx_no, df,
                                                             store_names) {
  var msg = tx_no + ' countStores';
  this.logger.finest(msg);
  var onComp = tx.getStorage(function(storage) {
    var arr = [];
    for (var i = 0; i < store_names.length; i++) {
      var store = storage.getSimpleStore(store_names[i]);
      arr.push(store.countRecords());
    }
    this.logger.finer('success ' + msg);
    df(arr);
    onComp();
    onComp = null;
  }, this);

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.countKeyRange = function(tx, tx_no, df,
    store_name, keyRange, index_name) {
  var msg = tx_no + ' count' +
      (goog.isDefAndNotNull(index_name) ? 'Index' : '') +
      (goog.isDefAndNotNull(keyRange) ? 'KeyRange' : 'Store');
  var me = this;
  this.logger.finest(msg);
  var onComp = tx.getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var no = store.countRecords(index_name, keyRange);
    this.logger.finer('success ' + msg);
    df(no);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.getIndexKeysByKeys = function(tx, lbl, df,
    store_name, index_name, key_range, reverse, limit, offset, unique) {
  throw 'not impl';
};

