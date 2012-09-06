/**
 * @fileoverview Key with database instance.
 */


goog.provide('ydn.db.ActiveKey');
goog.require('ydn.db.Key');


/**
 * @extends {ydn.db.Key}
 * @param {!ydn.db.QueryServiceProvider} dbp
 * @param {string|!ydn.db.Key.Json} store
 * @param {(string|number)=}id
 * @param {ydn.db.Key=} opt_parent
 * @constructor
 */
ydn.db.ActiveKey = function(dbp, store, id, opt_parent) {

  /**
   * Database instance
   * @final
   * @protected
   * @type {!ydn.db.QueryServiceProvider}
   */
  this.dbp = dbp;

  goog.base(this, store, id, opt_parent);
};
goog.inherits(ydn.db.ActiveKey, ydn.db.Key);


/**
 * @inheritDoc
 */
ydn.db.ActiveKey.prototype.toKey = function(obj) {
  return new ydn.db.ActiveKey(this.dbp, obj);
};

/**
 * Get object from store.
 * @return {!goog.async.Deferred} return resulting object in deferred function.
 */
ydn.db.ActiveKey.prototype.get = function() {

  if (this.dbp.isReady()) {
    return this.dbp.getQueryService().get(this.store_name, this.id);
  } else {
    var me = this;
    var df = new goog.async.Deferred();
    this.dbp.getDeferredDb().addCallback(function(db) {
      db.get(me.store_name, me.id).chainDeferred(df);
    });
    return df;
  }


};


/**
 * @param {!Object|!Array.<!Object>} value object to put.
 * @return {!goog.async.Deferred} return key in deferred function. On error,
 * an {@code Error} object is return as received from the mechanism.
 */
ydn.db.ActiveKey.prototype.put = function(value) {

  if (this.dbp.isReady()) {
    return this.dbp.getQueryService().put(this.store_name, value);
  } else {
    var me = this;
    var df = new goog.async.Deferred();
    this.dbp.getDeferredDb().addCallback(function(db) {
      db.put(me.store_name, value).chainDeferred(df);
    });
    return df;
  }
};


/**
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.ActiveKey.prototype.clear = function() {

  if (this.dbp.isReady()) {
    return this.dbp.getQueryService().clear(this.store_name, this.id);
  } else {
    var me = this;
    var df = new goog.async.Deferred();
    this.dbp.getDeferredDb().addCallback(function(db) {
      db.clear(me.store_name, me.id).chainDeferred(df);
    });
    return df;
  }
};
