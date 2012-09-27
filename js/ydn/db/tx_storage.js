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
goog.require('ydn.db.req.IndexedDb');
goog.require('ydn.db.req.SimpleStore');
goog.require('ydn.db.req.WebSql');



/**
 * @implements {ydn.db.io.QueryService}
 * @param {!ydn.db.Storage} storage
 * @param {number} ptx_no
 * @param {string} scope_name
 * @constructor
 * @extends {ydn.db.tr.TxStorage}
*/
ydn.db.TxStorage = function(storage, ptx_no, scope_name) {
  goog.base(this, storage, ptx_no, scope_name);
  this.db_name = this.getStorage().getName();
  var schema = this.getStorage().getSchema();
  this.schema = ydn.db.DatabaseSchema.fromJSON(schema);

};
goog.inherits(ydn.db.TxStorage, ydn.db.tr.TxStorage);


/**
 *
 * @return {!ydn.db.Storage}
 */
ydn.db.TxStorage.prototype.getStorage = function() {
  return /** @type {!ydn.db.Storage} */ (goog.base(this, 'getStorage'));
};


/**
 * @protected
 * @type {ydn.db.req.RequestExecutor}
 */
ydn.db.TxStorage.prototype.executor = null;


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.req.RequestExecutor}
 */
ydn.db.TxStorage.prototype.getExecutor = function() {
  if (this.executor) {
    return this.executor;
  } else {

    var type = this.type();
    if (type == ydn.db.adapter.IndexedDb.TYPE) {
      this.executor = new ydn.db.req.IndexedDb(this.db_name, this.schema);
    } else if (type == ydn.db.adapter.WebSql.TYPE) {
      this.executor = new ydn.db.req.WebSql(this.db_name, this.schema);
    } else if (type == ydn.db.adapter.SimpleStorage.TYPE ||
        type == ydn.db.adapter.LocalStorage.TYPE ||
        type == ydn.db.adapter.SessionStorage.TYPE) {
      this.executor = new ydn.db.req.SimpleStore(this.db_name, this.schema);
    } else {
      throw new ydn.db.InternalError('No executor for ' + type);
    }

    return this.executor;
  }
};


/**
 * @throws {ydn.db.ScopeError}
 * @param {function(ydn.db.req.RequestExecutor)} callback
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'readonly'.
 */
ydn.db.TxStorage.prototype.execute = function(callback, store_names, mode)
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
        throw new ydn.db.InternalError('Tx not available for scope: ' + me.scope);
      }
      me.getExecutor().setTx(mu_tx.getTx(), me.scope);
      callback(me.getExecutor());
      mu_tx.lock(); // explicitly told not to use this transaction again.
    };
    //var cbFn = goog.partial(tx_callback, callback);
    tx_callback.name = this.scope; // scope name
    //window.console.log(mu_tx.getScope() +  ' active: ' + mu_tx.isActive() + ' locked: ' + mu_tx.isSetDone());
    this.transaction(tx_callback, store_names, mode);
  }
};




/**
 * Store a value to default key-value store.
 * @export
 * @param {string} key The key to set.
 * @param {string} value The value to save.
 * @param {number=} opt_expiration The number of miliseconds since epoch
 *     (as in goog.now()) when the value is to expire. If the expiration
 *     time is not provided, the value will persist as long as possible.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.TxStorage.prototype.setItem = function(key, value, opt_expiration) {

  var wrapper = this.getStorage().getWrapper();
  if (wrapper) {
    value = wrapper.wrapValue(key, value, opt_expiration);
  }
  return this.put(ydn.db.IStorage.DEFAULT_TEXT_STORE,
    {'id': key, 'value': value});

};


/**
 * @param {string} store store name. If not defined, all object stores are used.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {string=} direction cursor direction.
 * @param {(!ydn.db.KeyRangeJson|!ydn.db.KeyRange|!ydn.db.IDBKeyRange|string|number)=}
    * keyRange configuration in json or native format. Alternatively key range
 * constructor parameters can be given
 * @param {(string|number)=} upper
 * @param {boolean=} lowerOpen
 * @param {boolean=} upperOpen
 */
ydn.db.TxStorage.prototype.query = function(store, index, direction, keyRange, upper, lowerOpen, upperOpen) {
  return new ydn.db.io.Query(this, store, index, direction, keyRange, upper, lowerOpen, upperOpen);
};


