/**
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 */


goog.provide('ydn.db.tr.Parallel');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.error.NotSupportedException');


/**
 * Create transaction queue providing methods to run in non-overlapping
 * transactions.
 *
 * @implements {ydn.db.tr.IThread}
 * @param {!ydn.db.tr.Storage} storage base storage.
 * @param {number} ptx_no transaction queue number.
 * @param {string=} thread_name scope name.
 * @constructor
 */
ydn.db.tr.Parallel = function(storage, ptx_no, thread_name) {

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

  this.tx_no_ = 0;
  this.tx_ = null;
  this.scopes_ = null;
  this.mode_ = null;

  this.oncompleted_handlers = [];

  /**
   * @final
   */
  this.thread_name_ = thread_name || '';

};


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.Parallel.DEBUG = false;

/**
 * @private
 * @type {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage}
 */
ydn.db.tr.Parallel.prototype.tx_;

/**
 * @private
 * @type {Array.<string>}
 */
ydn.db.tr.Parallel.prototype.oncompleted_handlers;


/**
 * @private
 * @type {string}
 */
ydn.db.tr.Parallel.prototype.thread_name_;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.Parallel.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.tr.Parallel');




/**
* Add or update a store issuing a version change event.
* @protected
* @param {!StoreSchema|!ydn.db.schema.Store} store schema.
* @return {!goog.async.Deferred} promise.
*/
ydn.db.tr.Parallel.prototype.addStoreSchema = function(store) {
  return this.storage_.addStoreSchema(store);
};
//
//
///**
// * @inheritDoc
// */
//ydn.db.tr.Parallel.prototype.transaction = function(trFn, store_names,
//       opt_mode, completed_event_handler) {
//  this.storage_.transaction(trFn, store_names,
//      opt_mode, completed_event_handler);
//};


/**
 *
 * @return {string}  scope name.
 */
ydn.db.tr.Parallel.prototype.getThreadName = function() {
  return this.thread_name_;
};



/**
 *
 * @return {number} transaction count.
 */
ydn.db.tr.Parallel.prototype.getTxNo = function() {
  return this.tx_no_;
};


/**
 *
 * @return {number} transaction queue number.
 */
ydn.db.tr.Parallel.prototype.getQueueNo = function() {
  return this.q_no_;
};


/**
 *
 * @return {string|undefined}
 */
ydn.db.tr.Parallel.prototype.type = function() {
  return this.storage_.getType();
};


/**
 *
 * @return {!ydn.db.tr.Storage} storage.
 */
ydn.db.tr.Parallel.prototype.getStorage = function() {
  return this.storage_;
};


/**
 * @type {Array.<string>} list of sorted store names as transaction scope
 * @private
 */
ydn.db.tr.Parallel.prototype.scopes_;

/**
 * @type {ydn.db.base.TransactionMode?}
 * @private
 */
ydn.db.tr.Parallel.prototype.mode_;


/**
 * @type {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage}
 * @private
 */
ydn.db.tr.Parallel.prototype.tx_ = null;


/**
 *
 * @return {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} active transaction object.
 * @protected
 */
ydn.db.tr.Parallel.prototype.getTx = function() {
  return this.tx_;
};


/**
 *
 * @return {ydn.db.base.TransactionMode?}
 */
ydn.db.tr.Parallel.prototype.getMode = function() {
  return this.mode_;
};

/**
 *
 * @return {Array.<string>}
 */
ydn.db.tr.Parallel.prototype.getTxScope = function() {
  return this.scopes_;
};


/**
 *
 * @return {boolean} return true if thread has active transaction.
 */
ydn.db.tr.Parallel.prototype.isActive = function() {
  return !!this.tx_;
};


/**
 *
 * @param {!Array.<string>} scopes
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean}
 * @protected
 */
ydn.db.tr.Parallel.prototype.sameScope = function(scopes, mode) {
  if (!this.store_names || !this.mode_) {
    return false;
  }
  if (mode != this.mode_) {
    return false;
  }
  if (this.scopes_.length != scopes.length) {
    return false;
  }
  for (var i = 0; i < scopes.length; i++) {
    if (this.scopes_.indexOf(scopes[i]) == -1) {
      return false;
    }
  }
  return true;
};



/**
 *
 * @param {!Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean}
 * @protected
 */
