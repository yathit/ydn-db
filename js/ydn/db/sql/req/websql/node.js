/**
 * @fileoverview WebSQL query node.
 *
 * User: kyawtun
 * Date: 10/12/12
 */


goog.provide('ydn.db.sql.req.websql.Node');
goog.require('ydn.db.schema.Store');
goog.require('ydn.db.Sql');



/**
 * Create a SQL query object from a query object.
 *
 *
 * @param {!ydn.db.schema.Store} schema store schema
 * @param {!ydn.db.Sql} sql store name.
 * @constructor
 */
ydn.db.sql.req.websql.Node = function(schema, sql) {

  this.sql_ = sql;
  this.store_schema_ = schema;
  this.sel_fields_ = sql.getSelList();

};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.sql.req.websql.Node.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.sql.req.websql.Node');


/**
 * @type {!ydn.db.schema.Store}
 * @private
 */
ydn.db.sql.req.websql.Node.prototype.store_schema_;

/**
 * @type {ydn.db.Sql}
 * @private
 */
ydn.db.sql.req.websql.Node.prototype.sql_;


/**
 * @type {Array.<string>}
 * @private
 */
ydn.db.sql.req.websql.Node.prototype.sel_fields_;


/**
 * @inheritDoc
 */
ydn.db.sql.req.websql.Node.prototype.toJSON = function() {
  return {'sql': this.sql_.getSql()};
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
 * @return {*}
 */
ydn.db.sql.req.websql.Node.prototype.parseRow = function(row) {
  if (!this.sel_fields_) {
    return ydn.db.core.req.WebSql.parseRow(row, this.store_schema_);
  } else if (this.sel_fields_.length == 1) {
    if (goog.isObject(row)) {
      return goog.object.getValueByKeys(row, this.sel_fields_[0]);
    } else {
      return undefined;
    }
  } else {
    var obj = {};
    for (var i = 0; i < this.sel_fields_.length; i++) {
      obj[this.sel_fields_[i]] = goog.object.getValueByKeys(row, this.sel_fields_[i]);
    }
    return obj;
  }

};


/**
 * @param {!goog.async.Deferred} df
 * @param {SQLTransaction} tx
 * @param {Array} params
 */
ydn.db.sql.req.websql.Node.prototype.execute = function(df, tx, params) {

  var sql_stm = this.sql_.getSql();
  var me = this;
  var out = [];

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function (transaction, results) {
    var n = results.rows.length;
    for (var i = 0; i < n; i++) {
      var row = results.rows.item(i);
      if (goog.isObject(row)) {
        var value = me.parseRow(row);
  //      var key_str = goog.isDefAndNotNull(store.keyPath) ?
  //          row[me.store_schema_.getKeyPath()] : row[ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
  //      var key = ydn.db.schema.Index.sql2js(key_str, store.type);
        out.push(value);
      } else {
        out.push(value);
      }
    }
    df.callback(out);
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