/**
 *
 * @param {(string|number)=}id
 * @param {ydn.db.Key=} opt_parent
 * @return {ydn.db.io.Key}
 */
ydn.db.TxStorage.prototype.key = function(store_or_json_or_value, id, opt_parent) {
  return new ydn.db.io.Key(this, store_or_json_or_value, id, opt_parent);
};


/**
 * Remove an item to default key-value store.
 * @export
 * @param {string} id item id to be remove.
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.TxStorage.prototype.removeItem = function(id) {

  return this.clear(ydn.db.IStorage.DEFAULT_TEXT_STORE, id);

};



/**
 * Retrieve a value from default key-value store.
 *
 * Note: This will not raise error to get non-existing object.
 * @export
 * @param {string} key The key to get.
 * @return {!goog.async.Deferred} return resulting object in deferred function.
 * If not found, {@code undefined} is return.
 */
ydn.db.TxStorage.prototype.getItem = function(key) {
  var out = this.get(ydn.db.IStorage.DEFAULT_TEXT_STORE, key);
  var df = new goog.async.Deferred();
  var me = this;
  out.addCallback(function(data) {
    if (goog.isDef(data)) {
      var value = data['value'];
      var wrapper = me.getStorage().getWrapper();
      if (wrapper && goog.isDef(value)) {
        value = wrapper.unwrapValue(key, value);
      }
      df.callback(value);
    } else {
      df.callback(undefined);
    }
  });
  out.addErrback(function(data) {
    df.errback(data);
  });
  return df;
};



