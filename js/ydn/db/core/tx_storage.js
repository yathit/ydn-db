/**
* @fileoverview Provide atomic CRUD database operations.
*
*
*/


goog.provide('ydn.db.core.TxStorage');
goog.require('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.core.req.SimpleStore');
goog.require('ydn.db.core.req.WebSql');
goog.require('ydn.db.tr.TxStorage');
goog.require('ydn.db.core.IStorage');
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
 * @type {ydn.db.core.req.IRequestExecutor} request executor.
 */
ydn.db.core.TxStorage.prototype.executor = null;


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.core.req.IRequestExecutor} get executor.
 */
ydn.db.core.TxStorage.prototype.getExecutor = function() {
  if (this.executor) {
    return this.executor;
  } else {

    var type = this.type();
    if (type == ydn.db.con.IndexedDb.TYPE) {
      this.executor = new ydn.db.core.req.IndexedDb(this.getName(), this.schema);
    } else if (type == ydn.db.con.WebSql.TYPE) {
      this.executor = new ydn.db.core.req.WebSql(this.db_name, this.schema);
    } else if (type == ydn.db.con.SimpleStorage.TYPE ||
        type == ydn.db.con.LocalStorage.TYPE ||
        type == ydn.db.con.SessionStorage.TYPE) {
      this.executor = new ydn.db.core.req.SimpleStore(this.db_name, this.schema);
    } else {
      throw new ydn.db.InternalError('No executor for ' + type);
    }

    return this.executor;
  }
};


/**
 * @throws {ydn.db.ScopeError}
 * @protected
 * @param {function(ydn.db.core.req.IRequestExecutor)} callback callback when executor
 * is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 * @param {string} scope scope.
 */
