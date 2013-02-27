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
 * @fileoverview Base database service provider.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.tr.Storage');
goog.require('ydn.db.con.Storage');
goog.require('ydn.db.tr.DbOperator');
goog.require('ydn.db.tr.IStorage');
goog.require('ydn.db.tr.AtomicSerial');
goog.require('ydn.db.tr.ParallelThread');
goog.require('ydn.db.tr.IThread.Threads');
goog.require('ydn.db.tr.Single');



/**
 * Create storage providing method to run in transaction.
 *
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.schema.Database|DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * schema used in chronical order.
 * @param {!StorageOptions=} opt_options options.
 * @implements {ydn.db.tr.IStorage}
 * @extends {ydn.db.con.Storage}
 * @constructor
 */
ydn.db.tr.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);

  this.ptx_no = 0;

  var th = ydn.db.tr.IThread.Threads.ATOMIC_SERIAL;
  if (opt_options && opt_options.thread) {
    var idx = ydn.db.tr.IThread.ThreadList.indexOf(opt_options.thread);
    if (idx == -1) {
      throw new ydn.error.ArgumentException('thread: ' + opt_options.thread);
    }
    th = ydn.db.tr.IThread.ThreadList[idx];
  }

  /**
   * @final
   */
  this.thread_name = th;

  /**
   * @final
   */
  this.sync_thread = ydn.db.base.SYNC ?
    this.newTxQueue(ydn.db.tr.IThread.Threads.ATOMIC_PARALLEL, 'sync') : null;

  /**
   * @final
   */
  this.db_operator = this.thread(this.thread_name, 'base');
};
goog.inherits(ydn.db.tr.Storage, ydn.db.con.Storage);


/**
 * @type {ydn.db.tr.IThread.Threads}
 * @protected
 */
ydn.db.tr.Storage.prototype.thread_name;


/**
 * @type {ydn.db.tr.IThread}
 * @protected
 */
ydn.db.tr.Storage.prototype.sync_thread;


/**
 * @type {*}
 * @protected
 */
ydn.db.tr.Storage.prototype.db_operator;

/**
 *
 * @type {number}
 * @protected
 */
ydn.db.tr.Storage.prototype.ptx_no = 0;


/**
 * Create a new db operator during initialization.
 * @param {ydn.db.tr.IThread.Threads} thread
 * @param {string=} name operator name.
 * @return {*}
 * @final
 */
ydn.db.tr.Storage.prototype.thread = function(thread, name) {
  var tx_thread = this.newTxQueue(thread, name);
  return this.newOperator(tx_thread, this.sync_thread);
};


/**
 * @final
 * @return {number} transaction series number.
 */
ydn.db.tr.Storage.prototype.getTxNo = function() {
  return this.db_operator.getTxNo();
};


/**
 *
 * @param {!ydn.db.tr.IThread} tx_thread
 * @param {ydn.db.tr.IThread} sync_thread
 * @return {ydn.db.tr.DbOperator}
 * @protected
 */
ydn.db.tr.Storage.prototype.newOperator = function(tx_thread, sync_thread) {
  return new ydn.db.tr.DbOperator(this, this.schema, tx_thread, sync_thread);
};



/**
* @param {ydn.db.tr.IThread.Threads=} thread
* @param {string=} scope_name scope name.
* @return {!ydn.db.tr.IThread} new transactional storage.
*/
ydn.db.tr.Storage.prototype.newTxQueue = function(thread, scope_name) {
  thread = thread || this.thread_name;
  if (thread == ydn.db.tr.IThread.Threads.ATOMIC_PARALLEL) {
    return new ydn.db.tr.ParallelThread(this, this.ptx_no++, scope_name);
  } else if (thread == ydn.db.tr.IThread.Threads.ATOMIC_SERIAL) {
    return new ydn.db.tr.AtomicSerial(this, this.ptx_no++, scope_name);
  } else if (thread == ydn.db.tr.IThread.Threads.SINGLE) {
    return new ydn.db.tr.Single(this, this.ptx_no++, scope_name);
  } else {
    throw new ydn.error.ArgumentException(thread);
  }
};



/**
 * @inheritDoc
 */
ydn.db.tr.Storage.prototype.run = function(trFn, store_names, opt_mode,
                                                    oncompleted, opt_args) {

  var me = this;
  var scope_name = trFn.name || '';
  var tx_thread = this.newTxQueue(ydn.db.tr.IThread.Threads.SINGLE, scope_name);
  var tx_queue = this.newOperator(tx_thread, this.sync_thread);
  var mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;
  if (goog.DEBUG && [ydn.db.base.TransactionMode.READ_ONLY,
      ydn.db.base.TransactionMode.READ_WRITE].indexOf(mode) == -1) {
    throw new ydn.debug.error.ArgumentException('invalid mode');
  }

  if (!goog.isDefAndNotNull(store_names)) {
    store_names = this.schema.getStoreNames();
  }
  if (goog.DEBUG) {
    if (!goog.isArray(store_names)) {
      throw new ydn.debug.error.ArgumentException('store names must be an array');
    } else if (store_names.length == 0) {
        throw new ydn.debug.error.ArgumentException('number of store names must more than 0');
    } else {
      for (var i = 0; i < store_names.length; i++) {
        if (!goog.isString(store_names[i])) {
          throw new ydn.debug.error.ArgumentException('store name at ' + i +
              ' must be string but found ' + typeof store_names[i]);
        }
      }
    }
  }

  var outFn = trFn;
  if (arguments.length > 4) { // handle optional parameters
    var args = Array.prototype.slice.call(arguments, 4);
    outFn = function() {
      var newArgs = Array.prototype.slice.call(arguments);
      newArgs = newArgs.concat(args); // post-apply
      return trFn.apply(this, newArgs);
    };
  }

  this.logger.finest('scheduling run in transaction ' + scope_name + ' with ' + tx_thread);
  tx_thread.exec( function(tx) {
    me.logger.finest('executing run in transaction ' + scope_name);
    outFn(/** @type {!ydn.db.tr.IStorage} */ (tx_queue));
    outFn = null;
  }, store_names, mode, scope_name, oncompleted);

};


