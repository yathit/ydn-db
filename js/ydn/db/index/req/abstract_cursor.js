/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.AbstractCursor');
goog.require('ydn.db.index.req.ICursor');


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {!IDBObjectStore} obj_store object store.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec
 * @param {boolean} key_only mode.
 * @implements {ydn.db.index.req.ICursor}
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
 * @type {goog.debug.Logger} logger.
 */
ydn.db.index.req.AbstractCursor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.index.req.AbstractCursor');


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
 *
 * @param {*} primary_key
 * @param {*} key
 * @param {*} value
 * @return {*}
 */
ydn.db.index.req.AbstractCursor.prototype.onSuccess = function(
    primary_key, key, value) {
  return true;
};


/**
 *
 * @type {function(*, *, *): *}
 */
ydn.db.index.req.AbstractCursor.prototype.onNext = goog.abstractMethod;


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
 * @param {boolean=} exclusive.
 */
ydn.db.index.req.AbstractCursor.prototype.seek = goog.abstractMethod;


/**
 *
 * @return {*} primary key.
 */
ydn.db.index.req.AbstractCursor.prototype.getPrimaryKey = goog.abstractMethod;



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