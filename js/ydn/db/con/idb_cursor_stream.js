/**
 * @fileoverview Cursor stream accept key and pop to a sink.
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
 * @param {!ydn.db.con.IStorage} db
 * @param {string} store_name store name.
 * @param {string|undefined} index_name index name.
 * @param {boolean} key_only key only.
 * @param {Function} sink to receive value.
 * @constructor
 * @implements {ydn.db.con.ICursorStream}
 */
ydn.db.con.IdbCursorStream = function(db, store_name, index_name, key_only, sink) {
  this.db_ = db;
  this.store_name_ = store_name;
  this.index_name_ = index_name;
  this.sink_ = sink;
  this.key_only_ = key_only;
  this.cursor_ = null;
  this.stack_ = [];
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.IdbCursorStream.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.con.IdbCursorStream');


/**
 * @type {!ydn.db.con.IStorage}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.db_;

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
 * @private
 * @type {IDBCursor}
 */
ydn.db.con.IdbCursorStream.prototype.cursor_ = null;


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

  var me = this;
  req.onsuccess = function(ev) {
    var cursor = ev.target.result;
    if (cursor) {
      me.cursor_ = cursor;
      if (goog.isFunction(me.sink_)) {
        if (goog.isDef(me.key_only_)) {
          me.sink_(cursor.primaryKey, cursor.key);
        } else {
          me.sink_(cursor.primaryKey, cursor['value']);
        }
      } else {
        me.logger.warning('sink gone, dropping value for: ' +
            cursor.primaryKey);
      }
      me.clearStack_();
    } else {
      me.cursor_ = null;
    }
  };
  req.onerror = function(ev) {
    var msg = 'error' in req ?
        req['error'].name + ':' + req['error'].message : '';
    me.logger.warning('seeking fail. ' + msg);
  };
};


/**
 * Collect result.
 * @param {Function} callback
 */
ydn.db.con.IdbCursorStream.prototype.onFinish = function(callback) {
  if (this.stack_.length == 0 && !this.cursor_) {
    callback(); // we have nothing.
  } else {
    this.collector_ = callback;
  }
};


/**
 * @private
 * @param key
 */
ydn.db.con.IdbCursorStream.prototype.createRequest_ = function(key) {
  var me = this;
  var on_completed = function(type, ev) {
    me.cursor_ = null;
    if (type !== ydn.db.base.TransactionEventTypes.COMPLETE) {
      me.logger.warning(ev.name + ':' + ev.message);
    }
    me.logger.finest('transaction ' + type);
  };
  this.on_tx_request_ = true;
  this.db_.transaction(function(tx) {
    me.on_tx_request_ = false;
    var store = tx.objectStore(me.store_name_);
    if (goog.isString(me.index_name_)) {
      var index = store.index(me.index_name_);
      if (me.key_only_) {
        me.processRequest_(index.openKeyCursor(key));
      } else {
        me.processRequest_(index.openCursor(key));
      }
    } else {
      // as of v1, ObjectStore do not have openKeyCursor method.
      // filed bug on:
      // http://lists.w3.org/Archives/Public/public-webapps/2012OctDec/0466.html
      me.processRequest_(store.openCursor(key));
    }
  }, [this.store_name_], ydn.db.base.TransactionMode.READ_ONLY, on_completed);
};


ydn.db.con.IdbCursorStream.prototype.clearStack_ = function() {
  if (this.cursor_ && this.stack_.length > 0) {
    // we retain only valid request with active cursor.
    this.cursor_['continue'](this.stack_.shift());
    this.cursor_ = null;
  } else {
    if (this.collector_) {
      this.collector_();
      this.collector_ = null;
    }
  }
};


/**
 * Request to seek to a key.
 * @param key
 */
ydn.db.con.IdbCursorStream.prototype.seek = function(key) {
  this.stack_.push(key);
  if (this.cursor_) {
    this.clearStack_();
  } else {
    if (!this.on_tx_request_) {
      this.createRequest_(this.stack_.shift());
    } // else: we should not request more than on transaction request
    // we just push in stack. stack will empty when request is started.
  }
};

