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
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 */


goog.provide('ydn.db.tr.Serial');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.error.NotSupportedException');



/**
 * Create transaction queue providing methods to run in non-overlapping
 * transactions.
 *
 * @param {!ydn.db.tr.Storage} storage base storage.
 * @param {number} ptx_no transaction queue number.
 * @constructor
 * @implements {ydn.db.tr.IThread}
 */
ydn.db.tr.Serial = function(storage, ptx_no) {

  /**
   * @final
   * @private
   */
  this.storage_ = storage;


  /*
   * Transaction queue no.
   * @final
   */
  this.q_no_ = ptx_no;

  this.r_no_ = 0;

  /**
   * @final
   * @private
   */
  this.trQueue_ = [];

  this.completed_handlers = null;

  this.request_tx_ = null;

  /**
   *
   * @type {!ydn.db.tr.Mutex}
   * @private
   * @final
   */
  this.mu_tx_ = new ydn.db.tr.Mutex(ptx_no);

};


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.Serial.DEBUG = false;


/**
 * @private
 * @type {number} request number.
 */
ydn.db.tr.Serial.prototype.r_no_;


/**
 * @private
 * @type {number} thread number.
 */
ydn.db.tr.Serial.prototype.q_no_;


/**
 * @type {!ydn.db.tr.Storage}
 * @private
 */
ydn.db.tr.Serial.prototype.storage_;


/**
 * One database can have only one transaction.
 * @private
 * @type {ydn.db.tr.Mutex} mutex.
 */
ydn.db.tr.Serial.prototype.mu_tx_ = null;


/**
 * @type {!Array.<{fnc: Function, scope: string, store_names: Array.<string>,
   * mode: ydn.db.base.TransactionMode, oncompleted: Function}>}
 * @private
 */
ydn.db.tr.Serial.prototype.trQueue_;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.Serial.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.tr.Serial');


/**
 * @protected
 * @return {ydn.db.tr.Mutex} mutex.
 */
ydn.db.tr.Serial.prototype.getMuTx = function() {
  return this.mu_tx_;
};


/**
 *
 * @return {number} transaction count.
 */
ydn.db.tr.Serial.prototype.getTxNo = function() {
  return this.mu_tx_.getTxCount();
};


/**
 *
 * @return {number} transaction queue number.
 */
ydn.db.tr.Serial.prototype.getQueueNo = function() {
  return this.q_no_;
};


/**
 * Obtain active consumable transaction object.
 * @return {ydn.db.tr.Mutex} transaction object if active and available.
 */
ydn.db.tr.Serial.prototype.getActiveTx = function() {
  return this.mu_tx_.isActiveAndAvailable() ? this.mu_tx_ : null;
};


/**
 *
 * @return {boolean} true if trnasaction is active and available.
 */
ydn.db.tr.Serial.prototype.isActive = function() {
  return this.mu_tx_.isActiveAndAvailable();
};


/**
 *
 * @return {!ydn.db.tr.Storage} storage.
 */
ydn.db.tr.Serial.prototype.getStorage = function() {
  return this.storage_;
};


/**
 * @export
 * @return {SQLTransaction|IDBTransaction|Object} active transaction object.
 */
ydn.db.tr.Serial.prototype.getTx = function() {
  return this.mu_tx_.isActiveAndAvailable() ? this.mu_tx_.getTx() : null;
};


/**
 * Transaction is explicitly set not to do next transaction.
 */
ydn.db.tr.Serial.prototype.lock = function() {
  this.mu_tx_.lock();
};


/**
 * Transaction object is sed when receiving a request before result df
 * callback and set null after that callback so that it can be aborted
 * in the callback.
 * In general, this tx may be different from running tx.
 * @type {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage}
 * @private
 */
ydn.db.tr.Serial.prototype.request_tx_ = null;


/**
 *
 * @return {string|undefined} mechanism type.
 */
ydn.db.tr.Serial.prototype.type = function() {
  return this.storage_.getType();
};


/**
 *
 * @type {number}
 * @private
 */
ydn.db.tr.Serial.prototype.last_queue_checkin_ = NaN;


/**
 * @const
 * @type {number} maximun number of transaction queue.
 */
ydn.db.tr.Serial.MAX_QUEUE = 1000;


/**
 * Run the first transaction task in the queue. DB must be ready to do the
 * transaction.
 * @private
 */
