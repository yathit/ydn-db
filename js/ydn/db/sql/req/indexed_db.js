
/**
 * @fileoverview Implements ydn.db.io.QueryService with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.sql.req.IndexedDb');
goog.require('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.sql.req.IRequestExecutor');
goog.require('ydn.db.sql.req.idb.Node');
goog.require('ydn.db.sql.req.idb.ReduceNode');


/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @extends {ydn.db.core.req.IndexedDb}
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.sql.req.IRequestExecutor}
 */
ydn.db.sql.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.sql.req.IndexedDb, ydn.db.core.req.IndexedDb);


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.sql.req.IndexedDb.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.sql.req.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.sql.req.IndexedDb');


/**
 * @inheritDoc
 */
ydn.db.sql.req.IndexedDb.prototype.executeSql = function(tx, tx_no, df, sql,
                                                         params) {

  var msg = sql.parse(params);
  if (msg) {
    throw new ydn.db.SqlParseError(msg);
  }
  var store_names = sql.getStoreNames();
  if (store_names.length == 1) {
    var store_schema = this.schema.getStore(store_names[0]);
    if (!store_schema) {
      throw new ydn.db.NotFoundError(store_names[0]);
    }
    var fields = sql.getSelList();
    if (fields) {
      for (var i = 0; i < fields.length; i++) {
        if (!store_schema.hasIndex(fields[i])) {
          throw new ydn.db.NotFoundError('Index "' + fields[i] +
            '" not found in ' + store_names[0]);
        }
      }
    }
    var node;
    if (sql.getAggregate()) {
      node = new ydn.db.sql.req.idb.ReduceNode(store_schema, sql);
    } else {
      node = new ydn.db.sql.req.idb.Node(store_schema, sql);
    }

    node.execute(tx, tx_no, df, this);
  } else {
    throw new ydn.error.NotSupportedException(sql.getSql());
  }
};

