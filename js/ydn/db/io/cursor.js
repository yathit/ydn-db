/**
 * @fileoverview Query associate with transaction context.
 */


goog.provide('ydn.db.io.Cursor');
goog.require('ydn.db.Cursor');
goog.require('ydn.db.io.QueryService');



/**
 * Create a query from a database. If the database is active transaction,
 * the query will join the transaction, otherwise to belong to own transaction
 * instance.
 * @extends {ydn.db.Cursor}
 * @param {!ydn.db.io.QueryService} db db instance.
 * @param {string} store store name. If not defined, all object stores are used.
 * @param {ydn.db.Cursor.Direction=} direction cursor direction.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!KeyRangeJson|!ydn.db.KeyRange|!ydn.db.IDBKeyRange|string|number)=}
    * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given
 * @param {(string|number)=} upper
 * @param {boolean=} lowerOpen
 * @param {boolean=} upperOpen
 * @constructor
 */
ydn.db.io.Cursor = function(db, store, direction, index, keyRange, upper, lowerOpen, upperOpen) {
  goog.base(this, store, direction, index, keyRange, upper, lowerOpen, upperOpen);
  // database instance. This is be module private variable.
  /**
   * @final
   * @protected
   * @type {!ydn.db.io.QueryService}
   */
  this.dbp = db;
};
goog.inherits(ydn.db.io.Cursor, ydn.db.Cursor);


/**
 * @return {!goog.async.Deferred}
 */
ydn.db.io.Cursor.prototype.get = function() {
  var df = ydn.db.base.createDeferred();
  var rdf = this.dbp.fetch(this, 1);

  // extract the first result.
  rdf.addCallback(function(results) {
    df.callback(results[0]);
  });
  rdf.addErrback(function(e) {
    df.errback(e);
  });

  return df;
};



/**
 * Fetch result of a query
 * @param {number=} opt_max maximun number of results.
 * @param {number=} opt_skip start counter.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.io.Cursor.prototype.fetch = function(opt_max, opt_skip) {
  return this.dbp.fetch(this, opt_max, opt_skip);
};
