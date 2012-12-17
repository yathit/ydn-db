/**
 * @fileoverview IDB query node.
 *
 * User: kyawtun
 * Date: 10/12/12
 */


goog.provide('ydn.db.sql.req.idb.Node');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.KeyRange');
goog.require('ydn.error.ArgumentException');



/**
 * Create a SQL query object from a query object.
 *
 *
 * @param {!ydn.db.schema.Store} schema store schema
 * @param {!ydn.db.Sql} sql store name.
 * @constructor
 */
ydn.db.sql.req.idb.Node = function(schema, sql) {

  this.sql_ = sql;
  this.store_schema_ = schema;

};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.sql.req.idb.Node.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.sql.req.idb.Node');


/**
 * @type {!ydn.db.schema.Store}
 * @private
 */
ydn.db.sql.req.idb.Node.prototype.store_schema_;

/**
 * @type {ydn.db.Sql}
 * @private
 */
ydn.db.sql.req.idb.Node.prototype.sql_;


/**
 * @inheritDoc
 */
ydn.db.sql.req.idb.Node.prototype.toJSON = function() {
  return {'sql': this.sql_};
};


/**
 * @override
 */
ydn.db.sql.req.idb.Node.prototype.toString = function() {
  return 'idb.Node:';
};


/**
 * @param {!goog.async.Deferred} df
 * @param {ydn.db.index.req.IRequestExecutor} req
 */
ydn.db.sql.req.idb.Node.prototype.execute = function(df, req) {

  var me = this;
  var out = [];

  var store_name = this.sql_.getStoreNames()[0];
  var wheres = this.sql_.getConditions();
  var limit = this.sql_.getLimit();
  limit = isNaN(limit) ? ydn.db.base.DEFAULT_RESULT_LIMIT : limit;
  var offset = this.sql_.getOffset();
  offset = isNaN(offset) ? 0 : offset;
  var order = this.sql_.getOrderBy();
  var sel_fields = this.sql_.getSelList();
  var key_range = null;
  var reverse = this.sql_.isReversed();
  if (wheres.length == 0) {
    key_range = null;
  } else if (wheres.length == 1) {
    key_range = wheres[0];
  } else {
    throw new ydn.error.NotSupportedException('too many conditions.');
  }

  if (goog.isNull(sel_fields) || sel_fields.length == 0)  {
    req.listByKeyRange(df, store_name, key_range, reverse, limit, offset);
  }  else if (sel_fields.length == 1) {
    var iter = new ydn.db.KeyIterator(store_name, sel_fields[0], key_range, reverse);
    req.listByIterator(df, iter, limit, offset);
  } else {
    throw new ydn.error.NotSupportedException('too many select fields');
  }

};




