
/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.core.req.AbstractCursor');
goog.require('goog.Disposable');
goog.require('ydn.debug.error.InternalError');



/**
 * Open an index. This will resume depending on the cursor state.
 * @param {ydn.db.con.IDatabase.Transaction} tx tx.
 * @param {string} tx_no tx no.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index name.
 * @param {IDBKeyRange} keyRange key range.
 * @param {ydn.db.base.Direction} direction cursor direction.
 * @param {boolean} key_only mode.
 * @param {boolean} key_query true for keys query method.
 * @constructor
 * @extends {goog.Disposable}
 */
ydn.db.core.req.AbstractCursor = function(tx, tx_no,
    store_name, index_name, keyRange, direction, key_only, key_query) {
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

  /**
   * @final
   */
  this.key_query = key_query;

};
goog.inherits(ydn.db.core.req.AbstractCursor, goog.Disposable);


/**
 * @protected
 * @type {string|undefined}
 */
ydn.db.core.req.AbstractCursor.prototype.index_name;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.is_index;


/**
 * @protected
 * @type {string}
 */
ydn.db.core.req.AbstractCursor.prototype.store_name = '';


/**
 * @protected
 * @type {string}
 */
ydn.db.core.req.AbstractCursor.prototype.dir = '';


/**
 * @protected
 * @type {IDBKeyRange}
 */
ydn.db.core.req.AbstractCursor.prototype.key_range = null;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.unique = false;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.reverse = false;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.key_only = true;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.key_query = true;


/**
 *
 * @return {boolean} true if transaction is active.
 */
ydn.db.core.req.AbstractCursor.prototype.isActive = function() {
  return !!this.tx;
};


/**
 *
 * @return {boolean} return true if this is an index cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.isIndexCursor = function() {
  return this.is_index;
};


/**
 *
 * @return {boolean} return true if this is an value cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.isValueCursor = function() {
  return !this.key_only;
};


/**
 *
 * @param {!Error|SQLError} e error object.
 */
ydn.db.core.req.AbstractCursor.prototype.onError = function(e) {
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
ydn.db.core.req.AbstractCursor.prototype.onSuccess = function(
    opt_key, opt_primary_key, opt_value) {
  throw new ydn.debug.error.InternalError();
};


/**
 * @inheritDoc
 */
ydn.db.core.req.AbstractCursor.prototype.disposeInternal = function() {
  this.tx = null;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.core.req.AbstractCursor.prototype.toString = function() {
    var index = goog.isDef(this.index_name) ? ':' + this.index_name : '';
    var active = this.tx ? '' : '~';
    return 'Cursor:' + this.store_name +
        index + '[' + active + this.tx_no + ']';
  };
}
