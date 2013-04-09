/**
 * @fileoverview Cursor for simple storage mechanism.
 */


goog.provide('ydn.db.core.req.SimpleCursor');
goog.require('goog.Timer');
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
 * @param {boolean} key_query true for keys query method.
 * @extends {ydn.db.core.req.AbstractCursor}
 * @implements {ydn.db.core.req.ICursor}
 * @constructor
 */
ydn.db.core.req.SimpleCursor = function(tx, tx_no, store_schema, store_name,
    index_name, keyRange, direction, key_only, key_query) {

  goog.base(this, tx, tx_no, store_name, index_name, keyRange, direction,
      key_only, key_query);

  goog.asserts.assert(store_schema);
  this.store_schema_ = store_schema;

  this.key_ = undefined;
  this.primary_key_ = undefined;
  this.value_ = undefined;
  this.current_ = null;

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
ydn.db.core.req.SimpleCursor.prototype.key_;


/**
 *
 * @type {IDBKey|undefined}
 * @private
 */
ydn.db.core.req.SimpleCursor.prototype.primary_key_;


/**
 *
 * @type {*}
 * @private
 */
ydn.db.core.req.SimpleCursor.prototype.value_;


/**
 * @type {goog.structs.AvlTree.Node}
 * @private
 */
ydn.db.core.req.SimpleCursor.prototype.current_;


/**
 * @return {ydn.db.Buffer}
 * @protected
 */
ydn.db.core.req.SimpleCursor.prototype.getBuffer = function() {
  return this.getSimpleStore().getIndexCache(this.index_name);
};


/**
 *
 * @return {ydn.db.con.simple.Store}
 * @protected
 */
ydn.db.core.req.SimpleCursor.prototype.getSimpleStore = function() {
  return this.tx.getSimpleStore(this.store_name);
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
ydn.db.core.req.SimpleCursor.prototype.update = function(obj) {
  throw 'no update';
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.advance = function(step) {

  var me = this;
  var cnt = this.current_ ? -1 : 0;
  /**
   * Node traversal function.
   * @param {goog.structs.AvlTree.Node} node
   * @return {boolean|undefined} continuation.
   */
  var tr_fn = function(node) {
    cnt++;
    if (!node || cnt >= step) {
      me.defaultOnSuccess_(node);
      return true;
    }
  };
  if (this.reverse) {
    this.getBuffer().reverseTraverse(tr_fn, this.current_);
  } else {
    this.getBuffer().traverse(tr_fn, this.current_);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.continueEffectiveKey = function(key) {

  if (goog.isDefAndNotNull(key)) {
    var me = this;
    var start_node = new ydn.db.con.simple.Node(key);
    /**
     * Node traversal function.
     * @param {goog.structs.AvlTree.Node} node
     * @return {boolean|undefined} continuation.
     */
    var tr_fn = function(node) {
      me.current_ = node;
      if (!node) {
        me.defaultOnSuccess_(node);
        return true;
      }
      var x = /** @type {ydn.db.con.simple.Node} */ (node.value);
      var e_key = x.getKey();
      var cmp = ydn.db.cmp(e_key, key);
      if (me.reverse) {
        if (cmp != 1) {
          me.defaultOnSuccess_(node);
          return true;
        }
      } else {
        if (cmp != -1) {
          me.defaultOnSuccess_(node);
          return true;
        }
      }
    };
    if (this.reverse) {
      this.getBuffer().reverseTraverse(tr_fn, start_node);
    } else {
      this.getBuffer().traverse(tr_fn, start_node);
    }
  } else {
    this.advance(1);
  }

};


/**
 * Node traversal function.
 * @param {goog.structs.AvlTree.Node} node
 * @return {boolean|undefined} continuation.
 * @private
 */
ydn.db.core.req.SimpleCursor.prototype.defaultOnSuccess_ = function(node) {

  this.current_ = node;

  if (node) {
    var x = /** @type {ydn.db.con.simple.Node} */ (node.value);
    this.key_ = x.getKey();
    this.primary_key_ = this.is_index ? x.getPrimaryKey() : this.key_;
    if (!this.key_query) {
      if (this.key_only) {
        this.value_ = this.primary_key_;
      } else {
        goog.asserts.assert(goog.isDefAndNotNull(this.primary_key_));
        this.value_ = this.getSimpleStore().getRecord(null, this.primary_key_);
      }
    }
  } else {
    this.key_ = undefined;
    this.primary_key_ = undefined;
    this.value_ = undefined;
  }

  goog.Timer.callOnce(function() {
    this.onSuccess(this.key_, this.primary_key_, this.value_);
  }, 0, this);
  return true;
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.openCursor = function(
    opt_key, opt_primary_key) {
  var start_node = null;
  if (goog.isDefAndNotNull(opt_key)) {
    if (this.isIndexCursor()) {
      if (goog.isDefAndNotNull(opt_primary_key)) {
        start_node = new ydn.db.con.simple.Node(opt_key,
            opt_primary_key);
      } else {
        start_node = new ydn.db.con.simple.Node(opt_key);
      }
    }
  }

  if (this.reverse) {
    this.getBuffer().reverseTraverse(goog.bind(this.defaultOnSuccess_, this),
        start_node);
  } else {
    this.getBuffer().traverse(goog.bind(this.defaultOnSuccess_, this),
        start_node);
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleCursor.prototype.clear = function() {

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





