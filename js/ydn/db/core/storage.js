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
goog.require('ydn.db.core.IStorage');
goog.require('ydn.db.core.TxQueue');
goog.require('ydn.db.tr.Storage');
goog.require('ydn.object');


/**
 * Construct storage providing atomic CRUD database operations on implemented
 * storage mechanisms.
 *
 * This class do not execute database operation, but create a non-overlapping
 * transaction queue on ydn.db.core.TxQueue and all operations are
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
 * @implements {ydn.db.core.IStorage}
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
 *
 * @return {!ydn.db.core.TxQueue}
 */
ydn.db.core.Storage.prototype.getTxQueue = function() {
  return /** @type {!ydn.db.core.TxQueue} */ (this.base_tx_queue);
};


/**
 * @override
 */
ydn.db.core.Storage.prototype.newTxQueue = function(scope_name, blocked) {
  return new ydn.db.core.TxQueue(this, !!blocked, this.ptx_no++, scope_name,
    this.schema);
};


/**
 * @final
 * @return {number} transaction series number.
 */
ydn.db.core.Storage.prototype.getTxNo = function() {
  return this.getTxQueue().getTxNo();
};

/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.add = function(store, value, opt_key) {
  return this.getTxQueue().add(store, value, opt_key);
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.count = function(store_name, key_range, index) {
  return this.getTxQueue().count(store_name, key_range, index);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.get = function(arg1, arg2) {
  return this.getTxQueue().get(arg1, arg2);
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.keys = function(store_name, arg2, arg3,
                                                arg4, arg5, arg6, arg7) {
//  return ydn.db.core.TxQueue.prototype.keys.apply(
//    /** @type {ydn.db.core.TxQueue} */ (this.base_tx_queue),
//    Array.prototype.slice.call(arguments));

  // above trick is the same effect as follow
  //return this.getTxQueue().keys(store_name, arg2, arg3,
  //  arg4, arg5, arg6, arg7);
  // but it preserve argument length

  return this.getTxQueue().keys(store_name, arg2, arg3, arg4, arg5, arg6, arg7);
};

/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.list = function(arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
  return this.getTxQueue().list(arg1, arg2, arg3, arg4, arg5, arg6, arg7);
};

/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.load = function(store_name_or_schema, data, delimiter)  {
  return this.getTxQueue().load(store_name_or_schema, data, delimiter);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.put = function(store, value, opt_key) {
  return this.getTxQueue().put(store, value, opt_key);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.clear = function(arg1, arg2, arg3) {
  return this.getTxQueue().clear(arg1, arg2, arg3);
};


/** @override */
ydn.db.core.Storage.prototype.toString = function() {
  var s = 'Storage:' + this.getName();
  if (goog.DEBUG && this.base_tx_queue) { // this.base_tx_queue null
  // is possible while in constructor
    return s + ':' + this.base_tx_queue.getTxNo();
  }
  return s;
};


