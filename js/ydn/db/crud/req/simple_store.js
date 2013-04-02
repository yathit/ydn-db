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
ydn.db.crud.req.SimpleStore.prototype.keysByKeyRange = goog.abstractMethod;



/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putByKeys = goog.abstractMethod;

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.addObject = function(
    tx, tx_no, df, store_name, value, opt_key) {
  goog.Timer.callOnce(function () {
    /**
     * @type  {!ydn.db.con.simple.Store}
     */
    var store = tx.getSimpleStore(store_name);
    var key = store.addRecord(null, opt_key, value);
    df(key, goog.isDefAndNotNull(key));
  }, 0, this);

};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putObject = function(
      tx, tx_no, df, store_name, value, opt_key) {
  goog.Timer.callOnce(function () {
    /**
     * @type  {!ydn.db.con.simple.Store}
     */
    var store = tx.getSimpleStore(store_name);
    var key = store.addRecord(null, opt_key, value);
    df(key, goog.isDefAndNotNull(key));
  }, 0, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.addObjects = function(
    tx, tx_no, df, store_name, value, opt_key) {

  var result = [];

  goog.Timer.callOnce(function () {
    /**
     * @type  {!ydn.db.con.simple.Store}
     */
    var store = tx.getSimpleStore(store_name);
    for (var i = 0; i < value.length; i++) {
      var key = goog.isDef(opt_key) ? opt_key[i] : undefined;
      result[i] = store.addRecord(null, key, value[i]);
    }
    df(result);
  }, 0, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putData = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putObjects = function(
      tx, tx_no,  df, table, value, opt_key) {
  this.addObjects(tx, tx_no,  df, table, value, opt_key);
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
    df(store.listByKeyRange());
  }, 0, this);

};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.listByIds = function(tx, tx_no, df, store_name, ids) {
  throw 'impl';
};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.listByKeyRange =
    function(tx, df, store_name, key_range, reverse, limit, offset) {

};


/**
* @inheritDoc
*/
ydn.db.crud.req.SimpleStore.prototype.listByKeys = function(tx, tx_no, df, keys) {
  throw 'impl';
};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.listByIndexKeyRange = function(tx, tx_no, df, store_name,
         index, key_range, reverse, limit, offset) {
  //this.listByKeyRange_(df, store_name, index, key_range, reverse, limit, offset)
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeById = function(tx, tx_no, df, table, id) {

  throw 'impl';
};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByKeys = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByKeyRange = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.clearByKeyRange = goog.abstractMethod;

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByIndexKeyRange = goog.abstractMethod;


/**
 * @inheritDoc
*/
ydn.db.crud.req.SimpleStore.prototype.clearByStores = function(tx, tx_no, df, store_names) {

  goog.Timer.callOnce(function () {
    for (var i = 0; i < store_names.length; i++) {
      var store = this.getSimpleStore(store_names[i]);
      df(store.clear());
    }
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
      var store = this.getSimpleStore(store_names[i]);
      df(store.countRecords());
    }
  }, 0, this);

};

/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.countKeyRange = function(tx, tx_no, df,
      store_name, keyRange, index_name) {

  goog.Timer.callOnce(function () {
    var store = this.getSimpleStore(store_name);
    df(store.countRecords(index_name, keyRange));
  }, 0, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.getIndexKeysByKeys = goog.abstractMethod;

