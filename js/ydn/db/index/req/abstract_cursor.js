/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.AbstractCursor');


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {!IDBObjectStore} obj_store object store.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec
 * @param {boolean} key_only mode.
 * @constructor
 */
ydn.db.index.req.AbstractCursor = function(obj_store, store_name, index_name, keyRange,
                                   direction, key_only) {

  goog.asserts.assert(obj_store);
  this.obj_store = obj_store;

  this.label = store_name + ':' + index_name;

  this.cur = null;
  
  this.key_range = keyRange;

  this.reverse = direction == ydn.db.base.Direction.PREV ||
    direction == ydn.db.base.Direction.PREV_UNIQUE;

  this.dir = /** @type {number} */ (direction); // new standard is string.

  this.key_only = key_only;

};


/**
 * @protected
 * @type {string}
 */
ydn.db.index.req.AbstractCursor.prototype.label = '';


/**
 * @protected
 * @type {IDBKeyRange}
 */
ydn.db.index.req.AbstractCursor.prototype.key_range = null;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.index.req.AbstractCursor.prototype.reverse = false;



/**
 * @protected
 * @type {boolean}
 */
ydn.db.index.req.AbstractCursor.prototype.key_only = true;


/**
 *
 * @type {function(Error)}
 */
ydn.db.index.req.AbstractCursor.prototype.onError = function(e) {
  throw e;
};


/**
 * Move cursor to a given position by primary key.
 *
 * This will iterate the cursor records until the primary key is found without
 * changing index key. If index has change during iteration, this will invoke
 * onNext callback with resulting value. If given primary key is in wrong
 * direction, this will rewind and seek.
 *
 * Return value of:
 *   undefined : will invoke onNext
 *   null      : don't do anything
 *   *         : seek to given primary key value, not invoke onNext.
 *   true      : continue next cursor position, not invoke onNext
 *   false     : restart the cursor, not invoke onNext.
 *
 * @param {*} primary_key
 * @param {*} key
 * @param {*} value
 */
ydn.db.index.req.AbstractCursor.prototype.onSuccess = goog.abstractMethod;


/**
 *
 * @param {*} primary_key
 * @param {*} key
 * @param {*} value
 */
ydn.db.index.req.AbstractCursor.prototype.onNext = function(primary_key, key, value) {

};


/**
 * Continue to next position.
 * @param {*} next_position next index key.
 */
ydn.db.index.req.AbstractCursor.prototype.forward = goog.abstractMethod;


/**
 * Continue to next primary key position.
 *
 *
 * This will continue to scan
 * until the key is over the given primary key. If next_primary_key is
 * lower than current position, this will rewind.
 * @param {*} next_primary_key
 * @param {*=} next_index_key
 * @param {boolean=} exclusive
 */
ydn.db.index.req.AbstractCursor.prototype.seek = goog.abstractMethod;


/**
 *
 * @return {*} primary key.
 */
ydn.db.index.req.AbstractCursor.prototype.getPrimaryKey = goog.abstractMethod;

/**
 * @return {boolean}
 */
ydn.db.index.req.AbstractCursor.prototype.hasCursor = goog.abstractMethod;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.index.req.AbstractCursor.prototype.has_pending_request = false;

/**
 * @return {boolean}
 */
ydn.db.index.req.AbstractCursor.prototype.isRequestPending = function() {
  return this.has_pending_request;
};


/**
 *
 * @return {*} primary key.
 */
ydn.db.index.req.AbstractCursor.prototype.getKey = goog.abstractMethod;



/**
 *
 * @return {*} primary key.
 */
ydn.db.index.req.AbstractCursor.prototype.getValue = goog.abstractMethod;


/**
 * @override
 */
ydn.db.index.req.AbstractCursor.prototype.toString = function() {
  if (goog.DEBUG) {
    var k = '';
    if (this.hasCursor()) {
      k = '[' + this.getPrimaryKey() + ':' + this.getKey() + ']';
    }
    return 'Cursor:' + this.label + k;
  } else {
    return goog.base(this, 'toString');
  }
};