/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.AbstractCursor');
goog.require('goog.Disposable');
goog.require('ydn.debug.error.InternalError');



/**
 * Open an index. This will resume depending on the cursor state.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx tx.
 * @param {string} tx_no tx no.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index name.
 * @param {IDBKeyRange} keyRange key range.
 * @param {ydn.db.base.Direction} direction cursor direction.
 * @param {boolean} key_only mode.
 * @constructor
 * @extends {goog.Disposable}
 */
ydn.db.index.req.AbstractCursor = function(tx, tx_no,
    store_name, index_name, keyRange, direction, key_only) {
  goog.base(this);
  /**
   * @final
   */
  this.store_name = store_name;
  /**
   * @final
   */
  this.index_name = index_name;
  /**
   * @final
   */
  this.is_index = goog.isString(this.index_name);

  /**
   * @final
   */
  this.key_range = keyRange || null;

  this.tx = tx;

  this.tx_no = tx_no;

  /**
   * @final
   */
  this.reverse = direction == ydn.db.base.Direction.PREV ||
      direction == ydn.db.base.Direction.PREV_UNIQUE;

  /**
   * @final
   */
  this.unique = direction == ydn.db.base.Direction.NEXT_UNIQUE ||
      direction == ydn.db.base.Direction.PREV_UNIQUE;

  /**
   * @final
   */
  this.dir = direction;

  /**
   * @final
   */
  this.key_only = key_only;

};
goog.inherits(ydn.db.index.req.AbstractCursor, goog.Disposable);


/**
 * @protected
 * @type {function(IDBKey=, IDBKey=)}
 */
ydn.db.index.req.AbstractCursor.prototype.cursor_position_listener;


/**
 * @protected
 * @type {string|undefined}
 */
ydn.db.index.req.AbstractCursor.prototype.index_name;


/**
 * @private
 * @type {boolean}
 */
ydn.db.index.req.AbstractCursor.prototype.is_index;


/**
 * @protected
 * @type {string}
 */
ydn.db.index.req.AbstractCursor.prototype.store_name = '';


/**
 * @protected
 * @type {string}
 */
ydn.db.index.req.AbstractCursor.prototype.dir = '';


/**
 * @protected
 * @type {IDBKeyRange}
 */
ydn.db.index.req.AbstractCursor.prototype.key_range = null;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.index.req.AbstractCursor.prototype.unique = false;


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
 * @return {boolean} true if transaction is active.
 */
ydn.db.index.req.AbstractCursor.prototype.isActive = function() {
  return !!this.tx;
};


/**
 *
 * @return {boolean} return true if this is an index cursor.
 */
ydn.db.index.req.AbstractCursor.prototype.isIndexCursor = function() {
  return this.is_index;
};


/**
 *
 * @param {!Error} e error object.
 */
ydn.db.index.req.AbstractCursor.prototype.onError = function(e) {
  throw new ydn.debug.error.InternalError();
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
 * @param {IDBKey=} opt_key
 * @param {IDBKey=} opt_primary_key
 * @param {*=} opt_value
 */
ydn.db.index.req.AbstractCursor.prototype.onSuccess = function(
    opt_key, opt_primary_key, opt_value) {
 throw new ydn.debug.error.InternalError();
};


/**
 * @inheritDoc
 */
ydn.db.index.req.AbstractCursor.prototype.disposeInternal = function() {
  this.tx = null;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.index.req.AbstractCursor.prototype.toString = function() {
    var index = goog.isDef(this.index_name) ? ':' + this.index_name : '';
    var active = this.tx ? '' : '~';
    return 'Cursor:' + this.store_name +
        index + '[' + active + this.tx_no + ']';
  };
}