ydn.db.core.TxStorage.prototype.exec = function (callback, store_names, mode, scope) {
  var me = this;
  var mu_tx = this.getMuTx();

  if (mu_tx.isActiveAndAvailable()) {
    //console.log(mu_tx.getScope() + ' continuing tx for ' + scope);
    // call within a transaction
    // continue to use existing transaction
    me.getExecutor().setTx(mu_tx.getTx(), scope);
    callback(me.getExecutor());
  } else {
    //console.log('creating new tx for ' + scope);

    var on_complete = function () {
      //console.log('tx ' + scope + ' completed');
    };

    //
    // create a new transaction and close for invoke in non-transaction context
    var tx_callback = function (idb) {
      //console.log('tx running for ' + scope);
      me.not_ready_ = true;
      // transaction should be active now
      if (!mu_tx.isActive()) {
        throw new ydn.db.InternalError('Tx not active for scope: ' + scope);
      }
      if (!mu_tx.isAvailable()) {
        throw new ydn.db.InternalError('Tx not available for scope: ' +
            scope);
      }
      me.getExecutor().setTx(mu_tx.getTx(), scope);
      callback(me.getExecutor());
      mu_tx.lock(); // explicitly told not to use this transaction again.
    };
    //var cbFn = goog.partial(tx_callback, callback);
    tx_callback.name = scope; // scope name
    //window.console.log(mu_tx.getScope() +  ' active: ' + mu_tx.isActive() + '
    // locked: ' + mu_tx.isSetDone());
    me.run(tx_callback, store_names, mode, on_complete);

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
    // also notice, there is transaction overlap problem in mutex class.
  }
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.TxStorage.prototype.count = function(store_name, index_or_keyrange,
                                                 index_key_range) {
  var df = ydn.db.base.createDeferred();

  /**
   * @type {!Array.<string>}
   */
  var store_names;

  /**
   * @type {string}
   */
  var index_name;
  /**
   * @type {IDBKeyRange}
   */
  var key_range;

  if (!goog.isDef(store_name)) {
    if (goog.isDef(index_key_range) || goog.isDef(index_or_keyrange)) {
      throw new ydn.error.ArgumentException('too many arguments.');
    }
    store_names = this.schema.getStoreNames();

    var dfl = new goog.async.Deferred();
    this.exec( function(executor) {
      executor.countStores(df, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'countStores');

    df.addCallbacks(function(count) {
      var total = count.reduce(function(p, x) {
        return x + p;
      }, 0);
      dfl.callback(total);
    }, function(e) {
      dfl.errback(e);
    });

    return dfl;
  } else if (goog.isArray(store_name)) {

    if (goog.isDef(index_key_range) || goog.isDef(index_or_keyrange)) {
      throw new ydn.error.ArgumentException('too many arguments.');
    }

    store_names = store_name;
    for (var i = 0; i < store_names.length; i++) {
      if (!this.schema.hasStore(store_names[i])) {
        throw new ydn.db.NotFoundError(store_names[i]);
      }
    }

    //console.log('waiting to count');
    this.exec( function(executor) {
      //console.log('counting');
      executor.countStores(df, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'countStores');
  } else if (goog.isString(store_name)) {
    if (!this.schema.hasStore(store_name)) {
      throw new ydn.db.NotFoundError(store_name);
    }
    store_names = [store_name];

    if (goog.isString(index_or_keyrange)) {
      index_name = index_or_keyrange;
      key_range = ydn.db.KeyRange.parseIDBKeyRange(index_key_range);
    } else if (goog.isObject(index_or_keyrange) || !goog.isDef(index_or_keyrange)) {
      if (goog.isDef(index_key_range)) {
        throw new ydn.error.ArgumentException();
      }
      key_range = ydn.db.KeyRange.parseIDBKeyRange(index_or_keyrange);
    } else {
      throw new ydn.error.ArgumentException('key range');
    }

    this.exec(function (executor) {
      executor.countKeyRange(df, store_names[0], key_range, index_name);
    }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'countKeyRange');

  } else {
    throw new ydn.error.ArgumentException();
  }

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
    }, [k_store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');
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
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');

  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.TxStorage.prototype.keys = function(arg1, arg2, arg3,
                                                arg4, arg5, arg6, arg7) {
  /**
   * @type {IDBKeyRange}
   */
  var key_range;
  /**
   * @type {string}
   */
  var index_name;
  /**
   * @type {number}
   */
  var limit;
  /**
   * @type {number}
   */
  var offset;
  /**
   * @type {boolean}
   */
  var reverse;
  /**
   * @type {boolean}
   */
  var unique;
  /**
   * @type {boolean}
   */
  var distinct;

  goog.asserts.assertString(arg1, 'store_name must be a string');
  /**
   *
   * @type {string}
   */
  var store_name = arg1;

  var store;
  if (goog.DEBUG) {
    store = this.schema.getStore(store_name);
    if (!store) {
      throw new ydn.db.NotFoundError(store_name);
    }
  }

  var df = new goog.async.Deferred();
  if (!goog.isDef(arg2) || goog.isBoolean(arg2)) {
    // keysByStore

    reverse = !!arg2;
    if (goog.isNumber(arg3)) {
      limit = arg3;
    } else if (!goog.isDef(arg3)) {
      limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    } else {
      throw new TypeError('arg3');
    }
    if (goog.isNumber(arg4)) {
      offset = arg4;
    } else if (!goog.isDef(arg4)) {
      offset = 0;
    } else {
      throw new TypeError('arg4');
    }
    this.exec(function(executor) {
      executor.keysByStore(df, store_name, reverse, limit, offset);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'keysByStore');
  } else if (goog.isObject(arg2) || goog.isNull(arg2)) {
    // keysByKeyRange
    if (goog.isObject(arg2)) {
      key_range = ydn.db.KeyRange.parseIDBKeyRange(arg2);
      if (goog.DEBUG && goog.isNull(key_range)) {
        throw new ydn.error.ArgumentException('key range');
      }
    }
    if (goog.isBoolean(arg3) || !goog.isDef(arg3)) {
      reverse = !!arg3;
      if (goog.isNumber(arg4)) {
        limit = arg4;
      } else if (!goog.isDef(arg4)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else {
        throw new ydn.error.ArgumentException('arg4 must be number|undefined.');
      }
      if (goog.isNumber(arg5)) {
        offset = arg5;
      } else if (!goog.isDef(arg5)) {
        offset = 0;
      } else {
        throw new ydn.error.ArgumentException('arg5 must be number|undefined.');
      }
      if (goog.isDef(arg6) || goog.isDef(arg7)) {
        throw new ydn.error.ArgumentException('too many arguments');
      }
      this.exec(function(executor) {
        executor.keysByKeyRange(df, store_name, key_range,
            reverse, limit, offset);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'keysByKeyRange');

    } else {
      throw new ydn.error.ArgumentException(
        'arg3 must be boolean|string|undefined.');
    }
  } else if (goog.isString(arg2)) {
    // keysByIndexKeyRange
    index_name = arg2;
    if (goog.DEBUG && !store.hasIndex(index_name)) {
      throw new ydn.db.NotFoundError(index_name + ' in ' + store_name);
    }
    if (!goog.isDef(arg3) || goog.isNull(arg3) || goog.isObject(arg3)) {
      key_range = ydn.db.KeyRange.parseIDBKeyRange(
        /** @type {IDBKeyRange} */ (arg3));
    } else {
      throw new ydn.error.ArgumentException(
        'arg3 must be IDBKeyRange|null|undefined.');
    }

    if (goog.isDef(arg4) && !goog.isBoolean(arg4)) {
      throw new ydn.error.ArgumentException('arg4 must be boolean|undefined.');
    }
    reverse = !!arg4;
    if (goog.isNumber(arg5)) {
      limit = arg5;
    } else if (!goog.isDef(arg5)) {
      limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    } else {
      throw new ydn.error.ArgumentException('arg5 must be number|undefined.');
    }
    if (goog.isNumber(arg6)) {
      offset = arg6;
    } else if (!goog.isDef(arg6)) {
      offset = 0;
    } else {
      throw new ydn.error.ArgumentException('arg6 must be number|undefined.');
    }
    if (goog.isDef(arg7) && !goog.isBoolean(arg7)) {
      throw new ydn.error.ArgumentException('arg7 must be boolean|undefined.');
    }
    unique = !!arg7;

    this.exec(function(executor) {
      executor.keysByIndexKeyRange(df, store_name, index_name, key_range,
        reverse, limit, offset, unique);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'keysByIndexKeyRange');
  }  else {
    throw new ydn.error.ArgumentException();
  }
  return df;
};


/**
 * @inheritDoc
 */
ydn.db.core.TxStorage.prototype.list = function(arg1, arg2, arg3, arg4, arg5, arg6, arg7) {

  var df = ydn.db.base.createDeferred();
  /**
   * @type {boolean}
   */
  var reverse;
  /**
   * @type {number}
   */
  var limit;
  /**
   * @type {number}
   */
  var offset;
  /**
   * @type {boolean}
   */
  var unique;


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
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByIds');
    } else if (!goog.isDef(arg2) || goog.isBoolean(arg2)) {
      reverse = !!arg2;
      if (!goog.isDef(arg3)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg3)) {
        limit = arg3;
      } else {
        throw new ydn.error.ArgumentException('arg3 must be number|undefined.');
      }
      if (!goog.isDef(arg4)) {
        offset = 0;
      } else if (goog.isNumber(arg4)) {
        offset = arg4;
      } else {
        throw new ydn.error.ArgumentException('arg4 must be number|undefined.');
      }

      if (goog.isDef(arg5)) {
        throw new ydn.error.ArgumentException('too many input arguments');
      }
      this.exec(function (executor) {
        executor.listByKeyRange(df, store_name, null, reverse,
          limit, offset);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByKeyRange');
    } else if (goog.isObject(arg2) || goog.isNull(arg2) || !goog.isDef(arg2)) {
      var key_range = ydn.db.KeyRange.parseIDBKeyRange(arg2);
      if (goog.isDef(arg3) && !goog.isBoolean(arg3)) {
        throw new ydn.error.ArgumentException('arg3 must be boolean|undefined.');
      }
      reverse = !!arg3;
      if (!goog.isDef(arg4)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg4)) {
        limit = arg4;
      } else {
        throw new ydn.error.ArgumentException('arg4 must be number|undefined.');
      }
      if (!goog.isDef(arg5)) {
        offset = 0;
      } else if (goog.isNumber(arg5)) {
        offset = arg5;
      } else {
        throw new ydn.error.ArgumentException('arg5 must be number|undefined.');
      }
      var kr = key_range;
      this.exec(function (executor) {
        executor.listByKeyRange(df, store_name, kr, reverse,
          limit, offset);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByKeyRange');
    } else if (goog.isString(arg2)) {
      var index = arg2;
      var key_range = ydn.db.KeyRange.parseIDBKeyRange(
        /** @type {ydn.db.KeyRange} */ (arg3));
      if (goog.isDef(arg4) && !goog.isBoolean(arg4)) {
        throw new ydn.error.ArgumentException('arg4 must be boolean|undefined.');
      }
      reverse = !!arg4;
      if (!goog.isDef(arg5)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg5)) {
        limit = arg5;
      } else {
        throw new ydn.error.ArgumentException('arg5 must be number|undefined.');
      }
      if (!goog.isDef(arg6)) {
        offset = 0;
      } else if (goog.isNumber(arg6)) {
        offset = arg6;
      } else {
        throw new ydn.error.ArgumentException('arg6 must be number|undefined.');
      }
      unique = !!arg7;
      if (goog.isDef(arg7) && !goog.isBoolean(arg7)) {
        throw new ydn.error.ArgumentException('arg7 must be boolean|undefined.');
      }
      this.exec(function (executor) {
        executor.listByIndexKeyRange(df, store_name, index, key_range, reverse,
          limit, offset, unique);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByKeyRange');
    } else {
      throw new ydn.error.ArgumentException('arg2');
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
      }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'listByKeys');
    } else {
      throw new ydn.error.ArgumentException('must be array of ydn.db.Key');
    }
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
    var schema = goog.isObject(store_name_or_schema) ?
        store_name_or_schema : {'name': store_name};

      // this is async process, but we don't need to wait for it.
      store = ydn.db.schema.Store.fromJSON(/** @type {!StoreSchema} */ (schema));
      this.logger.finest('Adding object store: ' + store_name);
      this.addStoreSchema(store);

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
    //console.log('waiting to putObjects');
    this.exec(function(executor) {
      //console.log('putObjects');
      executor.putObjects(df, store_name, objs, keys);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObjects');
  } else if (goog.isObject(value)) {
    var obj = value;
    var key = /** @type {number|string|undefined} */ (opt_keys);

    this.exec(function(executor) {
      executor.putObject(df, store_name, obj, key);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObject');
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
 * @param {(!Array|string|number)=} arg2 delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.core.TxStorage.prototype.clear = function(arg1, arg2) {

  var df = ydn.db.base.createDeferred();

  if (goog.isString(arg1)) {
    var store_name = arg1;
    if (goog.isString(arg2) || goog.isNumber(arg2) || goog.isArray(arg2)) {
      var id = /** @type {(!Array|number|string)} */  (arg2);
      this.exec(function(executor) {
        executor.clearById(df, store_name, id);
      }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'clearById');
    } else if (!goog.isDef(arg2)) {
      this.exec(function(executor) {
        executor.clearByStore(df, store_name);
      }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'clearByStore');
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (goog.isArray(arg1) && goog.isString(arg1[0])) {
    var store_names = arg1;
    this.exec(function(executor) {
      executor.clearByStore(df, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE, 'clearByStore');
  } else if (!goog.isDef(arg1)) {
    var store_names = this.schema.getStoreNames();
    this.exec(function(executor) {
      executor.clearByStore(df, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE, 'clearByStore');
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




