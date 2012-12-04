/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.IDBCursor');
goog.require('ydn.db.index.req.AbstractCursor');


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
 * @extends {ydn.db.index.req.AbstractCursor}
 * @constructor
 */
ydn.db.index.req.IDBCursor = function(obj_store, store_name, index_name, keyRange,
                                   direction, key_only, ini_key, ini_index_key) {
  goog.base(this, store_name, index_name, keyRange, direction, key_only);

  goog.asserts.assert(obj_store);
  this.obj_store = obj_store;

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

  this.open_request(ini_key, ini_index_key);

};
goog.inherits(ydn.db.index.req.IDBCursor, ydn.db.index.req.AbstractCursor);


/**
 * @define {boolean}
 */
ydn.db.index.req.IDBCursor.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.index.req.IDBCursor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.index.req.IDBCursor');


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
 * @type {IDBCursor|IDBCursorWithValue}
 */
ydn.db.index.req.IDBCursor.prototype.cur = null;


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {*=} ini_key primary key to resume position.
 * @param {*=} ini_index_key index key to resume position.
 * @param {boolean=} inclusive
 * @private
 */
ydn.db.index.req.IDBCursor.prototype.open_request = function(ini_key, ini_index_key, inclusive) {

  var key_range = this.key_range;
  if (goog.isDefAndNotNull(ini_index_key)) {
    if (goog.isDefAndNotNull(this.key_range)) {
    var cmp = ydn.db.con.IndexedDb.indexedDb.cmp(ini_index_key, this.key_range.upper);
    if (cmp == 1 || (cmp == 0 && !this.key_range.upperOpen)) {
      this.onNext(undefined, undefined, undefined); // out of range;
      return;
    }
    key_range = ydn.db.IDBKeyRange.bound(ini_index_key,
      this.key_range.upper, false, this.key_range.upperOpen);
    } else {
      key_range = ydn.db.IDBKeyRange.lowerBound(ini_index_key);
    }
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
  this.has_pending_request = true;

  me.logger.finest('Iterator: ' + this.label + ' opened.');

//  var doNext = function (cur) {
//    var adv;
//    if (cur) {
//      adv = me.onSuccess(cur.primaryKey, cur.key, cur.value);
//    } else {
//      adv = me.onSuccess(undefined, undefined, undefined);
//    }
//    if (adv === true) {
//      cur['continue']();
//    } else if (adv === false) {
//      this.open_request(); // restart
//    } else if (!goog.isDef(adv)) {
//      if (cur) {
//        me.onNext(cur.primaryKey, cur.key, cur.value);
//      } else {
//        me.onNext(undefined, undefined, undefined);
//      }
//    } else if (!goog.isNull(adv)) {
//      me.seek(adv);
//    } // adv === null don't do anything.
//  };

  request.onsuccess = function (event) {
    me.has_pending_request = false;
    var cur = (event.target.result);
    me.cur = cur;
    //console.log(['onsuccess', cur ? cur.key : undefined, cur ? cur.primaryKey : undefined, ini_key, ini_index_key]);
    if (cur) {

      //var value = me.key_only ? cur.key : cur['value'];

      if (goog.isDefAndNotNull(ini_index_key)) {
        var index_cmp = ydn.db.con.IndexedDb.indexedDb.cmp(cur.key, ini_index_key);
        if (index_cmp != 0) {
          // not in the range.
          ini_key = null;
          ini_index_key = null;
          //me.onNext(cur.primaryKey, cur.key, cur.value);
          me.onSuccess(cur.primaryKey, cur.key, cur.value);
          return;
        }
      }
      ini_index_key = null;
      if (goog.isDefAndNotNull(ini_key)) {
        var primary_cmp = ydn.db.con.IndexedDb.indexedDb.cmp(ini_key, cur.primaryKey);
        if (primary_cmp == 0) {
          ini_key = null; // we got there.
          // me.onNext(cur.primaryKey, cur.key, cur.value);
          if (inclusive) {
            me.onSuccess(cur.primaryKey, cur.key, cur.value);
          } else {
            cur['continue'](); // resume point is exclusive
          }
        } else if ((primary_cmp == 1 && !me.reverse) || (primary_cmp == -1 && me.reverse)) {
          // the key we are looking is not yet arrive.
          cur['continue']();
        } else {
          // the seeking primary key is not in the range.
          ini_key = null; // we got there.
          //me.onNext(this.cur.key, cur.primaryKey, cur.value);
          me.onSuccess(cur.primaryKey, cur.key, cur.value);
        }
      } else {
        //me.onNext(cur.primaryKey, cur.key, cur.value);
        me.onSuccess(cur.primaryKey, cur.key, cur.value);
      }

    } else {
      //me.onSuccess(undefined, undefined, undefined);
      ini_index_key = null;
      ini_key = null;
      me.logger.finest('Iterator: ' + me.label + ' completed.');
      // notify that cursor iteration is finished.
      //me.onNext(undefined, undefined, undefined);
      me.onSuccess(undefined, undefined, undefined);
    }

  };

  request.onError = function (event) {
    me.onError(event);
  };

};


/**
 * Continue to next position.
 * @param {*} next_position next index key.
 * @override
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
      //console.log('continuing to ' + next_position)
      this.cur['continue'](next_position);
    } else {
      // notify that cursor iteration is finished.
      this.onNext(undefined, undefined, undefined);
      this.logger.finest('Cursor: ' + this.label + ' resting.');
    }
  } else {
    throw new ydn.error.InvalidOperationError('Iterator:' + this.label + ' cursor gone.');
  }
};


/**
 * @inheritDoc
 */
ydn.db.index.req.IDBCursor.prototype.hasCursor = function() {
  return !!this.cur;
};


/**
 * This must call only when cursor is active.
 * @return {*} return current index key.
 * @override
 */
ydn.db.index.req.IDBCursor.prototype.getKey = function() {
  return this.cur.key;
};


/**
 * This must call only when cursor is active.
 * @return {*} return current primary key.
 * @override
 */
ydn.db.index.req.IDBCursor.prototype.getPrimaryKey = function() {
  return this.cur.primaryKey;
};


/**
 * This must call only when cursor is active.
 * @return {*} return current primary key.
 * @override
 */
ydn.db.index.req.IDBCursor.prototype.getValue = function() {
  return this.cur.value;
};


/**
 * Continue to next primary key position.
 *
 *
 * This will continue to scan
 * until the key is over the given primary key. If next_primary_key is
 * lower than current position, this will rewind.
 * @param {*} next_primary_key
 * @param {*=} next_index_key
 * @param {boolean=} inclusive
 * @override
 */
ydn.db.index.req.IDBCursor.prototype.seek = function(next_primary_key,
                                         next_index_key, inclusive) {

  if (this.cur) {
    var value = this.key_only ? this.cur.key : this.cur['value'];
    var primary_cmp = ydn.db.con.IndexedDb.indexedDb.cmp(this.cur.primaryKey, next_primary_key);
    var primary_on_track = primary_cmp == 0 || (primary_cmp == 1 && !this.reverse) || (primary_cmp == -1 && this.reverse);

    if (ydn.db.index.req.IDBCursor.DEBUG) {
      var s = primary_cmp === 0 ? 'next' : primary_cmp === 1 ? 'on track' : 'wrong track';
      window.console.log(this + ' seek ' + next_primary_key + ':' + next_index_key + ' ' + s);
    }

    if (goog.isDefAndNotNull(next_index_key)) {
      var index_cmp = ydn.db.con.IndexedDb.indexedDb.cmp(this.cur.key, next_index_key);
      var index_on_track = (index_cmp == 1 && !this.reverse) || (index_cmp == -1 && this.reverse);
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
        if (inclusive) {
          throw new ydn.db.InternalError();
        }
        this.cur['continue']();
        this.has_pending_request = true;
      } else if (primary_on_track) {
        if (!inclusive) {
          throw new ydn.db.InternalError();
        }
        this.cur['continue'](next_primary_key);
        this.has_pending_request = true;
      } else {
        // primary key not in the range
        // this will restart the thread.
        this.open_request(next_primary_key, next_index_key, inclusive);
      }
    }
  } else {
    throw new ydn.db.InternalError(this.label + ' cursor gone.');
  }
};

