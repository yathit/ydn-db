/**
* @fileoverview Light wrapper {@link ydn.db.Storage} using active transaction
* instance given at constructor.
*
*
*/


goog.provide('ydn.db.TxStorage');
goog.require('ydn.error.NotSupportedException');
goog.require('ydn.db.tr.TxStorage');


/**
* @implements {ydn.db.IStorage}
* @param {!ydn.db.Storage} storage
* @param {string} scope
* @constructor
*/
ydn.db.TxStorage = function(storage, scope) {
  goog.base(this, storage, scope);
};
goog.inherits(ydn.db.TxStorage, ydn.db.tr.TxStorage);




/**
* @inheritDoc
*/
ydn.db.TxStorage.prototype.execute = function(callback, stores, mode) {
  if (!this.executor.isActive()) {
    throw new ydn.db.ScopeError(callback.name + ' cannot run on ' + this.scope);
  }
  callback(this.executor);
};



/**
*
* @inheritDoc
*/
ydn.db.TxStorage.prototype.type = function() {
  return this.storage_.type();
};


/**
* @inheritDoc
*/
ydn.db.TxStorage.prototype.close = function() {
  return this.storage_.close();
};


/**
 *
 * @return {ydn.db.Storage}
 */
ydn.db.TxStorage.prototype.getStorage = function() {
  return goog.base(this, 'getStorage');
};


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
 * @param {string} store table name.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {(string|number)=}  opt_key
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.TxStorage.prototype.put = function(store, value, opt_key) {
  return this.getStorage().put(store, value, opt_key);
};


/**
 * Remove a specific entry from a store or all.
 * @param {(!Array.<string>|string)=} arg1 delete the table as provided otherwise
 * delete all stores.
 * @param {(string|number)=} arg2 delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.TxStorage.prototype.clear = function(arg1, arg2) {
  return this.getStorage().clear(arg1, arg2);
};


