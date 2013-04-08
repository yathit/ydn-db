/**
 * @fileoverview IDB query node.
 *
 * User: kyawtun
 * Date: 10/12/12
 */


goog.provide('ydn.db.sql.req.idb.Node');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Sql');
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

  this.sql = sql;
  this.store_schema = schema;

};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.sql.req.idb.Node.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.sql.req.idb.Node');


/**
 * @type {!ydn.db.schema.Store}
 * @protected
 */
ydn.db.sql.req.idb.Node.prototype.store_schema;


/**
 * @type {ydn.db.Sql}
 * @protected
 */
ydn.db.sql.req.idb.Node.prototype.sql;



/**
 * @inheritDoc
 */
ydn.db.sql.req.idb.Node.prototype.toJSON = function() {
  return {'sql': this.sql};
};


/**
 * @override
 */
ydn.db.sql.req.idb.Node.prototype.toString = function() {
  return 'idb.Node:';
};


/**
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {string} tx_no
 * @param {?function(*, boolean=)} df return key in deferred function.
 * @param {ydn.db.core.req.IRequestExecutor} req
 */
ydn.db.sql.req.idb.Node.prototype.execute = function(tx, tx_no, df, req) {

  var me = this;
  var out = [];

  var store_name = this.sql.getStoreNames()[0];
  var wheres = this.sql.getConditions();
  var limit = this.sql.getLimit();
  limit = isNaN(limit) ? ydn.db.base.DEFAULT_RESULT_LIMIT : limit;
  var offset = this.sql.getOffset();
  offset = isNaN(offset) ? 0 : offset;
  var order = this.sql.getOrderBy();
  var sel_fields = this.sql.getSelList();
  /**
   *
   * @type {IDBKeyRange}
   */
  var key_range = null;
  var reverse = this.sql.isReversed();
  if (wheres.length == 0) {
    key_range = null;
  } else if (wheres.length == 1) {
    key_range = ydn.db.KeyRange.parseIDBKeyRange(wheres[0].getKeyRange());
  } else {
    throw new ydn.error.NotSupportedException('too many conditions.');
  }

  var ndf = df;
  if (!goog.isNull(sel_fields)) {
    ndf = function (records, is_error) {
      if (is_error) {
        df(records, true);
      } else {
        var out = records.map(function(record) {
          var n = sel_fields.length;
          if (n == 1) {
            return ydn.db.utils.getValueByKeys(record, sel_fields[0]);
          } else {
            var obj = {};
            for (var i = 0; i < n; i++) {
              obj[sel_fields[i]] = ydn.db.utils.getValueByKeys(record,
                sel_fields[i]);
            }
            return obj;
          }
        });
        df(out);
      }
    };
  }
  if (order && order != this.store_schema.getKeyPath()) {
    req.listByIndexKeyRange(tx, tx_no, ndf, store_name, order, key_range,
      reverse, limit, offset, false);
  } else if (wheres.length > 0 && wheres[0].getField() !=
      this.store_schema.getKeyPath()) {
    req.listByIndexKeyRange(tx, tx_no, ndf, store_name, wheres[0].getField(), key_range,
      reverse, limit, offset, false);
  } else {
    req.listByKeyRange(tx, tx_no, ndf, store_name, key_range, reverse, limit, offset);
  }

};




