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
 * @param {!goog.async.Deferred} df
 * @param {ydn.db.index.req.IRequestExecutor} req
 */
ydn.db.sql.req.idb.Node.prototype.execute = function(df, req) {

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

  if (goog.isNull(sel_fields) || sel_fields.length == 0)  {
    if (goog.isDefAndNotNull(order) && order != this.store_schema.getKeyPath()) {
      var iter = new ydn.db.IndexValueCursors(store_name, order, key_range, reverse);
      req.listByIterator(df, iter, limit, offset);
    } else {
      if (key_range) {
        req.listByIndexKeyRange(df, store_name, wheres[0].getField(), key_range, reverse, limit, offset, false);
      } else {
        req.listByKeyRange(df, store_name, key_range, reverse, limit, offset);
      }
    }
  } else if (sel_fields.length == 1) {
    if (goog.isDefAndNotNull(order) && order != sel_fields[0]) {
      // TODO: More efficient
      var ndf = new goog.async.Deferred();
      var iter = new ydn.db.IndexValueCursors(store_name, order, key_range, reverse);
      req.listByIterator(ndf, iter, limit, offset);
      ndf.addCallbacks(function(values) {
        var results = values.map(function(x) {
          return goog.object.getValueByKeys(x, sel_fields[0]);
        });
        df.callback(results);
      }, function(e) {
        df.errback(e);
      });
    } else {
      var iter = new ydn.db.Cursors(store_name, sel_fields[0], key_range, reverse);
      req.listByIterator(df, iter, limit, offset);
    }

  } else {
    var ndf = new goog.async.Deferred();
    req.listByKeyRange(ndf, store_name, key_range, reverse, limit, offset);
    ndf.addCallbacks(function(records) {
      var out = records.map(function(record) {
        var obj = {};
        for (var i = 0; i < sel_fields.length; i++) {
          obj[sel_fields[i]] = goog.object.getValueByKeys(record, sel_fields[i]);
        }
        return obj;
      })
    }, function(e) {
      df.errback(e);
    });
  }

};




