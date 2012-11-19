/**
* @fileoverview Provide iteration query.
*
*
*/


goog.provide('ydn.db.index.TxStorage');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.core.TxStorage');



/**
 * Construct storage to execute CRUD database operations.
 *
 * Execution database operation is atomic, if a new transaction require,
 * otherwise existing transaction is used and the operation become part of
 * the existing transaction. A new transaction is required if the transaction
 * is not active or locked. Active transaction can be locked by using
 * mutex.
 *
 * @param {!ydn.db.core.Storage} storage base storage object.
 * @param {number} ptx_no transaction queue number.
 * @param {string} scope_name scope name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @implements {ydn.db.core.IStorage}
 * @constructor
 * @extends {ydn.db.core.TxStorage}
*/
ydn.db.index.TxStorage = function(storage, ptx_no, scope_name, schema) {
  goog.base(this, storage, ptx_no, scope_name, schema);
};
goog.inherits(ydn.db.index.TxStorage, ydn.db.core.TxStorage);



/**
 * @inheritDoc
 */
ydn.db.index.TxStorage.prototype.get = function(arg1, arg2) {

  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();
    /**
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    var q_store_name = q.getStoreName();
    if (!this.schema.hasStore(q_store_name)) {
      throw new ydn.error.ArgumentException('Store: ' +
          q_store_name + ' not found.');
    }
    this.exec(function(executor) {
      executor.getByQuery(df, q);
    }, [q_store_name], ydn.db.base.TransactionMode.READ_ONLY);
    return df;
  } else {
    return goog.base(this, 'get', arg1, arg2);
  }

};


/**
 * Return object or objects of given key or keys.
 * @param {(string|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(!Array.<string>)=} arg2
 * object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.index.TxStorage.prototype.list = function(arg1, arg2) {

  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();
    if (goog.DEBUG && arguments.length != 2) {
      throw new ydn.error.ArgumentException();
    }
    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;

    this.exec(function(executor) {
      executor.listByIterator(df, q);
    }, q.stores(), ydn.db.base.TransactionMode.READ_ONLY);

    return df;
  } else {
    return goog.base(this, 'list', arg1, arg2);
  }

};



