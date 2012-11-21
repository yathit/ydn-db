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
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.Storage');
goog.require('goog.userAgent.product');
goog.require('ydn.async');
goog.require('ydn.db.core.IStorage');
goog.require('ydn.db.core.TxStorage');
goog.require('ydn.db.tr.Storage');
goog.require('ydn.object');


/**
 * Construct storage providing atomic CRUD database operations on implemented
 * storage mechanisms.
 *
 * This class do not execute database operation, but create a non-overlapping
 * transaction queue on ydn.db.core.TxStorage and all operations are
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

  this.default_tx_queue_ = this.newTxInstance('base');

};
goog.inherits(ydn.db.core.Storage, ydn.db.tr.Storage);


/**
 * @override
 */
ydn.db.core.Storage.prototype.init = function() {

  goog.base(this, 'init');

};


/**
 * @override
 */
ydn.db.core.Storage.prototype.newTxInstance = function(scope_name) {
  return new ydn.db.core.TxStorage(this, this.ptx_no++, scope_name,
    this.schema);
};


/**
 * @final
 * @return {number} transaction series number.
 */
ydn.db.core.Storage.prototype.getTxNo = function() {
  return this.default_tx_queue_.getTxNo();
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.count = function(store_name, key_range, index) {
  return this.default_tx_queue_.count(store_name, key_range, index);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.get = function(arg1, arg2) {
  return this.default_tx_queue_.get(arg1, arg2);
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.keys = function(store_name, arg2, arg3,
                                                arg4, arg5, arg6, arg7) {
  return ydn.db.core.TxStorage.prototype.keys.apply(
    /** @type {ydn.db.core.TxStorage} */ (this.default_tx_queue_),
    Array.prototype.slice.call(arguments));

  // above trick is the same effect as follow
  //return this.default_tx_queue_.keys(store_name, arg2, arg3,
  //  arg4, arg5, arg6, arg7);
  // but it preserve argument length
};

/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.list = function(arg1, arg2, arg3, arg4, arg5) {
  return this.default_tx_queue_.list(arg1, arg2, arg3, arg4, arg5);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.put = function(store, value, opt_key) {
  return this.default_tx_queue_.put(store, value, opt_key);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.clear = function(arg1, arg2) {
  return this.default_tx_queue_.clear(arg1, arg2);
};


/** @override */
ydn.db.core.Storage.prototype.toString = function() {
  var s = 'Storage:' + this.getName();
  if (goog.DEBUG && this.default_tx_queue_) { // this.default_tx_queue_ null
  // is possible while in constructor
    return s + ':' + this.default_tx_queue_.getTxNo();
  }
  return s;
};


