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
goog.require('ydn.db.tr.AtomicParallel');
goog.require('ydn.db.tr.AtomicSerial');
goog.require('ydn.db.tr.DbOperator');
goog.require('ydn.db.tr.IStorage');
goog.require('ydn.db.tr.IThread.Threads');
goog.require('ydn.db.tr.OverflowParallel');
goog.require('ydn.db.tr.OverflowSerial');
goog.require('ydn.db.tr.Parallel');
goog.require('ydn.db.tr.Serial');
goog.require('ydn.db.tr.Single');
goog.require('ydn.db.tr.StrictOverflowParallel');
goog.require('ydn.db.tr.StrictOverflowSerial');



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

  var is_serial = true;
  var req_type = ydn.db.tr.IThread.RequestType.SINGLE;
  if (opt_options) {
    is_serial = !!opt_options.isSerial;
    if (opt_options.requestType) {
      req_type = /** @type {ydn.db.tr.IThread.RequestType} */
          (opt_options.requestType);
    }
  }

  /**
   * @final
   */
  this.sync_thread = ydn.db.base.USE_HOOK ?
      this.newTxQueue(ydn.db.tr.IThread.RequestType.ATOMIC, false) : null;

  /**
   * @final
   */
  this.db_operator = this.branch(req_type, is_serial);
};
goog.inherits(ydn.db.tr.Storage, ydn.db.con.Storage);


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
 * @param {ydn.db.tr.IThread.RequestType} request_type thread policy.
 * @param {boolean=} opt_is_serial serial request.
 * @param {!Array.<string>=} opt_store_names store names for tx scope.
 * @param {ydn.db.base.StandardTransactionMode=} opt_mode tx mode.
 * @param {number=} opt_max_tx limit number of transaction.
 * @return {ydn.db.tr.DbOperator} db operator.
 * @final
 */
ydn.db.tr.Storage.prototype.branch = function(request_type, opt_is_serial,
    opt_store_names, opt_mode, opt_max_tx) {
  this.ptx_no++;
  var tx_thread = this.newTxQueue(request_type, opt_is_serial, opt_max_tx);
  return this.newOperator(tx_thread, this.sync_thread);
};


/**
 * @final
 * @return {number} transaction series number.
 */
ydn.db.tr.Storage.prototype.getTxNo = function() {
  return this.db_operator ? this.db_operator.getTxNo() : NaN;
};


/**
 * @param {!ydn.db.tr.IThread} tx_thread transaction thread.
 * @param {ydn.db.tr.IThread} sync_thread thread for synchronization.
 * @return {ydn.db.tr.DbOperator} the db operator.
 * @protected
 */
ydn.db.tr.Storage.prototype.newOperator = function(tx_thread, sync_thread) {
  return new ydn.db.tr.DbOperator(this, this.schema,
      tx_thread, sync_thread);
};


/**
 * Create a new thread queue.
 * @param {ydn.db.tr.IThread.RequestType} request_type thread policy.
 * @param {boolean=} opt_is_serial serial request.
 * @param {number=} opt_max_tx limit number of transaction.
 * @return {!ydn.db.tr.IThread} new transactional storage.
*/
ydn.db.tr.Storage.prototype.newTxQueue = function(request_type, opt_is_serial,
                                                  opt_max_tx) {
  if (opt_is_serial) {
    if (request_type == ydn.db.tr.IThread.RequestType.MULTI) {
      return new ydn.db.tr.OverflowSerial(this, this.ptx_no++);
    } else if (request_type == ydn.db.tr.IThread.RequestType.REPEAT) {
      return new ydn.db.tr.StrictOverflowSerial(this, this.ptx_no++);
    } else if (request_type == ydn.db.tr.IThread.RequestType.ATOMIC) {
      return new ydn.db.tr.AtomicSerial(this, this.ptx_no++);
    } else if (request_type == ydn.db.tr.IThread.RequestType.SINGLE) {
      return new ydn.db.tr.Serial(this, this.ptx_no++);
    } else {
      throw new ydn.debug.error.ArgumentException('Invalid requestType "' +
          request_type + '"');
    }
  } else {
    if (request_type == ydn.db.tr.IThread.RequestType.MULTI) {
      return new ydn.db.tr.OverflowParallel(this, this.ptx_no++);
    } else if (request_type == ydn.db.tr.IThread.RequestType.REPEAT) {
      return new ydn.db.tr.StrictOverflowParallel(this, this.ptx_no++);
    } else if (request_type == ydn.db.tr.IThread.RequestType.ATOMIC) {
      return new ydn.db.tr.AtomicParallel(this, this.ptx_no++);
    } else if (request_type == ydn.db.tr.IThread.RequestType.SINGLE) {
      return new ydn.db.tr.Parallel(this, this.ptx_no++, opt_max_tx);
    } else {
      throw new ydn.debug.error.ArgumentException('Invalid requestType "' +
          request_type + '"');
    }
  }
};


/**
 * Abort current request transaction.
 */
ydn.db.tr.Storage.prototype.abort = function() {
  this.db_operator.abort();
};


/**
 * @inheritDoc
 */
ydn.db.tr.Storage.prototype.run = function(trFn, store_names, opt_mode,
                                           oncompleted, opt_args) {

  var me = this;
  this.ptx_no++;
  var tx_thread = this.newTxQueue(ydn.db.tr.IThread.RequestType.SINGLE);
  var db_operator = this.newOperator(tx_thread, this.sync_thread);
  var mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;
  if (goog.DEBUG && [ydn.db.base.TransactionMode.READ_ONLY,
    ydn.db.base.TransactionMode.READ_WRITE].indexOf(mode) == -1) {
    throw new ydn.debug.error.ArgumentException('invalid mode');
  }

  if (!goog.isDefAndNotNull(store_names)) {
    store_names = this.schema.getStoreNames();
  }
  if (goog.DEBUG) {
    if (!goog.isArrayLike(store_names)) { // could be  DOMStringList or Array
      throw new ydn.debug.error.ArgumentException(
          'store names must be an array');
    } else if (store_names.length == 0) {
      throw new ydn.debug.error.ArgumentException(
          'number of store names must more than 0');
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

  this.logger.finest('scheduling run in transaction with ' +
      tx_thread);
  tx_thread.processTx(function(tx) {
    me.logger.finest('executing run in transaction');
    outFn(/** @type {!ydn.db.tr.IStorage} */ (db_operator));
    outFn = null;
  }, store_names, mode, oncompleted);

};


