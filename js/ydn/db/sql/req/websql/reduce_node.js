/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 11/12/12
 */


goog.provide('ydn.db.sql.req.websql.ReduceNode');
goog.require('ydn.db.sql.req.websql.Node');
goog.require('ydn.object');


/**
 *
 * @param {!ydn.db.schema.Store} schema store schema
 * @param {!ydn.db.Sql} sql store name.
 * @extends {ydn.db.sql.req.websql.Node}
 * @constructor
 */
ydn.db.sql.req.websql.ReduceNode = function(schema, sql) {
  goog.base(this, schema, sql);
};
goog.inherits(ydn.db.sql.req.websql.ReduceNode, ydn.db.sql.req.websql.Node);


/**
 * @param {!goog.async.Deferred} df
 * @param {SQLTransaction} tx
 * @param {Array} params
 * @override
 */
ydn.db.sql.req.websql.ReduceNode.prototype.execute = function(df, tx, params) {

  var sql_stm = this.sql.getSql();
  var me = this;
  var out = [];

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function (transaction, results) {
    var n = results.rows.length;
    if (n == 1) {
      var value = ydn.object.takeFirst(results.rows.item(0));
      df.callback(value);
    } else if (n == 0) {
      df.callback(undefined);
    } else {
      throw new ydn.db.InternalError();
    }

  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.sql.req.WebSql.DEBUG) {
      window.console.log([sql_stm, tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error.message);
    df.errback(error);
    return true; // roll back
  };

  if (ydn.db.sql.req.WebSql.DEBUG) {
    window.console.log(this + ' open SQL: ' + sql_stm + ' PARAMS:' +
      ydn.json.stringify(params));
  }
  tx.executeSql(sql_stm, params, callback, error_callback);

};




