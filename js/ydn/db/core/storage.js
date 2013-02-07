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
 * @fileoverview Provide atomic CRUD database operations.
 *
 * The actual operation is implemented in transaction queue. This class create
 * a new transaction queue as necessary.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.Storage');
goog.require('goog.userAgent.product');
goog.require('ydn.async');
goog.require('ydn.db.core.IOperator');
goog.require('ydn.db.core.DbOperator');
goog.require('ydn.db.tr.Storage');
goog.require('ydn.object');


/**
 * Construct storage providing atomic CRUD database operations on implemented
 * storage mechanisms.
 *
 * This class do not execute database operation, but create a non-overlapping
 * transaction queue on ydn.db.core.DbOperator and all operations are
 * passed to it.
 *
 *
 * @param {string=} opt_dbname database name.
 * @param {(!ydn.db.schema.Database|!DatabaseSchema)=} opt_schema database
 * schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * @param {!StorageOptions=} opt_options options.
 * @extends {ydn.db.tr.Storage}
 * @implements {ydn.db.core.IOperator}
 * @constructor
 */
ydn.db.core.Storage = function(opt_dbname, opt_schema, opt_options) {

  goog.base(this, opt_dbname, opt_schema, opt_options);

};
goog.inherits(ydn.db.core.Storage, ydn.db.tr.Storage);


/**
 * @override
 */
ydn.db.core.Storage.prototype.init = function() {

  goog.base(this, 'init');

};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.newOperator = function(tx_thread) {
  return new ydn.db.core.DbOperator(this, this.schema, tx_thread);
};


/**
 * 
 * @return {ydn.db.core.DbOperator}
 */
ydn.db.core.Storage.prototype.getCoreOperator = function() {
  return /** @type {ydn.db.core.DbOperator} */ (this.db_operator);
};


//
//
///**
// * @override
// */
//ydn.db.core.Storage.prototype.newTxQueue = function(thread, scope_name) {
//  thread = thread || this.thread;
//  return new ydn.db.core.DbOperator(this, thread, this.ptx_no++,
//      this.schema, scope_name);
//};


/**
 * @return {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.core.Storage.prototype.getExecutor = function () {

  var type = this.getType();
  if (type == ydn.db.con.IndexedDb.TYPE) {
    return new ydn.db.core.req.IndexedDb(this.db_name, this.schema);
  } else if (type == ydn.db.con.WebSql.TYPE) {
    return new ydn.db.core.req.WebSql(this.db_name, this.schema);
  } else if (type == ydn.db.con.SimpleStorage.TYPE ||
    type == ydn.db.con.LocalStorage.TYPE ||
    type == ydn.db.con.SessionStorage.TYPE) {
    return new ydn.db.core.req.SimpleStore(this.db_name, this.schema);
  } else {
    throw new ydn.db.InternalError('No executor for ' + type);
  }

};

/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.add = function(store, value, opt_key) {
  return this.getCoreOperator().add(store, value, opt_key);
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.count = function(store_name, key_range, index) {
  return this.getCoreOperator().count(store_name, key_range, index);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.get = function(arg1, arg2) {
  return this.getCoreOperator().get(arg1, arg2);
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.keys = function(store_name, arg2, arg3) {
//  return ydn.db.core.DbOperator.prototype.keys.apply(
//    /** @type {ydn.db.core.DbOperator} */ (this.base_tx_queue),
//    Array.prototype.slice.call(arguments));

  // above trick is the same effect as follow
  //return this.getCoreOperator().keys(store_name, arg2, arg3,
  //  arg4, arg5, arg6, arg7);
  // but it preserve argument length

  return this.getCoreOperator().keys(store_name, arg2, arg3);
};

/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.list = function(arg1, arg2, arg3) {
  return this.getCoreOperator().list(arg1, arg2, arg3);
};

/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.load = function(store_name_or_schema, data, delimiter)  {
  return this.getCoreOperator().load(store_name_or_schema, data, delimiter);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.put = function(store, value, opt_key) {
  return this.getCoreOperator().put(store, value, opt_key);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.clear = function(arg1, arg2, arg3) {
  return this.getCoreOperator().clear(arg1, arg2, arg3);
};


/** @override */
ydn.db.core.Storage.prototype.toString = function() {
  var s = 'Storage:' + this.getName();
  if (goog.DEBUG) { // this.base_tx_queue null
  // is possible while in constructor
    return s + ':' + this.getTxNo();
  }
  return s;
};


