/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.IDBCursor');
goog.require('ydn.db.index.req.ICursor');


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {IDBObjectStore} obj_store object store.
 * @param {string} store_name the store name to open.
 * @param {?string} index_name index
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec
 * @param {boolean} key_only mode.
 * @implements {ydn.db.index.req.ICursor}
 * @constructor
 */
ydn.db.index.req.IDBCursor = function(obj_store, store_name, index_name, keyRange,
                                   direction, key_only) {

 
  this.label = store_name + ':' + index_name;

  /**
   *
   * @type {?IDBIndex}
   */
  this.index = null;
  if (goog.isDefAndNotNull(index_name)) {
    if (obj_store.indexNames.contains(index_name)) {
      this.index = obj_store.index(index_name);
    } else if (obj_store.keyPath != index_name ) {
      throw new ydn.db.InternalError('index "' + index_name + '" not found in ' +
          obj_store.name);
    }
  }

  this.cur = null;
  
  this.key_range = keyRange;

  this.reverse = direction == ydn.db.base.Direction.PREV ||
    direction == ydn.db.base.Direction.PREV_UNIQUE;

  this.dir = /** @type {number} */ (direction); // new standard is string.

  this.key_only = key_only;

  this.seek_key_ = null;

  this.open_request();

};

/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.index.req.IDBCursor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.index.req.IDBCursor');


/**
 * @private
 * @type {string}
 */
ydn.db.index.req.IDBCursor.prototype.label = '';



/**
 * @private
 * @type {IDBObjectStore}
 */
ydn.db.index.req.IDBCursor.prototype.obj_store = null;


/**
 * @private
 * @type {IDBIndex}
 */
ydn.db.index.req.IDBCursor.prototype.index = null;


/**
 * @private
 * @type {IDBKeyRange}
 */
ydn.db.index.req.IDBCursor.prototype.key_range = null;


/**
 * @private
 * @type {boolean}
 */
ydn.db.index.req.IDBCursor.prototype.reverse = false;


/**
 * @private
 * @type {IDBCursor|IDBCursorWithValue}
 */
ydn.db.index.req.IDBCursor.prototype.cur = null;


/**
 * @private
 * @type {boolean}
 */
ydn.db.index.req.IDBCursor.prototype.key_only = true;


/**
 * 
 * @type {Function}
 */
ydn.db.index.req.IDBCursor.prototype.onError = null;

/**
 *
 * @type {Function}
 */
ydn.db.index.req.IDBCursor.prototype.onNext = null;


/**
 * Make cursor opening request.
 * @private
 */
ydn.db.index.req.IDBCursor.prototype.open_request = function() {
  var me = this;
  var request;
  if (this.key_only) {
    if (this.index) {
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.index.openKeyCursor(this.key_range, this.dir);
      } else if (goog.isDefAndNotNull(this.key_range)) {
        request = this.index.openKeyCursor(this.key_range);
      } else {
        request = this.index.openKeyCursor();
      }
    } else {
      //throw new ydn.error.InvalidOperationException(
      //    'object store cannot open for key cursor');
      // IDB v1 spec do not have openKeyCursor, hopefully next version does
      // http://lists.w3.org/Archives/Public/public-webapps/2012OctDec/0466.html
      // however, lazy serailization used at least in FF.
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.obj_store.openCursor(this.key_range, this.dir);
      } else if (goog.isDefAndNotNull(this.key_range)) {
        request = this.obj_store.openCursor(this.key_range);
        // some browser have problem with null, even though spec said OK.
      } else {
        request = this.obj_store.openCursor();
      }

    }
  } else {
    if (this.index) {
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.index.openCursor(this.key_range, this.dir);
      } else if (goog.isDefAndNotNull(this.key_range)) {
        request = this.index.openCursor(this.key_range);
      } else {
        request = this.index.openCursor();
      }
    } else {
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.obj_store.openCursor(this.key_range, this.dir);
      } else if (goog.isDefAndNotNull(this.key_range)) {
        request = this.obj_store.openCursor(this.key_range);
        // some browser have problem with null, even though spec said OK.
      } else {
        request = this.obj_store.openCursor();
      }
    }
  }

  me.logger.finest('Iterator: ' + this.label + ' opened.');

  request.onsuccess = function (event) {
    var cur = (event.target.result);
    //console.log(['onsuccess', cur]);
    if (cur) {
      me.cur = cur;
      var value = me.key_only ? this.cur.key : this.cur['value'];

      if (this.seek_key_) {
        var cmp = ydn.db.con.IndexedDb.indexedDb['cmp'](this.cur.primaryKey, this.seek_key_);
        if (cmp == 0) {
          this.seek_key_ = null; // we got there.
          this.onNext(this.cur.primaryKey, value);
        } else if ((cmp == 1 && !this.reverse) || (cmp == -1 && this.reverse)) {
          this.cur['continue']();
        } else {
          // the seeking primary key is not in the range.
          this.seek_key_ = null; // we got there.
          this.onNext(this.cur.primaryKey, value);
        }
      } else {
        me.onNext(cur.primaryKey, value);
      }

    } else {
      me.seek_key_ = null;
      me.cur = null;
      me.logger.finest('Iterator: ' + me.label + ' completed.');
      me.onNext(); // notify that cursor iteration is finished.
    }

  };

  request.onError = function (event) {
    me.onError(event);
  };

};


/**
 * Continue to next position.
 * @param {*} next_position next index key.
 */
ydn.db.index.req.IDBCursor.prototype.forward = function (next_position) {
  //console.log(['next_position', cur, next_position]);

  if (next_position === false) {
    // restart the iterator
    this.logger.finest('Iterator: ' + this.label + ' restarting.');

    this.open_request();
  } else if (this.cur) {
    if (next_position === true) {
      this.cur['continue']();
    } else if (goog.isDefAndNotNull(next_position)) {
      this.cur['continue'](next_position);
    } else {
      this.logger.finest('Cursor: ' + this.label + ' resting.');
    }
  } else {
    throw new ydn.db.InternalError(this.label + ' cursor gone.');
  }
};


/**
 *
 * @type {*}
 * @private
 */
ydn.db.index.req.IDBCursor.prototype.seek_key_ = null;


/**
 * Continue to next primary key position. This will continue to scan
 * until the key is over the given primary key. If next_primary_key is
 * lower than current position, this will rewind.
 * @param next_primary_key
 */
ydn.db.index.req.IDBCursor.prototype.seek = function(next_primary_key) {

  if (this.cur) {
    var cmp = ydn.db.con.IndexedDb.indexedDb['cmp'](this.cur.primaryKey, next_primary_key);
    if (cmp == 0) {
      var value = this.key_only ? this.cur.key : this.cur['value'];
      this.onNext(this.cur.primaryKey, value);
    } else if ((cmp == 1 && !this.reverse) || (cmp == -1 && this.reverse)) {
      this.seek_key_ = next_primary_key;
      this.cur['continue']();
    } else {
      this.logger.finest('Iterator: ' + this.label + ' restarting for ' + next_primary_key);
      this.seek_key_ = next_primary_key;
      this.open_request();
    }
  } else {
    throw new ydn.db.InternalError(this.label + ' cursor gone.');
  }
};

