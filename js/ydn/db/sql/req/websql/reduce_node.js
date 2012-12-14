/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 11/12/12
 */


goog.provide('ydn.db.sql.req.websql.ReduceNode');
goog.require('ydn.db.sql.req.websql.Node');


/**
 *
 * @param {!ydn.db.schema.Store} schema store schema
 * @param {string} sql store name.
 * @param {Array} params SQL parameters
 * @extends {ydn.db.sql.req.websql.Node}
 * @constructor
 */
ydn.db.sql.req.websql.ReduceNode = function(schema, sql, params) {
  goog.base(this, schema, sql, params);
};
goog.inherits(ydn.db.sql.req.websql.ReduceNode, ydn.db.sql.req.websql.Node);
