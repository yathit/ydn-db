/**
* @fileoverview Provide atomic CRUD database operations.
*
*
*/


goog.provide('ydn.db.core.TxStorage');
goog.require('ydn.db.req.IndexedDb');
goog.require('ydn.db.req.SimpleStore');
goog.require('ydn.db.req.WebSql');
goog.require('ydn.db.tr.TxStorage');
goog.require('ydn.error.NotSupportedException');



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
 * @extends {ydn.db.tr.TxStorage}
*/
ydn.db.core.TxStorage = function(storage, ptx_no, scope_name, schema) {
  goog.base(this, storage, ptx_no, scope_name);

  /**
   * @protected
   * @final
   * @type {!ydn.db.schema.Database}
   */
  this.schema = schema;
};
goog.inherits(ydn.db.core.TxStorage, ydn.db.tr.TxStorage);


/**
 * @final
 * @return {!ydn.db.core.Storage} storage.
 */
ydn.db.core.TxStorage.prototype.getStorage = function() {
  return /** @type {!ydn.db.core.Storage} */ (goog.base(this, 'getStorage'));
};


/**
 * @final
 * @return {string} database name.
 */
ydn.db.core.TxStorage.prototype.getName = function() {
  // db name can be undefined during instantiation.
  this.db_name = this.db_name || this.getStorage().getName();
  return this.db_name;
};


/**
 * @protected
 * @type {ydn.db.req.RequestExecutor} request executor.
 */
ydn.db.core.TxStorage.prototype.executor = null;


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @final
 * @protected
 * @return {ydn.db.req.RequestExecutor} get executor.
 */
ydn.db.core.TxStorage.prototype.getExecutor = function() {
  if (this.executor) {
    return this.executor;
  } else {

    var type = this.type();
    if (type == ydn.db.con.IndexedDb.TYPE) {
      this.executor = new ydn.db.req.IndexedDb(this.getName(), this.schema);
    } else if (type == ydn.db.con.WebSql.TYPE) {
      this.executor = new ydn.db.req.WebSql(this.db_name, this.schema);
    } else if (type == ydn.db.con.SimpleStorage.TYPE ||
        type == ydn.db.con.LocalStorage.TYPE ||
        type == ydn.db.con.SessionStorage.TYPE) {
      this.executor = new ydn.db.req.SimpleStore(this.db_name, this.schema);
    } else {
      throw new ydn.db.InternalError('No executor for ' + type);
    }

    return this.executor;
  }
};


/**
 * @final
 * @throws {ydn.db.ScopeError}
 * @protected
 * @param {function(ydn.db.req.RequestExecutor)} callback callback when executor
 * is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 */
ydn.db.core.TxStorage.prototype.exec = function(callback, store_names, mode)
{
  var me = this;
  var mu_tx = this.getMuTx();

  if (mu_tx.isActiveAndAvailable()) {
    //window.console.log(mu_tx.getScope() + ' continuing');
    // call within a transaction
    // continue to use existing transaction
    me.getExecutor().setTx(mu_tx.getTx(), me.scope);
    callback(me.getExecutor());
  } else {
    //console.log('creating new')
    //
    // create a new transaction and close for invoke in non-transaction context
    var tx_callback = function(idb) {
      // transaction should be active now
      if (!mu_tx.isActive()) {
        throw new ydn.db.InternalError('Tx not active for scope: ' + me.scope);
      }
      if (!mu_tx.isAvailable()) {
        throw new ydn.db.InternalError('Tx not available for scope: ' +
          me.scope);
      }
      me.getExecutor().setTx(mu_tx.getTx(), me.scope);
      callback(me.getExecutor());
      mu_tx.lock(); // explicitly told not to use this transaction again.
    };
    //var cbFn = goog.partial(tx_callback, callback);
    tx_callback.name = this.scope; // scope name
    //window.console.log(mu_tx.getScope() +  ' active: ' + mu_tx.isActive() + '
    // locked: ' + mu_tx.isSetDone());
    this.run(tx_callback, store_names, mode);
    // need to think about handling oncompleted and onerror callback of the
    // transaction. after executed all the requests, the transaction is not
    // completed. consider this case
    // db.put(data).addCallback(function(id) {
    //    // at this stage, transaction for put request is not grantee finished.
    //    db.get(id);
    //    // but practically, when next transaction is open,
    //    // the previous transaction should be finished anyways,
    //    // due to 'readwrite' lock.
    //    // so seems like OK. it is not necessary to listen oncompleted
    //    // callback.
    // });
  }
};



