/**
 * @fileoverview Query associate with transaction context.
 */


goog.provide('ydn.db.io.Query');
goog.require('ydn.db.Query');
goog.require('ydn.db.io.QueryService');
goog.require('ydn.db.Query');


/**
 * Create a query from a database. If the database is active transaction,
 * the query will join the transaction, otherwise to belong to own transaction
 * instance.
 * @extends {ydn.db.Query}
 * @param {!ydn.db.io.QueryService} db db instance.
 * @param {string} store store name.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!ydn.db.KeyRangeJson|!ydn.db.KeyRange|undefined)=}
 * keyRange configuration in
 * @param {string=} direction cursor direction.
 * @constructor
 */
ydn.db.io.Query = function(db, store, index, keyRange, direction) {
  goog.base(this, store, index, keyRange, direction);
  // database instance. This is be module private variable.
  /**
   * @final
   * @protected
   * @type {!ydn.db.io.QueryService}
   */
  this.dbp = db;
};
goog.inherits(ydn.db.io.Query, ydn.db.Query);


/**
 * @return {!goog.async.Deferred}
 */
ydn.db.io.Query.prototype.get = function() {
  var df = ydn.db.createDeferred();
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
ydn.db.io.Query.prototype.fetch = function(opt_max, opt_skip) {
  return this.dbp.fetch(this, opt_max, opt_skip);
};
