/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.Cursor');


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index
 * @param {string|undefined} keyPath
 * @param {IDBKeyRange} keyRange
 * @param {string} direction we are using old spec
 * @param {boolean} key_only mode.
 * @constructor
 */
ydn.db.index.req.Cursor = function(store_name, index_name, keyPath, keyRange,
                                   direction, key_only) {

 
  this.label = store_name + ':' + index_name;

  this.obj_store = this.getTx().objectStore(store_name);

  this.index = goog.isDefAndNotNull(index_name) && index_name != keyPath ? 
    this.obj_store.index(index_name) : null;

  this.cur = null;


  this.reverse = direction == ydn.db.base.Direction.PREV ||
    direction == ydn.db.base.Direction.PREV_UNIQUE;

  this.dir = /** @type {number} */ (direction); // new standard is string.


  this.key_only = key_only;

  this.seek_key_ = null;

  this.open_request();

};


/**
 * @private
 * @type {string}
 */
ydn.db.index.req.Cursor.prototype.label = '';



/**
 * @private
 * @type {IDBObjectStore}
 */
ydn.db.index.req.Cursor.prototype.obj_store = null;


/**
 * @private
 * @type {IDBIndex}
 */
ydn.db.index.req.Cursor.prototype.index = null;


/**
 * @private
 * @type {boolean}
 */
ydn.db.index.req.Cursor.prototype.reverse = false;


/**
 * @private
 * @type {IDBCursor|IDBCursorWithValue}
 */
ydn.db.index.req.Cursor.prototype.cur = null;


/**
 * @private
 * @type {boolean}
 */
ydn.db.index.req.Cursor.prototype.key_only = true;


/**
 * 
 * @type {Function}
 */
ydn.db.index.req.Cursor.prototype.onError = null;

/**
 *
 * @type {Function}
 */
ydn.db.index.req.Cursor.prototype.onNext = null;


/**
 * Make cursor opening request.
 * @private
 */
ydn.db.index.req.Cursor.prototype.open_request = function() {
  var me = this;
  var request;
  if (this.key_only) {
    if (this.index) {
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.index.openKeyCursor(this.keyRange, this.dir);
      } else if (goog.isDefAndNotNull(this.keyRange)) {
        request = this.index.openKeyCursor(this.keyRange);
      } else {
        request = this.index.openKeyCursor();
      }
    } else {
      //throw new ydn.error.InvalidOperationException(
      //    'object store cannot open for key cursor');
      // IDB v1 spec do not have openKeyCursor, hopefully next version does
      // http://lists.w3.org/Archives/Public/public-webapps/2012OctDec/0466.html
      // however, lazy serailization used at least in FF.
      if (goog.isDefAndNotNull(dir)) {
        request = this.obj_store.openCursor(this.keyRange, this.dir);
      } else if (goog.isDefAndNotNull(this.keyRange)) {
        request = this.obj_store.openCursor(this.keyRange);
        // some browser have problem with null, even though spec said OK.
      } else {
        request = this.obj_store.openCursor();
      }

    }
  } else {
    if (this.index) {
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.index.openCursor(keyRange, this.dir);
      } else if (goog.isDefAndNotNull(this.keyRange)) {
        request = this.index.openCursor(this.keyRange);
      } else {
        request = this.index.openCursor();
      }
    } else {
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.obj_store.openCursor(this.keyRange, this.dir);
      } else if (goog.isDefAndNotNull(this.keyRange)) {
        request = this.obj_store.openCursor(this.keyRange);
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
          this.seek_key_ = next_primary_key;
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
ydn.db.index.req.Cursor.prototype.forward = function (next_position) {
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
ydn.db.index.req.Cursor.prototype.seek_key_ = null;


/**
 * Continue to next primary key position. This will continue to scan
 * until the key is over the given primary key. If next_primary_key is
 * lower than current position, this will rewind.
 * @param next_primary_key
 */
ydn.db.index.req.Cursor.prototype.seek = function(next_primary_key) {

  if (this.cur) {
    var cmp = ydn.db.con.IndexedDb.indexedDb['cmp'](this.cur.primaryKey, next_primary_key);
    if (cmp == 0) {
      var value = me.key_only ? this.cur.key : this.cur['value'];
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

