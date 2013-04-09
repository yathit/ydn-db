/**
 * @fileoverview Cursor for simple storage mechanism.
 */


goog.provide('ydn.db.core.req.SimpleCursor');
goog.require('ydn.db.core.req.AbstractCursor');
goog.require('ydn.db.core.req.ICursor');



/**
 * Open an index. This will resume depending on the cursor state.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {string} tx_no tx no.
 * @param {!ydn.db.schema.Store} store_schema schema.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index.
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec.
 * @param {boolean} key_only mode.
 * @extends {ydn.db.core.req.AbstractCursor}
 * @implements {ydn.db.core.req.ICursor}
 * @constructor
 */
ydn.db.core.req.SimpleCursor = function(tx, tx_no, store_schema, store_name,
    index_name, keyRange, direction, key_only) {

  goog.base(this, tx, tx_no, store_name, index_name, keyRange, direction,
      key_only);

  goog.asserts.assert(store_schema);
  this.store_schema_ = store_schema;

  this.current_key_ = null;
  this.current_primary_key_ = null;
  this.current_value_ = null;
  this.current_avl_node_ = null;

};
goog.inherits(ydn.db.core.req.SimpleCursor, ydn.db.core.req.AbstractCursor);


/**
 * @define {boolean} for debug.
 */
ydn.db.core.req.SimpleCursor.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.SimpleCursor.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.req.SimpleCursor');


/**
 *
 * @type {!ydn.db.schema.Store}
 * @private
 */
ydn.db.core.req.SimpleCursor.prototype.store_schema_;


/**
 *
 * @type {IDBKey|undefined}
 * @private
 */
ydn.db.core.req.SimpleCursor.prototype.current_key_;


/**
 *
 * @type {IDBKey|undefined}
 * @private
 */
ydn.db.core.req.SimpleCursor.prototype.current_primary_key_;


/**
 *
 * @type {*}
 * @private
 */
ydn.db.core.req.SimpleCursor.prototype.current_value_;


/**
 * @type {goog.structs.AvlTree.Node}
 * @private
 */
ydn.db.core.req.SimpleCursor.prototype.current_avl_node_;


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.getIndexKey = function() {

  return this.current_key_;

};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.getPrimaryKey = function() {
  return this.current_primary_key_;
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.getValue = function() {
  return this.current_value_;
};


/**
 *
 * @return {!ydn.db.Buffer}
 * @protected
 */
ydn.db.core.req.SimpleCursor.prototype.getIndexCache = function() {
  return this.getTx().getSimpleStore(this.store_name).getIndexCache(
      this.index_name);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.hasCursor = function() {
  return this.isActive();
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.update = function(obj, idx) {
  throw 'no update';
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.advance = function(step) {

  this.move_(this.onSuccess);

};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.continueEffectiveKey = function(key) {
  if (!this.hasCursor()) {
    throw new ydn.error.InvalidOperationError(this + ' cursor gone.');
  }
  if (goog.isDefAndNotNull(key)) {
    if (this.isIndexCursor()) {
      this.ini_index_key_ = key;
    } else {
      this.ini_key_ = key;
    }
    // this.move_(this.onSuccess);
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
ydn.db.core.req.SimpleCursor.prototype.openCursor = function(
    opt_ini_key, opt_ini_index_key, opt_exclusive) {
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
   * @return {boolean|undefined} continuation.
   */
  var tr_fn = function(node) {
    if (!node) {
      return;
    }
    var x = /** @type {ydn.db.con.simple.Node} */ (node.value);

  };
  var avl_index = this.getIndexCache();
  avl_index.traverse(tr_fn, start);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.clear = function(idx) {

  throw 'no clear';
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.restart = function(effective_key,
                                                           primary_key) {
  throw 'no restart';
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.continuePrimaryKey = function(key) {
  throw 'no p cont';

};





