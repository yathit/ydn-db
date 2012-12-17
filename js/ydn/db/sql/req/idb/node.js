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
 * @param {SQLTransaction} tx
 * @param {Array} params
 */
ydn.db.sql.req.idb.Node.prototype.execute = function(df, tx, params) {

  var me = this;
  var out = [];



};