/**
 *
 * @param {string} store_name
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.TxStorage.prototype.count = function(store_name) {
  var df = ydn.db.createDeferred();
  var count = function(executor) {
    executor.count(df, store_name);
  };
  this.execute(count, [store_name], ydn.db.TransactionMode.READ_ONLY);
  return df;
};


/**
 * Return object or objects of given key or keys.
 * @param {(string|!ydn.db.Key|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(string|number|!Array.<string>|!Array.<!Array.<string>>)=} arg2
 * object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.TxStorage.prototype.get = function (arg1, arg2) {

  var df = ydn.db.createDeferred();


  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {ydn.db.Key}
     */
    var k = arg1;
    var k_store_name = k.getStoreName();
    goog.asserts.assert(this.schema.hasStore(k_store_name), 'Store: ' + k_store_name + ' not found.');
    var kid = k.getId();
    this.execute(function (executor) {
      executor.getById(df, k_store_name, kid);
    }, [k_store_name], ydn.db.TransactionMode.READ_ONLY);
  } else if (goog.isString(arg1)) {
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    goog.asserts.assert(store, 'Store: ' + store_name + ' not found.');
    // here I have very concern about schema an object store mismatch!
    // should try query without sniffing store.type
    if (store.type == ydn.db.DataType.ARRAY) {
      if (goog.isArray(arg2)) {
        var arr = arg2;
        var key0 = arr[0];
        if (goog.isArray(key0)) {
          if (goog.isString(key0[0]) || goog.isNumber(key0[0])) {
            this.execute(function (executor) {
              executor.getByIds(df, store_name, arr);
            }, [store_name], ydn.db.TransactionMode.READ_ONLY);
          } else {
            throw new ydn.error.ArgumentException('key array too deep.');
          }
        } else if (goog.isDef(arg2)) {
          var arr_id = arg2;
          this.execute(function (executor) {
            executor.getById(df, store_name, arr_id);
          }, [store_name], ydn.db.TransactionMode.READ_ONLY);
        } else {
          throw new ydn.error.ArgumentException();
        }
      } else {
        throw new ydn.error.ArgumentException('array key required.');
      }
    } else {
      if (goog.isArray(arg2)) {
        if (goog.isString(arg2[0]) || goog.isNumber(arg2[0])) {
          var ids = arg2;
          this.execute(function (executor) {
            executor.getByIds(df, store_name, ids);
          }, [store_name], ydn.db.TransactionMode.READ_ONLY);
        } else {
          throw new ydn.error.ArgumentException('key must be string or number');
        }
      } else if (goog.isString(arg2) || goog.isNumber(arg2)) {
        /** @type {string} */
        /** @type {string|number} */
        var id = arg2;
        this.execute(function (executor) {
          executor.getById(df, store_name, id);
        }, [store_name], ydn.db.TransactionMode.READ_ONLY);
      } else if (!goog.isDef(arg2)) {
        this.execute(function (executor) {
          executor.getByStore(df, store_name);
        }, [store_name], ydn.db.TransactionMode.READ_ONLY);

      } else {
        throw new ydn.error.ArgumentException();
      }
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
        goog.asserts.assert(this.schema.hasStore(i_store_name), 'Store: ' + i_store_name + ' not found.');
        if (!goog.array.contains(store_names, i_store_name)) {
          store_names.push(i_store_name);
        }
      }
      this.execute(function (executor) {
        executor.getByKeys(df, keys);
      }, store_names, ydn.db.TransactionMode.READ_ONLY);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (!goog.isDef(arg1) && !goog.isDef(arg2)) {
    this.execute(function (executor) {
      executor.getByStore(df);
    }, this.schema.getStoreNames(), ydn.db.TransactionMode.READ_ONLY);
  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};


/**
 * Execute PUT request either storing result to tx or callback to df.
 * @param {string} store_name table name.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {string|number|!Array.<(string|number)>=} opt_keys out-of-line keys
 * @return {!goog.async.Deferred}
 */
ydn.db.TxStorage.prototype.put = function (store_name, value, opt_keys) {



  var df = ydn.db.createDeferred();
  var me = this;
  if (goog.isString(store_name)) {
    var store = this.schema.getStore(store_name);
    if (!store) {
      throw new ydn.error.ArgumentException('Store: ' + store_name + ' not exists.');
    }
    // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBObjectStore#put
    if ((goog.isDef(store.keyPath) || store.autoIncrement) && goog.isDef(opt_keys)) {
      // The object store uses in-line keys or has a key generator, and a key parameter was provided.
      throw new ydn.error.ArgumentException('in-line key is in used.');
    } else if (!goog.isDef(store.keyPath) && !store.autoIncrement && !goog.isDef(opt_keys)) {
      // The object store uses out-of-line keys and has no key generator, and no key parameter was provided.
      throw new ydn.error.ArgumentException('out-of-line key must be provided.');
    }

    if (goog.isArray(value)) {
      var objs = value;
      var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
      this.execute(function (executor) {
        executor.putObjects(df, store_name, objs, keys);
      }, [store_name], ydn.db.TransactionMode.READ_WRITE);
    } else if (goog.isObject(value)) {
      var obj = value;
      var key = /** @type {number|string|undefined} */  (opt_keys);
      this.execute(function (executor) {
        executor.putObject(df, store_name, obj, key);
      }, [store_name], ydn.db.TransactionMode.READ_WRITE);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else {
    throw new ydn.error.ArgumentException('store name required.');
  }

  return df;
};


/**
 * @param {!ydn.db.Query} q query.
 * @param {number=} max
 * @param {number=} skip
 * @return {!goog.async.Deferred}
 */
ydn.db.TxStorage.prototype.fetch = function(q, max, skip) {
  var df = ydn.db.createDeferred();
  if (!(q instanceof ydn.db.Query)) {
    throw new ydn.error.ArgumentException();
  }
  goog.asserts.assert(this.schema.hasStore(q.store_name), q.store_name +
    ' not exists.');

  this.execute(function (executor) {
    executor.fetch(df, q, max, skip);
  }, [q.store_name], ydn.db.TransactionMode.READ_ONLY);

  return df;
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

  var df = ydn.db.createDeferred();

  if (goog.isString(arg1)) {
    var store_name = arg1;
    if (goog.isString(arg2) || goog.isNumber(arg2)) {
      var id = arg2;
      this.execute(function(executor) {
        executor.clearById(df, store_name, id);
      }, [store_name], ydn.db.TransactionMode.READ_WRITE);
    } else if (!goog.isDef(arg2)) {
      this.execute(function(executor) {
        executor.clearByStore(df, store_name);
      }, [store_name], ydn.db.TransactionMode.READ_WRITE);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (goog.isArray(arg1) && goog.isString(arg1[0])) {
    var store_names = arg1;
    this.execute(function(executor) {
      executor.clearByStore(df, store_names);
    }, [store_names], ydn.db.TransactionMode.READ_WRITE);
  } else if (!goog.isDef(arg1)) {
    var store_names = this.schema.getStoreNames();
    this.execute(function(executor) {
      executor.clearByStore(df, store_names);
    }, [store_names], ydn.db.TransactionMode.READ_WRITE);
  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};



/** @override */
ydn.db.TxStorage.prototype.toString = function() {
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