ydn.db.tr.Serial.prototype.popTxQueue_ = function() {

  var task = this.trQueue_.shift();
  if (task) {
    if (ydn.db.tr.Serial.DEBUG) {
      this.logger.finest('pop tx queue of ' + this.trQueue_.length + ' ' +
          task.fnc.name);
    }
    this.processTx(task.fnc, task.store_names, task.mode, task.oncompleted);
  }
  //this.last_queue_checkin_ = goog.now();
};


/**
 *
 * @return {Array}
 */
ydn.db.tr.Serial.prototype.peekScopes = function() {
  if (this.trQueue_.length > 0) {
    return this.trQueue_[0].store_names;
  } else {
    return null;
  }
};


/**
 *
 * @return {ydn.db.base.TransactionMode?}
 */
ydn.db.tr.Serial.prototype.peekMode = function() {
  if (this.trQueue_.length > 0) {
    return this.trQueue_[0].mode;
  } else {
    return null;
  }
};


/**
 * Check next transaction
 * @protected
 * @return {boolean}
 */
ydn.db.tr.Serial.prototype.isNextTxCompatible = function() {
  return false;
};


/**
 * Push a transaction job to the queue.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_on_completed
 * handler.
 * @protected
 */
ydn.db.tr.Serial.prototype.pushTxQueue = function(trFn, store_names,
    opt_mode, opt_on_completed) {
  this.logger.finest('Serial push tx queue ' + trFn.name);
  this.trQueue_.push({
    fnc: trFn,
    store_names: store_names,
    mode: opt_mode,
    oncompleted: opt_on_completed
  });

};


/**
 * Abort an active transaction.
 */
ydn.db.tr.Serial.prototype.abort = function() {
  this.logger.finer(this + ': aborting');
  ydn.db.tr.IThread.abort(this.request_tx_);
};


/**
 * @type {Array.<Function>}
 * @private
 */
ydn.db.tr.Serial.prototype.completed_handlers;


/**
 * Create a new isolated transaction. After creating a transaction, use
 * {@link #getTx} to received an active transaction. If transaction is not
 * active, it return null. In this case a new transaction must re-create.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_on_completed
 * handler.
 */
ydn.db.tr.Serial.prototype.processTx = function(trFn, store_names, opt_mode,
                                                opt_on_completed) {

  //console.log('tr starting ' + trFn.name);
  var scope_name = trFn.name || '';

  var names = goog.isString(store_names) ? [store_names] : store_names;
  if (goog.DEBUG) {
    if (!goog.isArrayLike(names)) { // could be  DOMStringList or Array
      throw new ydn.debug.error.ArgumentException(
          'store names must be an array');
    } else if (names.length == 0) {
      throw new ydn.debug.error.ArgumentException(
          'number of store names must more than 0');
    } else {
      for (var i = 0; i < names.length; i++) {
        if (!goog.isString(names[i])) {
          throw new ydn.debug.error.ArgumentException('store name at ' + i +
              ' must be string but found ' + names[i] +
              ' of type ' + typeof names[i]);
        }
      }
    }
  }

  var mode = goog.isDef(opt_mode) ?
      opt_mode : ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;

  if (this.mu_tx_.isActive() || // we are serial, one tx at a time
      // if db is not ready and we already send one tx request, we keep
      // our tx request in our queue
      (!this.getStorage().isReady() &&
      !goog.isNull(this.completed_handlers) > 0)) {
    this.pushTxQueue(trFn, store_names, mode, opt_on_completed);
  } else {
    //console.log(this + ' not active ' + scope_name);
    var label = this.getLabel();
    var transaction_process = function(tx) {
      //console.log('transaction_process ' + scope_name);
      me.mu_tx_.up(tx, store_names, mode);
      label = me.getLabel();
      me.logger.fine(label + ' BEGIN ' +
          ydn.json.stringify(store_names) + ' ' + mode);

      // now execute transaction process
      trFn(me);
      trFn = null;

      me.mu_tx_.out(); // flag transaction callback scope is over.
      // transaction is still active and use in followup request handlers

      while (me.isNextTxCompatible()) {
        var task = me.trQueue_.shift();
        if (task.oncompleted) {
          me.completed_handlers.push(task.oncompleted);
        }
        me.logger.finest('pop tx queue in continue ' + task.fnc.name);
        task.fnc();
      }
    };

    var completed_handler = function(type, event) {
      //console.log('transaction_process ' + scope_name + ' completed.');
      if (type == ydn.db.base.TxEventTypes.COMPLETE) {
        me.logger.fine(label + ' COMMITTED');
      } else {
        me.logger.fine(label + ' COMMITTED' + ' with ' + type);
      }
      /**
       * @preserve _try.
       */
      try {
        var fn;
        // console.log(me + ' ' + me.completed_handlers.length + ' found.');
        while (fn = me.completed_handlers.shift()) {
          fn(type, event);
        }
      } catch (e) {
        // swallow error. document it publicly.
        // this is necessary to continue transaction queue
        if (goog.DEBUG) {
          throw e;
        }
      } finally {
        me.mu_tx_.down(type, event);
        me.popTxQueue_();
      }
      me.r_no_ = 0;
    };

    this.completed_handlers = opt_on_completed ? [opt_on_completed] : [];

    if (ydn.db.tr.Serial.DEBUG) {
      window.console.log(this + ' opening transaction ' + mode + ' for ' +
          JSON.stringify(names) + ' in ' + scope_name);
    }
    this.storage_.transaction(transaction_process, names, mode,
        completed_handler);
  }

};


