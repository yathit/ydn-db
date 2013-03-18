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
 * @param {string=} scope_name scope name.
 * @constructor
 * @implements {ydn.db.tr.IThread}
 */
ydn.db.tr.Serial = function(storage, ptx_no, scope_name) {

  /**
   * @final
   * @type {!ydn.db.tr.Storage}
   * @private
   */
  this.storage_ = storage;


  /*
   * Transaction queue no.
   * @final
   * @type {number}
   */
  this.q_no_ = ptx_no;

  /**
   * @final
   * @type {!Array.<{fnc: Function, scope: string, store_names: Array.<string>,
   * mode: ydn.db.base.TransactionMode, oncompleted: Function}>}
   * @private
   */
  this.trQueue_ = [];

  this.completed_handlers = [];

  /**
   *
   * @type {!ydn.db.tr.Mutex}
   * @private
   * @final
   */
  this.mu_tx_ = new ydn.db.tr.Mutex(ptx_no);

  this.scope = scope_name || '';

};


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.Serial.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.Serial.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.tr.Serial');


//
///**
// * @inheritDoc
// */
//ydn.db.tr.Serial.prototype.transaction = function(trFn, store_names,
//       opt_mode, completed_event_handler) {
//  this.storage_.transaction(trFn, store_names,
//      opt_mode, completed_event_handler);
//};


/**
 *
 * @return {string}  scope name.
 */
ydn.db.tr.Serial.prototype.getThreadName = function() {
  return this.scope;
};


/**
 * One database can have only one transaction.
 * @private
 * @type {ydn.db.tr.Mutex} mutex.
 */
ydn.db.tr.Serial.prototype.mu_tx_ = null;


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
 *
 * @return {string|undefined}
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
    this.logger.finest('pop tx queue ' + task.fnc.name);
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
 * @param {function(ydn.db.base.TransactionEventTypes, *)=} on_completed
 * handler.
 * @protected
 */
ydn.db.tr.Serial.prototype.pushTxQueue = function(trFn, store_names,
                  opt_mode, on_completed) {
  this.logger.finest('Serial push tx queue ' + trFn.name);
  this.trQueue_.push({
    fnc: trFn,
    store_names: store_names,
    mode: opt_mode,
    oncompleted: on_completed
  });
//  var now = goog.now();
//  if (!isNaN(this.last_queue_checkin_)) {
//    if ((now - this.last_queue_checkin_) > ydn.db.con.Storage.timeOut) {
//      this.logger.warning('queue is not moving.');
//      // todo: actively push the queue if transaction object is available
//      // this will make robustness to the app.
//      // in normal situation, queue will automatically empty since
//      // pop queue will call whenever transaction is finished.
//    }
//  }
//  if (this.trQueue_.length > ydn.db.con.Storage.MAX_QUEUE) {
//    this.logger.warning('Maximum queue size exceed, dropping the first job.');
//    this.trQueue_.shift();
//  }

};


/**
 * Abort an active transaction.
 */
ydn.db.tr.Serial.prototype.abort = function() {
  if (this.mu_tx_.isActive()) {
    var tx = this.mu_tx_.getTx();
    tx['abort'](); // this will cause error on SQLTransaction and WebStorage.
    // the error is wanted because there is no way to abort a transaction in
    // WebSql. It is somehow recommanded workaround to abort a transaction.
  } else {
    throw new ydn.db.InvalidStateError('No active transaction');
  }
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
 * @param {function(ydn.db.base.TransactionEventTypes, *)=} oncompleted handler.
 */
ydn.db.tr.Serial.prototype.processTx = function(trFn, store_names, opt_mode,
                                              oncompleted) {

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
      (!this.getStorage().isReady() && this.completed_handlers.length > 0)) {
    this.pushTxQueue(trFn, store_names, mode, oncompleted);
  } else {
    //console.log(this + ' not active ' + scope_name);
    var transaction_process = function(tx) {
      //console.log('transaction_process ' + scope_name);
      me.mu_tx_.up(tx, store_names, mode, scope_name);
      me.logger.finest(me + ': transaction ' + me.mu_tx_.getTxCount() +
        ' created.');

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
      me.logger.finest(me + ': transaction ' + me.mu_tx_.getTxCount() +
        ' committed with ' + type);
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
        if (me.storage_.countTxQueue() == 0) {
          // we wait to finished all transactions in base queue,
          // so that we get all transaction in order.
          me.popTxQueue_();
        }
      }
    };

    this.completed_handlers = oncompleted ? [oncompleted] : [];

    if (ydn.db.tr.Serial.DEBUG) {
      window.console.log(this + ' opening transaction ' + mode + ' for ' +
        JSON.stringify(names) + ' in ' + scope_name);
    }
    this.storage_.transaction(transaction_process, names, mode,
      completed_handler);
  }

};



/**
 * @inheritDoc
 */
ydn.db.tr.Serial.prototype.exec = function (df, callback, store_names, mode,
                                                  scope, on_completed) {
  var me = this;
  var mu_tx = this.getMuTx();

  //console.log('creating new tx for ' + scope);

  var blocked_on_complete = function (type, e) {
    //console.log('tx ' + scope + ' completed');
    if (goog.isFunction(on_completed)) {
      on_completed(type, e);
      on_completed = undefined; // release circular reference.
    }
  };

  //
  // create a new transaction and close for invoke in non-transaction context
  var blocked_tx_callback = function (idb) {
    //console.log('tx running for ' + scope);
    me.not_ready_ = true;
    // transaction should be active now
    if (!mu_tx.isActive()) {
      throw new ydn.db.InternalError('Tx not active for scope: ' + scope);
    }
    if (!mu_tx.isAvailable()) {
      throw new ydn.db.InternalError('Tx not available for scope: ' +
          scope);
    }

    callback(df, mu_tx.getTx());
    callback = null; // release circular reference.
    mu_tx.lock(); // for blocking tx.
  };
  //var cbFn = goog.partial(tx_callback, callback);
  if (goog.DEBUG) {
    blocked_tx_callback.name = scope; // scope name
  }
  //window.console.log(mu_tx.getScope() +  ' active: ' + mu_tx.isActive() + '
  // locked: ' + mu_tx.isSetDone());
  me.processTx(blocked_tx_callback, store_names, mode, blocked_on_complete);

  // need to think about handling oncompleted and onerror callback of the
  // transaction. after executed all the requests, the transaction is not
  // completed. consider this case
  // db.put(data).addCallback(function(id) {
  //    // at this stage, transaction for put request is not grantee finished.
  //    db.get(id);
  //    // but practically, when next transaction is open,
  //    // the previous transaction should be finished anyways,
  //    // due to 'readwrite' lock.
  //    // so seems like OK. it is not necessary to listen oncompleted
  //    // callback.
  // });
  // also notice, there is transaction overlap problem in mutex class.

};



/**
 * @final
 * @return {string} database name.
 */
ydn.db.tr.Serial.prototype.getName = function() {
  return this.getStorage().getName();
};


/** @override */
ydn.db.tr.Serial.prototype.toString = function() {
  var s = 'ydn.db.tr.Serial:' + this.storage_.getName();
  if (goog.DEBUG) {
    var scope = this.mu_tx_.getThreadName();
    scope = scope ? ' [' + scope + ']' : '';
    return s + ':' + this.q_no_ + ':' + this.getTxNo() + scope;
  }
  return s;
};

