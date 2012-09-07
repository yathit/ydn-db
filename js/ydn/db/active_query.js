/**
 * @fileoverview Query with database instance, ready to fetch the result.
 */


goog.provide('ydn.db.ActiveQuery');
goog.require('ydn.db.Query');
goog.require('ydn.db.QueryService');
goog.require('ydn.db.Query');


/**
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
ydn.db.ActiveQuery = function(db, store, index, keyRange, direction) {
  goog.base(this, store, index, keyRange, direction);
  // database instance. This is be module private variable.
  /**
   * @final
   * @protected
   * @type {!ydn.db.QueryServiceProvider}
   */
  this.dbp = db;
};
goog.inherits(ydn.db.ActiveQuery, ydn.db.Query);


/**
 * @return {!goog.async.Deferred}
 */
ydn.db.ActiveQuery.prototype.get = function() {
  if (this.dbp.isReady()) {
    return this.dbp.getQueryService().get(this);
  } else {
    var me = this;
    var df = new goog.async.Deferred();
    this.dbp.getDeferredDb().addCallback(function(db) {
      db.get(me).chainDeferred(df);
    });
    return df;
  }
};



/**
 * Fetch result of a query
 * @param {number=} opt_limit maximun number of results.
 * @param {number=} opt_offset start counter.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.ActiveQuery.prototype.fetch = function(opt_limit, opt_offset) {
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
