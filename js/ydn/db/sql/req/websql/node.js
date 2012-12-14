/**
 * @fileoverview WebSQL query node.
 *
 * User: kyawtun
 * Date: 10/12/12
 */


goog.provide('ydn.db.sql.req.websql.Node');
goog.require('ydn.db.Iterator');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.error.ArgumentException');



/**
 * Create a SQL query object from a query object.
 *
 *
 * @param {!ydn.db.schema.Store} schema store schema
 * @param {string} sql store name.
 * @param {Array} params SQL parameters
 * @constructor
 */
ydn.db.sql.req.websql.Node = function(schema, sql, params) {

  this.schema_ = schema;
  this.sql_ = sql;
  this.params_ = params;

};

/**
 * @type {!ydn.db.schema.Store}
 * @private
 */
ydn.db.sql.req.websql.Node.prototype.schema_;

/**
 * @type {string}
 * @private
 */
ydn.db.sql.req.websql.Node.prototype.sql_;

/**
 * @type {string}
 * @private
 */
ydn.db.sql.req.websql.Node.prototype.params_;


/**
 *
 * @return {string}
 */
ydn.db.sql.req.websql.Node.prototype.getSql = function() {
  return this.sql_;
};

/**
 *
 * @return {Array}
 */
ydn.db.sql.req.websql.Node.prototype.getParams = function() {
  return this.params_;
};



/**
 * @inheritDoc
 */
ydn.db.sql.req.websql.Node.prototype.toJSON = function() {
  return {'sql': this.sql_};
};


/**
 * @override
 */
ydn.db.sql.req.websql.Node.prototype.toString = function() {
  return 'websql.Node:';
};


/**
 *
 * @param {!Object} row
 * @return {!Object}
 */
ydn.db.sql.req.websql.Node.prototype.parseRow = function(row) {
  return ydn.db.core.req.WebSql.parseRow(row, this.schema_);
};




/**
 * @param {!goog.async.Deferred} df
 * @param {SQLTransaction} tx
 */
ydn.db.sql.req.websql.Node.prototype.executeSql = function(df, tx) {

  var me = this;
  var out = [];
  var store = this.schema.getStore(sql.getStoreName());

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function (transaction, results) {
    var n = results.rows.length;
    for (var i = 0; i < n; i++) {
      var row = results.rows.item(i);
      var value = me.parseRow(row);
      var key_str = goog.isDefAndNotNull(store.keyPath) ?
          row[store.keyPath] : row[ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
      var key = ydn.db.schema.Index.sql2js(key_str, store.type);
      out.push(value);
    }
    df.callback(out)
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.sql.req.WebSql.DEBUG) {
      window.console.log([sql, tr, error]);
    }
    me.logger.warning('Sqlite error: ' + error.message);
    df.errback(error);
    return true; // roll back
  };

  if (ydn.db.sql.req.WebSql.DEBUG) {
    window.console.log(this + ' open SQL: ' + sql + ' PARAMS:' +
        ydn.json.stringify(params));
  }
  tx.executeSql(sql.getSql(), params, callback, error_callback);

};