/**
 *
 * @inheritDoc
 */
ydn.db.core.TxStorage.prototype.count = function(store_name, opt_key_range) {
  var df = ydn.db.base.createDeferred();

  var store_names = goog.isArray(store_name) ?
    store_name : goog.isDef(store_name) ?
    [store_name] : this.schema.getStoreNames();

  if (store_names.length == 0) {
    // it is an error to call transaction with store names.
    df.callback(0);
    return df;
  }

  var count = function(executor) {
    if (goog.isDef(opt_key_range)) {
      executor.countKeyRange(df, store_name, opt_key_range);
    } else {
      executor.countStores(df, store_names);
    }

  };
  this.exec(count, store_names, ydn.db.base.TransactionMode.READ_ONLY);
  return df;
};



/**
 * @inheritDoc
 */
ydn.db.core.TxStorage.prototype.get = function(arg1, arg2) {

  var df = ydn.db.base.createDeferred();

  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {ydn.db.Key}
     */
    var k = arg1;
    var k_store_name = k.getStoreName();
    if (!this.schema.hasStore(k_store_name)) {
      if (this.schema.isAutoSchema()) {
        return goog.async.Deferred.succeed(undefined);
      } else {
        throw new ydn.error.ArgumentException('Store: ' +
          k_store_name + ' not found.');
      }
    }

    var kid = k.getId();
    this.exec(function(executor) {
      executor.getById(df, k_store_name, kid);
    }, [k_store_name], ydn.db.base.TransactionMode.READ_ONLY);
  } else if (goog.isString(arg1) && goog.isDef(arg2)) {
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    if (!store) {
      if (this.schema.isAutoSchema()) {
        return goog.async.Deferred.succeed(undefined);
      } else {
        throw new ydn.error.ArgumentException('Store: ' + store_name +
          ' not found.');
      }
    }
    var id = arg2;
    this.exec(function(executor) {
      executor.getById(df, store_name, id);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY);

  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};


/**
 * Return object or objects of given key or keys.
 * @param {(string|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(!Array.<string>)=} arg2
 * object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.core.TxStorage.prototype.list = function(arg1, arg2) {

  var df = ydn.db.base.createDeferred();


  if (goog.isString(arg1)) {
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    if (!store) {
      if (this.schema.isAutoSchema()) {
        return goog.async.Deferred.succeed(undefined);
      } else {
        throw new ydn.error.ArgumentException('Store: ' + store_name +
          ' not found.');
      }
    }

    if (goog.isArray(arg2)) {
      var ids = arg2;
      this.exec(function(executor) {
        executor.listByIds(df, store_name, ids);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY);
    } else if (!goog.isDef(arg2)) {
      this.exec(function(executor) {
        executor.listByStores(df, [store_name]);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (goog.isArray(arg1)) {
    if (arg1[0] instanceof ydn.db.Key) {
      var store_names = [];
      /**
       * @type {!Array.<!ydn.db.Key>}
       */
      var keys = arg1;
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var i_store_name = key.getStoreName();
        if (!this.schema.hasStore(i_store_name)) {
          if (this.schema.isAutoSchema()) {
            var fail_array = [];
            // I think more efficient than: fail_array.length = keys.length;
            fail_array[keys.length - 1] = undefined;
            return goog.async.Deferred.succeed(fail_array);
          } else {
            throw new ydn.error.ArgumentException('Store: ' + i_store_name +
              ' not found.');
          }
        }
        if (!goog.array.contains(store_names, i_store_name)) {
          store_names.push(i_store_name);
        }
      }
      this.exec(function(executor) {
        executor.listByKeys(df, keys);
      }, store_names, ydn.db.base.TransactionMode.READ_ONLY);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (!goog.isDef(arg1) && !goog.isDef(arg2)) {
    this.exec(function(executor) {
      executor.listByStores(df, this.schema.getStoreNames());
    }, this.schema.getStoreNames(), ydn.db.base.TransactionMode.READ_ONLY);
  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.core.TxStorage.prototype.put = function(store_name_or_schema, value,
                                                opt_keys) {



  var store_name = goog.isString(store_name_or_schema) ?
    store_name_or_schema : goog.isObject(store_name_or_schema) ?
    store_name_or_schema['name'] : undefined;
  if (!goog.isString(store_name)) {
    throw new ydn.error.ArgumentException('store name');
  }

  var store = this.schema.getStore(store_name);
  if (!store) {
    if (!this.schema.isAutoSchema()) {
      throw new ydn.error.ArgumentException('Not found: ' + store_name);
    }
    if (goog.isObject(store_name_or_schema)) {
      // this is async process, but we don't need to wait for it.
      store = ydn.db.schema.Store.fromJSON(store_name_or_schema);
      this.logger.finest('Adding object store: ' + store_name);
      this.addStoreSchema(store);
    } else {
      throw new ydn.error.ArgumentException('store schema required.');
    }
  } else if (this.schema.isAutoSchema() && goog.isObject(store_name_or_schema))
  {
    // if there is changes in schema, change accordingly.
    var new_schema = ydn.db.schema.Store.fromJSON(store_name_or_schema);
    var diff = store.difference(new_schema);
    if (diff) {
      throw new ydn.error.NotSupportedException('schema change: ' + diff);
      // this.addStoreSchema(store);
    }
  }

  var df = ydn.db.base.createDeferred();
  var me = this;

  if (!store) {
    throw new ydn.error.ArgumentException('Store: ' + store_name +
      ' not exists.');
  }
  // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBObjectStore#put
  if ((goog.isString(store.keyPath)) && goog.isDef(opt_keys)) {
    // The object store uses in-line keys or has a key generator, and a key
    // parameter was provided.
    throw new ydn.error.ArgumentException(
      'key cannot provide while in-line key ' + 'is in used.');
  } else if (store.autoIncrement && goog.isDef(opt_keys)) {
    // The object store uses in-line keys or has a key generator, and a key
    // parameter was provided.
    throw new ydn.error.ArgumentException('key cannot provide while ' +
      'autoIncrement is true.');
  } else if (!goog.isString(store.keyPath) && !store.autoIncrement &&
    !goog.isDef(opt_keys)) {
    // The object store uses out-of-line keys and has no key generator, and no
    // key parameter was provided.
    throw new ydn.error.ArgumentException('out-of-line key must be provided.');
  }

  if (goog.isArray(value)) {
    var objs = value;
    var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
    this.exec(function(executor) {
      executor.putObjects(df, store_name, objs, keys);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);
  } else if (goog.isObject(value)) {
    var obj = value;
    var key = /** @type {number|string|undefined} */ (opt_keys);
    this.exec(function(executor) {
      executor.putObject(df, store_name, obj, key);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);
  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;


};


/**
 * Remove a specific entry from a store or all.
 * @param {(!Array.<string>|string)=} arg1 delete the table as provided
 * otherwise
 * delete all stores.
 * @param {(string|number)=} arg2 delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.core.TxStorage.prototype.clear = function(arg1, arg2) {

  var df = ydn.db.base.createDeferred();

  if (goog.isString(arg1)) {
    var store_name = arg1;
    if (goog.isString(arg2) || goog.isNumber(arg2)) {
      var id = arg2;
      this.exec(function(executor) {
        executor.clearById(df, store_name, id);
      }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);
    } else if (!goog.isDef(arg2)) {
      this.exec(function(executor) {
        executor.clearByStore(df, store_name);
      }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (goog.isArray(arg1) && goog.isString(arg1[0])) {
    var store_names = arg1;
    this.exec(function(executor) {
      executor.clearByStore(df, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE);
  } else if (!goog.isDef(arg1)) {
    var store_names = this.schema.getStoreNames();
    this.exec(function(executor) {
      executor.clearByStore(df, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE);
  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};



/** @override */
ydn.db.core.TxStorage.prototype.toString = function() {
  var s = 'TxStorage:' + this.getStorage().getName();
  if (goog.DEBUG) {
    var scope = this.getScope();
    scope = scope ? '[' + scope + ']' : '';
    var mu = this.getMuTx().getScope();
    var mu_scope = mu ? '[' + mu + ']' : '';
    return s + ':' + this.q_no_ + scope + ':' + this.getTxNo() + mu_scope;
  }
  return s;
};




