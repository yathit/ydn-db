/**
 * @fileoverview Cursor stream accept pirmary key and pop reference value to a sink.
 *
 * User: kyawtun
 * Date: 11/11/12
 */

goog.provide('ydn.db.con.IdbCursorStream');
goog.require('goog.debug.Logger');
goog.require('ydn.db.con.ICursorStream');
goog.require('ydn.db.con.IStorage');


/**
 *
 * @param {!ydn.db.con.IStorage|!IDBTransaction} db
 * @param {string} store_name store name.
 * @param {string|undefined} index_name index name.
 * @param {boolean} key_only key only.
 * @param {Function} sink to receive value.
 * @constructor
 * @implements {ydn.db.con.ICursorStream}
 */
ydn.db.con.IdbCursorStream = function(db, store_name, index_name, key_only, sink) {
  if ('transaction' in db) {
    this.db_ = /** @type {ydn.db.con.IStorage} */ (db);
    this.idb_ = null;
    this.tx_ = null;
  } else if ('objectStore' in db) { //  IDBTransaction
    var tx = /** @type {IDBTransaction} */ (db);
    this.db_ = null;
    this.idb_ = tx.db;
    this.tx_ = tx;
    if (goog.DEBUG && !this.tx_.db.objectStoreNames.contains(store_name)) {
      throw new ydn.error.ArgumentException('store "' + store_name +
          '" not in transaction.');
    }
  } else {
    throw new ydn.error.ArgumentException();
  }

  this.store_name_ = store_name;
  this.index_name_ = index_name;
  this.sink_ = sink;
  this.key_only_ = key_only;
  this.cursor_ = null;
  this.stack_ = [];
  this.running_ = 0;
  this.on_tx_request_ = false;
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.IdbCursorStream.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.con.IdbCursorStream');


/**
 * @type {ydn.db.con.IStorage}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.db_;


/**
 * @type {IDBTransaction}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.tx_;


/**
 * @type {IDBDatabase}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.idb_;


/**
 *
 * @type {boolean}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.on_tx_request_ = false;


/**
 * @type {string}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.store_name_;


/**
 * @type {string|undefined}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.index_name_;


/**
 *
 * @type {!Array}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.stack_ = [];


/**
 * @type {Function}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.sink_;


/**
 * Read cursor.
 * @param {!IDBRequest} req
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.processRequest_ = function(req) {

  // here very careful with circular dependency.
  // req object is own by transaction which in turn own by the browser (global)
  // we don't want to keep reference to req.
  // we keep reference to cursor instead.
  // even if we don't keep the req, this req.onsuccess and req.onerror callbacks
  // are still active when cursor invoke advance method.

  this.running_ ++;
  var me = this;
  req.onsuccess = function(ev) {
    var cursor = ev.target.result;
    if (cursor) {
      if (goog.isFunction(me.sink_)) {
        if (me.key_only_) {
          me.sink_(cursor.primaryKey, cursor.key);
        } else {
          me.sink_(cursor.primaryKey, cursor['value']);
        }
      } else {
        me.logger.warning('sink gone, dropping value for: ' +
            cursor.primaryKey);
      }
      if (cursor && me.stack_.length > 0) {
        cursor['continue'](me.stack_.shift());
      } else {
        me.running_ --;
        me.clearStack_();
      }
    }
  };
  req.onerror = function(ev) {
    var msg = 'error' in req ?
        req['error'].name + ':' + req['error'].message : '';
    me.logger.warning('seeking fail. ' + msg);
    me.running_ --;
    me.clearStack_();
  };
};


/**
 * Collect result.
 * @param {Function} callback
 */
ydn.db.con.IdbCursorStream.prototype.onFinish = function(callback) {
  if (this.stack_.length == 0 && this.running_ == 0) {
    callback(); // we have nothing.
  } else {
    this.collector_ = callback;
  }
};


/**
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.createRequest_ = function() {

  if (this.on_tx_request_) {
    return; // else: we should not request more than on transaction request
  }


  var me = this;
  var on_completed = function(type, ev) {
    me.tx_ = null;
    if (type !== ydn.db.base.TransactionEventTypes.COMPLETE) {
      me.logger.warning(ev.name + ':' + ev.message);
    }
    me.logger.finest(me + ' transaction ' + type);
  };

  /**
   *
   * @param {IDBTransaction} tx active tx.
   */
  var doRequest = function(tx) {
    var key = me.stack_.shift();
    me.logger.finest(me + ' transaction started for ' + key);
    var store = tx.objectStore(me.store_name_);
    var indexNames = /** @type {DOMStringList} */ (store['indexNames']);
    if (goog.isDef(me.index_name_) &&
        indexNames.contains(me.index_name_)) {
      var index = store.index(me.index_name_);
      if (me.key_only_) {
        me.processRequest_(index.openKeyCursor(key));
      } else {
        me.processRequest_(index.openCursor(key));
      }
    } else if (!goog.isDef(me.index_name_) || me.index_name_ == store.keyPath) {
      // as of v1, ObjectStore do not have openKeyCursor method.
      // filed bug on:
      // http://lists.w3.org/Archives/Public/public-webapps/2012OctDec/0466.html
      me.processRequest_(store.openCursor(key));
    } else {
      throw new ydn.db.InvalidStateError();
    }
  };

  if (this.tx_) {
    me.logger.finest(me + ' using existing tx.');
    doRequest(this.tx_);
  } else if (this.idb_) {
    me.logger.finest(me + ' creating tx from IDBDatabase.');
    this.tx = this.idb_.transaction([this.store_name_],
        ydn.db.base.TransactionMode.READ_ONLY);
    this.tx.oncomplete = function(event) {
      on_completed(ydn.db.base.TransactionEventTypes.COMPLETE, event);
    };

    this.tx.onerror = function(event) {
      on_completed(ydn.db.base.TransactionEventTypes.ERROR, event);
    };

    this.tx.onabort = function(event) {
      on_completed(ydn.db.base.TransactionEventTypes.ABORT, event);
    };
  } else if (this.db_) {
    me.logger.finest(me + ' creating tx from ydn.db.con.IStorage.');
    this.on_tx_request_ = true;
    this.db_.transaction(function(/** @type {IDBTransaction} */ tx) {
      me.on_tx_request_ = false;
      doRequest(tx);
    }, [me.store_name_], ydn.db.base.TransactionMode.READ_ONLY, on_completed);
  } else {
    throw new ydn.error.InternalError(
        'no way to create a transaction provided.');
  }

};


ydn.db.con.IdbCursorStream.prototype.clearStack_ = function() {
  if (this.cursor_ && this.stack_.length > 0) {
    // we retain only valid request with active cursor.
    this.cursor_['continue'](this.stack_.shift());
  } else {
    if (this.running_ == 0) {
      if (this.collector_) {
        this.collector_();
      }
    }
  }
};


/**
 * Request to seek to a key.
 * @param key
 */
ydn.db.con.IdbCursorStream.prototype.seek = function (key) {
  this.stack_.push(key);

  this.createRequest_();

};