ydn.db.tr.Parallel.prototype.subScope = function(store_names, mode) {
  if (!this.scopes_ || !this.mode_) {
    return false;
  }
  if (mode != this.mode_) {
    if (this.mode_ != ydn.db.base.TransactionMode.READ_WRITE ||
        mode != ydn.db.base.TransactionMode.READ_ONLY) {
      return false;
    }
  }
  if (store_names.length > this.scopes_.length) {
    return false;
  }
  for (var i = 0; i < store_names.length; i++) {
    if (this.scopes_.indexOf(store_names[i]) == -1) {
      return false;
    }
  }
  return true;
};



/**
 * Abort an active transaction.
 * @throws InvalidOperationException if transaction is not active.
 */
ydn.db.tr.Parallel.prototype.abort = function() {
  if (this.tx_) {
    this.tx_['abort']();
  } else {
    throw new ydn.debug.error.InvalidOperationException(
        this + ': no active transaction');
  }
};


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.core.req.IRequestExecutor} get executor.
 */
ydn.db.tr.Parallel.prototype.getExecutor = goog.abstractMethod;


/**
 * @param {!Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean} return true if given scope and mode is compatible with
 * active transaction and should be reuse.
 * @protected
 */
ydn.db.tr.Parallel.prototype.reusedTx = goog.abstractMethod;


ydn.db.tr.Parallel.prototype.pushTx = function(tx, store_names, mode,
                                               on_completed) {
  this.tx_ = tx;
  this.tx_no_++;
  this.scopes_ = goog.array.clone(store_names);
  this.mode_ = mode;
  return this.tx_no_;
};

ydn.db.tr.Parallel.prototype.purgeTx = function(tx_no) {
  if (tx_no == this.tx_no_) {
    this.tx_ = null;
    this.scopes_ = null;
    this.mode_ = null;
  }
};


/**
 * @inheritDoc
 */
ydn.db.tr.Parallel.prototype.processTx = function (callback, store_names,
    opt_mode, scope_name, on_completed) {

  var mode = goog.isDef(opt_mode) ?
      opt_mode : ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;
  var completed_handler = function(type, event) {
    if (ydn.db.tr.Parallel.DEBUG) {
      window.console.log(this + ': transaction ' + me.tx_no_ + ' committed');
    }
    if (goog.isFunction(on_completed)) {
      on_completed(type, event);
      on_completed = undefined;
    }
  };

  var transaction_process = function(tx) {
    me.tx_ = tx;
    me.tx_no_++;
    me.tx_locked_ = false;
    me.scopes_ = goog.array.clone(store_names);
    me.mode_ = mode;

    if (ydn.db.tr.Parallel.DEBUG) {
      window.console.log(me + ': transaction ' + me.tx_no_ + ' begin');
    }
    callback(tx);
    callback = null; // release circular reference.
  };

  var reused = this.isActive() && !this.tx_locked_ &&
      this.reusedTx(store_names, mode);
  if (ydn.db.tr.Parallel.DEBUG) {
    var tx = this.isActive() ? 'active ' : 'inactive ';
    tx += this.tx_locked_ ? 'locked transaction' : 'transaction';
    window.console.log(this +
        ' mode:' + this.mode_ + ' scopes:' + ydn.json.stringify(this.scopes_) +
        (reused ? ' reusing transaction' : ' opening transaction after ') +
        tx + ':' + this.tx_no_ + ' for ' +
        ' mode:' + mode + ' scopes:' +
        ydn.json.stringify(store_names) + ' in ' + scope_name);
  }

  if (reused) {
    if (goog.isFunction(on_completed)) {

    }
    callback(me.tx_);
    callback = null; // release circular reference.
  } else if (!!this.tx_) { // has active transaction, skip it.
    this.tx_locked_ = true;
    var tx_callback = function(tx) {
      me.tx_no_++;
      callback(tx);
    };
    this.storage_.transaction(tx_callback, store_names, mode,
        on_completed);
  } else {
    this.scopes_ = goog.array.clone(store_names);
    this.mode_ = mode;
    this.storage_.transaction(transaction_process, store_names, mode,
        completed_handler);
  }

};


/**
 * @inheritDoc
 */
ydn.db.tr.Parallel.prototype.exec = function (callback, store_names, mode,
                                                   scope_name, on_completed) {
  this.processTx(callback, store_names, mode, on_completed);
};


/** @override */
ydn.db.tr.Parallel.prototype.toString = function() {
  var s = 'ydn.db.tr.Parallel:' + this.storage_.getName();
  if (goog.DEBUG) {
    var scope = this.getThreadName();
    scope = scope ? ' [' + scope + ']' : '';
    return s + ':' + this.q_no_ + ':' + this.getTxNo() + scope;
  }
  return s;
};

