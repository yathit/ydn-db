
/**
 * @fileoverview Implements ydn.db.io.QueryService with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.sql.req.IndexedDb');
goog.require('ydn.db.index.req.IndexedDb');
goog.require('ydn.db.sql.req.IRequestExecutor');


/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @extends {ydn.db.index.req.IndexedDb}
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.sql.req.IRequestExecutor}
 */
ydn.db.sql.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.sql.req.IndexedDb, ydn.db.index.req.IndexedDb);


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
ydn.db.sql.req.IndexedDb.prototype.executeSql = function(df, sql) {

  var cursor = sql.toIdbQuery(this.schema);
  var initial = goog.isFunction(cursor.initial) ? cursor.initial() : undefined;
  this.iterate(df, cursor, null, null,
    cursor.map, cursor.reduce, initial, cursor.finalize);
  return df;
};



/**
 * @inheritDoc
 */
ydn.db.sql.req.IndexedDb.prototype.explainSql = function(sql) {
  throw new ydn.error.NotImplementedException();
//  var cursor = sql.toIdbQuery(this.schema);
//  var json = /** @type {Object} */ (cursor.toJSON());
//  json['map'] = cursor.map ? cursor.map.toString() : null;
//  json['reduce'] = cursor.reduce ? cursor.reduce.toString() : null;
//  json['initial'] = cursor.initial;
//  return json;
};
