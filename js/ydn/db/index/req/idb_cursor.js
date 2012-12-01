/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.IDBCursor');
goog.require('ydn.db.index.req.ICursor');


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {!IDBObjectStore} obj_store object store.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec
 * @param {boolean} key_only mode.
 * @param {*=} ini_key primary key to resume position.
 * @param {*=} ini_index_key index key to resume position.
 * @implements {ydn.db.index.req.ICursor}
 * @constructor
 */
ydn.db.index.req.IDBCursor = function(obj_store, store_name, index_name, keyRange,
                                   direction, key_only, ini_key, ini_index_key) {

  goog.asserts.assert(obj_store);
  this.obj_store = obj_store;

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

  this.open_request(ini_key, ini_index_key);

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
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {*=} ini_key primary key to resume position.
 * @param {*=} ini_index_key index key to resume position.
 * @private
 */
ydn.db.index.req.IDBCursor.prototype.open_request = function(ini_key, ini_index_key) {


  var key_range = this.key_range;
  if (goog.isDefAndNotNull(ini_index_key)) {
    var cmp = ydn.db.con.IndexedDb.indexedDb.cmp(ini_index_key, this.key_range.upper);
    if (cmp == 1 || (cmp == 0 && !this.key_range.upperOpen)) {
      this.onNext(); // out of range;
      return;
    }
    key_range = ydn.db.IDBKeyRange.bound(ini_index_key,
      this.key_range.upper, false, this.key_range.upperOpen);
  }

  /**
   * @type {ydn.db.index.req.IDBCursor}
   */
  var me = this;
  var request;
  if (this.key_only) {
    if (this.index) {
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.index.openKeyCursor(key_range, this.dir);
      } else if (goog.isDefAndNotNull(key_range)) {
        request = this.index.openKeyCursor(key_range);
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
        request = this.obj_store.openCursor(key_range, this.dir);
      } else if (goog.isDefAndNotNull(key_range)) {
        request = this.obj_store.openCursor(key_range);
        // some browser have problem with null, even though spec said OK.
      } else {
        request = this.obj_store.openCursor();
      }

    }
  } else {
    if (this.index) {
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.index.openCursor(key_range, this.dir);
      } else if (goog.isDefAndNotNull(key_range)) {
        request = this.index.openCursor(key_range);
      } else {
        request = this.index.openCursor();
      }
    } else {
      if (goog.isDefAndNotNull(this.dir)) {
        request = this.obj_store.openCursor(key_range, this.dir);
      } else if (goog.isDefAndNotNull(key_range)) {
        request = this.obj_store.openCursor(key_range);
        // some browser have problem with null, even though spec said OK.
      } else {
        request = this.obj_store.openCursor();
      }
    }
  }

  me.logger.finest('Iterator: ' + this.label + ' opened.');

  request.onsuccess = function (event) {
    var cur = (event.target.result);
    //console.log(['onsuccess', cur ? cur.key : undefined, cur ? cur.primaryKey : undefined, ini_key, ini_index_key]);
    if (cur) {
      me.cur = cur;
      //var value = me.key_only ? cur.key : cur['value'];

      if (goog.isDefAndNotNull(ini_index_key)) {
        var index_cmp = ydn.db.con.IndexedDb.indexedDb.cmp(cur.key, ini_index_key);
        if (index_cmp != 0) {
          // not in the range.
          ini_key = null;
          ini_index_key = null;
          me.onNext(cur.key, cur.primaryKey, cur.value);
          return;
        }
      }
      ini_index_key = null;
      if (goog.isDefAndNotNull(ini_key)) {
        var primary_cmp = ydn.db.con.IndexedDb.indexedDb.cmp(cur.primaryKey, ini_key);
        if (primary_cmp == 0) {
          ini_key = null; // we got there.
          me.onNext(cur.key, cur.primaryKey, cur.value);
        } else if ((primary_cmp == 1 && !me.reverse) || (primary_cmp == -1 && me.reverse)) {
          // the key we are looking is not yet arrive.
          cur['continue']();
        } else {
          // the seeking primary key is not in the range.
          ini_key = null; // we got there.
          me.onNext(this.cur.key, cur.primaryKey, cur.value);
        }
      } else {
        me.onNext(cur.key, cur.primaryKey, cur.value);
      }

    } else {
      ini_key = null;
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
      console.log('continuing to ' + next_position)
      this.cur['continue'](next_position);
    } else {
      this.onNext(); // notify that cursor iteration is finished.
      this.logger.finest('Cursor: ' + this.label + ' resting.');
    }
  } else {
    throw new ydn.error.InvalidOperationError('Iterator:' + this.label + ' cursor gone.');
  }
};

//
///**
// *
// * @type {*}
// * @private
// */
//ydn.db.index.req.IDBCursor.prototype.seek_key_ = null;




/**
 * Continue to next primary key position.
 *
 *
 * This will continue to scan
 * until the key is over the given primary key. If next_primary_key is
 * lower than current position, this will rewind.
 * @param {*} next_primary_key
 * @param {*=} next_index_key
 */
ydn.db.index.req.IDBCursor.prototype.seek = function(next_primary_key, next_index_key) {

  if (this.cur) {
    var value = this.key_only ? this.cur.key : this.cur['value'];
    var index_cmp = goog.isDefAndNotNull(next_index_key) ?
        ydn.db.con.IndexedDb.indexedDb.cmp(this.cur.key, next_index_key) : null;
    var primary_cmp = ydn.db.con.IndexedDb.indexedDb.cmp(this.cur.primaryKey, next_primary_key);
    var index_on_track = (index_cmp == 1 && !this.reverse) || (index_cmp == -1 && this.reverse);
    var primary_on_track = (primary_cmp == 1 && !this.reverse) || (primary_cmp == -1 && this.reverse);

    if (goog.isDefAndNotNull(next_index_key)) {
      if (index_cmp === 0) {
        if (primary_cmp === 0) {
          throw new ydn.error.InternalError('cursor cannot seek to current position');
        } else if (primary_on_track) {
          this.cur['continue']();
        } else {
          // primary key not in the range
          // this will restart the thread.
          this.open_request(next_primary_key, next_index_key);
        }
      } else if (index_on_track) {
        // just to index key position and continue
        this.open_request(next_index_key, next_index_key);
      } else {
        // this will restart the thread.
        this.logger.finest('Iterator: ' + this.label + ' restarting for ' + next_primary_key);
        this.open_request(next_primary_key, next_index_key);
      }
    } else {
      if (primary_cmp === 0) {
        throw new ydn.error.InternalError('cursor cannot seek to current position');
      } else if (primary_on_track) {
        this.cur['continue']();
      } else {
        // primary key not in the range
        // this will restart the thread.
        this.open_request(next_primary_key);
      }
    }
  } else {
    throw new ydn.db.InternalError(this.label + ' cursor gone.');
  }
};

