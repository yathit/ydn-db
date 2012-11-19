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
 * @fileoverview Provide database query operations.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Storage');
goog.require('goog.userAgent.product');
goog.require('ydn.async');
goog.require('ydn.object');
if (ydn.db.base.ENABLE_ENCRYPTION) {
  goog.require('ydn.db.RichStorage_');
}
goog.require('ydn.db.index.Storage');
goog.require('ydn.db.TxStorage');
goog.require('ydn.db.IStorage');


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
 * @param {(!ydn.db.schema.Database|!DatabaseSchema)=} opt_schema database
 * schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * @param {!StorageOptions=} opt_options options.
 * @extends {ydn.db.index.Storage}
 * @constructor *
 */
ydn.db.Storage = function(opt_dbname, opt_schema, opt_options) {

  goog.base(this, opt_dbname, opt_schema, opt_options);

};
goog.inherits(ydn.db.Storage, ydn.db.index.Storage);

//
///**
// * Initialize suitable database if {@code dbname} and {@code schema} are set,
// * starting in the following order of preference.
// * @override
// */
//ydn.db.Storage.prototype.initDatabase = function () {
//  // handle version change
//  if (goog.isDef(this.schema) &&
//    (ydn.db.base.ENABLE_DEFAULT_TEXT_STORE &&
//      !this.schema.hasStore(ydn.db.schema.Store.DEFAULT_TEXT_STORE))) {
//    this.schema.addStore(new ydn.db.schema.Store(
//      ydn.db.schema.Store.DEFAULT_TEXT_STORE, 'id'));
//  }
//  goog.base(this, 'initDatabase');
//};


/**
 * @override
 */
ydn.db.Storage.prototype.init = function() {

  goog.base(this, 'init');

};


/**
 * @override
 */
ydn.db.Storage.prototype.newTxInstance = function(scope_name) {
  return new ydn.db.TxStorage(this, this.ptx_no++, scope_name, this.schema);
};


/**
 *
 * @param {string} secret passphase.
 * @param {number=} opt_expiration default expiration time in miliseconds.
 */
ydn.db.Storage.prototype.encrypt = function(secret, opt_expiration) {
  if (ydn.db.base.ENABLE_ENCRYPTION) {
    /**
     * @protected
     * @final
     * @type {ydn.db.RichStorage}
     */
    this.wrapper = new ydn.db.RichStorage(this, secret, opt_expiration);
  }
};


/**
 *
 * @return {ydn.db.RichStorage} wrapper.
 */
ydn.db.Storage.prototype.getWrapper = function() {
  return this.wrapper || null;
};


/**
 * @param {!ydn.db.Iterator|!ydn.db.Sql} q query.
 * @return {!goog.async.Deferred} return result as list.
 */
ydn.db.Storage.prototype.fetch = function(q) {
  return this.default_tx_queue_.fetch(q);
};


/**
 * Retrieve a value from default key-value store.
 *
 * Note: This will not raise error to get non-existing object.
 * @export
 * @param {string} key The key to get.
 * @return {!goog.async.Deferred} return resulting object in deferred function.
 * If not found, {@code undefined} is return.
 */
ydn.db.Storage.prototype.getItem = function(key) {
  return this.default_tx_queue_.getItem(key);
};


/**
 * Store a value to default key-value store.
 * @export
 * @param {string} key The key to set.
 * @param {string} value The value to save.
 * @param {number=} opt_expiration The number of miliseconds since epoch
 *     (as in goog.now()) when the value is to expire. If the expiration
 *     time is not provided, the value will persist as long as possible.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Storage.prototype.setItem = function(key, value, opt_expiration) {
  return this.default_tx_queue_.setItem(key, value, opt_expiration);
};


/**
 * Explain query plan.
 * @param {!ydn.db.Iterator} q
 * @return {Object} plan in JSON
 */
ydn.db.Storage.prototype.explain = function(q) {
  return this.default_tx_queue_.explain(q);
};


/**
 * Remove an item to default key-value store.
 * @export
 * @param {string} id item id to be remove.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.Storage.prototype.removeItem = function(id) {
  return this.default_tx_queue_.removeItem(id);
};


/** @override */
ydn.db.Storage.prototype.toString = function() {
  var s = 'Storage:' + this.getName();
  if (goog.DEBUG && this.default_tx_queue_) {
    return s + ':' + this.default_tx_queue_.getTxNo();
  }
  return s;
};



/**
 * @param {!ydn.db.Iterator} q query.
 * @param {function(*): boolean} clear clear iteration function.
 * @param {function(*): *} update update iteration function.
 * @param {function(*): *} map map iteration function.
 * @param {function(*, *, number=): *} reduce reduce iteration function.
 * @param {*} initial initial value for reduce iteration function.
 * @return {!goog.async.Deferred} promise.
 */
ydn.db.Storage.prototype.iterate = function(q, clear, update, map, reduce,
                                            initial) {
  return this.default_tx_queue_.iterate(q, clear, update, map, reduce, initial);
};



/**
 * @param {!ydn.db.Iterator|!ydn.db.Sql} q query.
 * @return {!goog.async.Deferred} return result as list.
 */
ydn.db.Storage.prototype.execute = function(q) {
  return this.default_tx_queue_.execute(q);
};

/**
 * Cursor scan iteration.
 * @param {!Array.<!ydn.db.Iterator>} iterators the cursor.
 * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): !Array} solver
 * solver.
 * @param {!Array.<!ydn.db.Streamer>=} streamers streamers.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.Storage.prototype.scan = function(iterators, solver, streamers) {
  return this.default_tx_queue_.scan(iterators, solver, streamers);
};


/**
 *
 * @param {!ydn.db.Iterator} iterator
 * @param {function(*)} callback
 */
ydn.db.Storage.prototype.map = function(iterator, callback) {

};



/**
 *
 * @param {!ydn.db.Iterator} iterator
 * @param {function(*)} callback
 * @param {*=} initial
 */
ydn.db.Storage.prototype.reduce = function(iterator, callback, initial) {

};

