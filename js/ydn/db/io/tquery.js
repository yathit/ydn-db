/**
 * @fileoverview Query associate with transaction context.
 */


goog.provide('ydn.db.TQuery');
goog.require('ydn.db.Query');
goog.require('ydn.db.QueryService');
goog.require('ydn.db.Query');


/**
 * Create a query from a database. If the database is active transaction,
 * the query will join the transaction, otherwise to belong to own transaction
 * instance.
 * @extends {ydn.db.Query}
 * @param {!ydn.db.QueryServiceProvider} db db instance.
 * @param {string} store store name.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(!ydn.db.Query.KeyRangeJson|!ydn.db.Query.IDBKeyRange|undefined)=}
 * keyRange configuration in
 * @param {string=} direction cursor direction.
 * @constructor
 */
ydn.db.TQuery = function(db, store, index, keyRange, direction) {
  goog.base(this, store, index, keyRange, direction);
  // database instance. This is be module private variable.
  /**
   * @final
   * @protected
   * @type {!ydn.db.QueryServiceProvider}
   */
  this.dbp = db;
};
goog.inherits(ydn.db.TQuery, ydn.db.Query);


/**
 * @return {!goog.async.Deferred}
 */
ydn.db.TQuery.prototype.get = function() {
  var rdf;
  var df = new goog.async.Deferred();
  if (this.dbp.isReady()) {
    rdf = this.dbp.getQueryService().fetch(this, 1);
  } else {
    var me = this;
    rdf = new goog.async.Deferred();
    this.dbp.getDeferredDb().addCallback(function(db) {
      db.fetch(me, 1).chainDeferred(rdf);
    });
  }

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
 * @param {number=} opt_limit maximun number of results.
 * @param {number=} opt_offset start counter.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.TQuery.prototype.fetch = function(opt_limit, opt_offset) {
  if (this.dbp.isReady()) {
    return this.dbp.getQueryService().fetch(this, opt_limit, opt_offset);
  } else {
    var me = this;
    var df = new goog.async.Deferred();
    this.dbp.getDeferredDb().addCallback(function(db) {
      db.fetch(me, opt_limit, opt_offset).chainDeferred(df);
    });
    return df;
  }

};
