/**
* @fileoverview Light wrapper {@link ydn.db.Storage} using active transaction
* instance given at constructor.
*
*
*/


goog.provide('ydn.db.TxStorage');
goog.require('ydn.error.NotSupportedException');
goog.require('ydn.db.tr.TxStorage');
goog.require('ydn.db.io.QueryService');


/**
 * @implements {ydn.db.io.QueryService}
 * @param {!ydn.db.Storage} storage
 * @param {string} scope
 * @constructor
 * @extends {ydn.db.tr.TxStorage}
*/
ydn.db.TxStorage = function(storage, scope) {
  goog.base(this, storage, scope);
};
goog.inherits(ydn.db.TxStorage, ydn.db.tr.TxStorage);



/**
 * Return object
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(string|number|!Array.<string>)=} arg2 object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.TxStorage.prototype.get = function (arg1, arg2) {
  return this.getStorage().get(arg1, arg2);
};



/**
 * @inheritDoc
 */
ydn.db.TxStorage.prototype.put = function(store, value, opt_key) {
  return this.getStorage().put(store, value, opt_key);
};


/**
 * @inheritDoc
 */
ydn.db.TxStorage.prototype.clear = function(arg1, arg2) {
  return this.getStorage().clear(arg1, arg2);
};



/**
 * @inheritDoc
 */
ydn.db.TxStorage.prototype.fetch = function(q, max, skip) {
  return this.getStorage().fetch(q, max, skip);
};