/**
 * @param {!Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean} return true if given scope and mode is compatible with
 * active transaction and should be reuse.
 * @protected
 */
ydn.db.tr.Serial.prototype.reusedTx = function(store_names, mode) {
  return false;
};


/**
 *
 * @return {string} return label.
 */
ydn.db.tr.Serial.prototype.getLabel = function() {
  return this.mu_tx_.getLabel();
};


/**
 * @inheritDoc
 */
ydn.db.tr.Serial.prototype.exec = function(df, callback,
    store_names, opt_mode, on_complete) {
  var mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;
  var me = this;
  var rq_label;

  if (me.mu_tx_.isActiveAndAvailable() && this.reusedTx(store_names, mode)) {
    //console.log(mu_tx.getScope() + ' continuing tx for ' + scope);
    // call within a transaction
    // continue to use existing transaction
    var tx = me.mu_tx_.getTx();
    /**
     *
     * @param {*} result result.
     * @param {boolean=} opt_is_error true if request has error.
     */
    var resultCallback = function(result, opt_is_error) {
      me.request_tx_ = tx; // so that we can abort it.
      if (opt_is_error) {
        me.logger.finer(rq_label + ' ERROR');
        df.errback(result);
      } else {
        me.logger.finer(rq_label + ' SUCCESS');
        df.callback(result);
      }
      me.request_tx_ = null;
      resultCallback = /** @type {function (*, boolean=)} */ (null);
    };
    me.r_no_++;
    rq_label = me.getLabel() + 'R' + me.r_no_;
    me.logger.finer(rq_label + ' BEGIN');
    callback(tx, rq_label, resultCallback);
    me.logger.finer(rq_label + ' END');
    callback = null;
  } else {
    //
    //
    /**
     * create a new transaction and close for invoke in non-transaction context
     * @param {Function} cb callback to process tx.
     */
    var tx_callback = function(cb) {
      //console.log('tx running for ' + scope);
      // me.not_ready_ = true;
      // transaction should be active now
      var tx = me.mu_tx_.getTx();
      var resultCallback2 = function(result, is_error) {
        me.request_tx_ = tx; // so that we can abort it.
        if (is_error) {
          me.logger.finer(rq_label + ' ERROR');
          df.errback(result);
        } else {
          me.logger.finer(rq_label + ' SUCCESS');
          df.callback(result);
        }
        me.request_tx_ = null;
        resultCallback2 =  /** @type {function (*, boolean=)} */ (null);
      };
      me.r_no_++;
      rq_label = me.getLabel() + 'R' + me.r_no_;
      me.logger.finer(rq_label + ' BEGIN');
      callback(tx, rq_label, resultCallback2);
      me.logger.finer(rq_label + ' END');
      callback = null; // we don't call again.
    };
    //var cbFn = goog.partial(tx_callback, callback);
    //window.console.log(mu_tx.getScope() +  ' active: ' + mu_tx.isActive() + '
    // locked: ' + mu_tx.isSetDone());
    me.processTx(tx_callback, store_names, mode, on_complete);
  }
};


/**
 * @final
 * @return {string} database name.
 */
ydn.db.tr.Serial.prototype.getName = function() {
  return this.getStorage().getName();
};


if (goog.DEBUG) {
/** @override */
ydn.db.tr.Serial.prototype.toString = function () {
  var s = !!this.request_tx_ ? '*' : '';
  return 'Serial' + ':' + this.getLabel() + s;
};
}

