/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.SimpleCursor');
goog.require('ydn.db.index.req.AbstractCursor');
goog.require('ydn.db.index.req.ICursor');


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {string} tx_no tx no
 * @param {!ydn.db.schema.Store} store_schema schema.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec
 * @param {boolean} key_only mode.
 * @extends {ydn.db.index.req.AbstractCursor}
 * @implements {ydn.db.index.req.ICursor}
 * @constructor
 */
ydn.db.index.req.SimpleCursor = function(tx, tx_no, store_schema, store_name,
       index_name, keyRange, direction, key_only) {

  goog.base(this, tx, tx_no, store_name, index_name, keyRange, direction,
    key_only);

  goog.asserts.assert(store_schema);
  this.store_schema_ = store_schema;

  this.current_key_ = undefined;
  this.current_avl_node_ = null;

  //this.openCursor(ini_key, ini_index_key);
};
goog.inherits(ydn.db.index.req.SimpleCursor, ydn.db.index.req.AbstractCursor);


/**
 * @define {boolean}
 */
ydn.db.index.req.SimpleCursor.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.index.req.SimpleCursor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.index.req.SimpleCursor');


/**
 *
 * @type {!ydn.db.schema.Store}
 * @private
 */
ydn.db.index.req.SimpleCursor.prototype.store_schema_;


/**
 *
 * @type {IDBKey|undefined}
 * @private
 */
ydn.db.index.req.SimpleCursor.prototype.current_key_;

/**
 *
 * @type {IDBKey|undefined}
 * @private
 */
ydn.db.index.req.SimpleCursor.prototype.current_primary_key_;

/**
 *
 * @type {*}
 * @private
 */
ydn.db.index.req.SimpleCursor.prototype.current_value_;


/**
 * @type {goog.structs.AvlTree.Node}
 * @private
 */
ydn.db.index.req.SimpleCursor.prototype.current_avl_node_;


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.getIndexKey = function() {

  return this.current_key_;

};


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.getPrimaryKey = function () {
  return this.current_primary_key_;
};


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.getValue = function () {
  return this.current_value_;
};


/**
 * @private
 * @return {!ydn.db.con.simple.AvlTree}
 */
ydn.db.index.req.SimpleCursor.prototype.getIndexCache = function() {
  return this.getTx().getSimpleStore(this.store_name).getIndexCache(
      this.index_name);
};


/**
 * Move cursor to the position as defined.
 * @param {?function (this:ydn.db.index.req.AbstractCursor, (IDBKey|undefined), (IDBKey|undefined), *)} callback invoke with this context
 * @param {IDBKey=} ini_key_
 * @param {IDBKey=} ini_index_key_
 * @param {boolean=} exclusive
 * @private
 */
ydn.db.index.req.SimpleCursor.prototype.move_ = function(callback,
      ini_key_, ini_index_key_, exclusive) {

  var avl_index = this.getIndexCache();


};


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.hasCursor = function() {
  return this.isActive();
};


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.update = function(obj, idx) {
  throw 'no update';
};


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.advance = function(step) {

  this.move_(this.onSuccess);

};


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.continueEffectiveKey = function(key) {
  if (!this.hasCursor()) {
    throw new ydn.error.InvalidOperationError(this + ' cursor gone.');
  }
  if (goog.isDefAndNotNull(key)) {
    if (this.isIndexCursor()) {
      this.ini_index_key_ = key;
    } else {
      this.ini_key_ = key;
    }
    this.move_(this.onSuccess);
  } else {
    this.advance(1);
  }


};


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {*=} opt_ini_key primary key to resume position.
 * @param {*=} opt_ini_index_key index key to resume position.
 * @param {boolean=} opt_exclusive
 */
ydn.db.index.req.SimpleCursor.prototype.openCursor = function(opt_ini_key,
     opt_ini_index_key, opt_exclusive) {
  var avl_index = this.getIndexCache();
  var start = null;
  if (this.isIndexCursor()) {
    if (goog.isDefAndNotNull(opt_ini_index_key)) {
      start = new ydn.db.con.simple.Node(opt_ini_index_key, opt_ini_key);
    } else if (goog.isDefAndNotNull(opt_ini_key)) {
      start = new ydn.db.con.simple.Node(opt_ini_key);
    }
  }
  /**
   *
   * @param {goog.structs.AvlTree.Node} node
   */
  var tr_fn = function (node) {

  };
  avl_index.inOrderTraverse(tr_fn, start);
};


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.clear = function(idx) {

  throw 'no clear';
};


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.restart = function(effective_key,
                                                           primary_key) {
  throw 'no restart'
};


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleCursor.prototype.continuePrimaryKey = function (key) {
  throw 'no p cont'

};





