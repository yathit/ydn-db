/**
* @fileoverview Provide atomic CRUD database operations on a transaction queue.
*
*
*/


goog.provide('ydn.db.core.DbOperator');
goog.require('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.core.req.SimpleStore');
goog.require('ydn.db.core.req.WebSql');
goog.require('ydn.db.tr.AtomicSerial');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.db.core.IStorage');
goog.require('ydn.db.tr.DbOperator');
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
 * @param {!ydn.db.schema.Database} schema
 * @param {ydn.db.tr.IThread} tx_thread
 * @implements {ydn.db.core.IStorage}
 * @constructor
 * @extends {ydn.db.tr.DbOperator}
*/
ydn.db.core.DbOperator = function(storage, schema, tx_thread) {
  goog.base(this, storage, schema, tx_thread);
};
goog.inherits(ydn.db.core.DbOperator, ydn.db.tr.DbOperator);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.DbOperator.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.core.DbOperator');


/**
 *
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.count = function(store_name, index_or_keyrange,
                                                 index_key_range) {
  var df = ydn.db.base.createDeferred();
  var me = this;

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
    this.tx_thread.exec( function(tx) {
      me.getExecutor(tx).countStores(df, store_names);
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
    this.tx_thread.exec( function(tx) {
      //console.log('counting');
      me.getExecutor(tx).countStores(df, store_names);
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

    this.tx_thread.exec(function (tx) {
      me.getExecutor(tx).countKeyRange(df, store_names[0], key_range, index_name);
    }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'countKeyRange');

  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};



/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.get = function(arg1, arg2) {

  var me = this;
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
    this.tx_thread.exec(function(tx) {
      me.getExecutor(tx).getById(df, k_store_name, kid);
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
    if (arg2 instanceof ydn.db.IDBKeyRange || arg2 instanceof ydn.db.KeyRange) {
      var list_df = new goog.async.Deferred();
      list_df.addCallbacks(function(x) {
        df.callback(x[0]); // undefined OK.
      }, function(e) {
        df.errback(e);
      });
      var key_range = ydn.db.KeyRange.parseKeyRange(arg2);
      this.tx_thread.exec(function(tx) {
        me.getExecutor(tx).listByKeyRange(list_df, store_name, key_range, false, 1, 0);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');

    } else {
      var id = arg2;
      this.tx_thread.exec(function(tx) {
        me.getExecutor(tx).getById(df, store_name, id);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');
    }


  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.keys = function(arg1, arg2, arg3,
                                                arg4, arg5, arg6, arg7) {
  var me = this;
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
      throw new ydn.error.ArgumentException('arg3');
    }
    if (goog.isNumber(arg4)) {
      offset = arg4;
    } else if (!goog.isDef(arg4)) {
      offset = 0;
    } else {
      throw new ydn.error.ArgumentException('arg4');
    }
    this.tx_thread.exec(function(tx) {
      me.getExecutor(tx).keysByStore(df, store_name, reverse, limit, offset);
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
      this.tx_thread.exec(function(tx) {
        me.getExecutor(tx).keysByKeyRange(df, store_name, key_range,
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

    this.tx_thread.exec(function(tx) {
      me.getExecutor(tx).keysByIndexKeyRange(df, store_name, index_name, key_range,
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
ydn.db.core.DbOperator.prototype.list = function(arg1, arg2, arg3, arg4, arg5, arg6, arg7) {

  var me = this;
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
      this.tx_thread.exec(function(tx) {
        me.getExecutor(tx).listByIds(df, store_name, ids);
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
      this.tx_thread.exec(function (tx) {
        me.getExecutor(tx).listByKeyRange(df, store_name, null, reverse,
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
      this.tx_thread.exec(function (tx) {
        me.getExecutor(tx).listByKeyRange(df, store_name, kr, reverse,
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
      this.tx_thread.exec(function (tx) {
        me.getExecutor(tx).listByIndexKeyRange(df, store_name, index, key_range, reverse,
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
      this.tx_thread.exec(function(tx) {
        me.getExecutor(tx).listByKeys(df, keys);
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
ydn.db.core.DbOperator.prototype.add = function(store_name_or_schema, value,
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
      throw new ydn.db.NotFoundError(store_name);
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
    throw new ydn.db.NotFoundError(store_name);
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
    this.tx_thread.exec(function(tx) {
      //console.log('putObjects');
      me.getExecutor(tx).addObjects(df, store_name, objs, keys);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObjects');

    if (store.dispatch_events) {
      df.addCallback(function (keys) {
        var event = new ydn.db.events.StoreEvent(ydn.db.events.Types.CREATED,
          me.getStorage(), store.getName(), keys, objs);
        me.getStorage().dispatchEvent(event);
      });
    }
  } else if (goog.isObject(value)) {
    var obj = value;
    var key = /** @type {number|string|undefined} */ (opt_keys);

    this.tx_thread.exec(function(tx) {
      me.getExecutor(tx).addObject(df, store_name, obj, key);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObject');

    if (store.dispatch_events) {
      df.addCallback(function(key) {
        var event = new ydn.db.events.RecordEvent(ydn.db.events.Types.CREATED,
          me.getStorage(), store.getName(), key, obj);
        me.getStorage().dispatchEvent(event);
      });
    }
  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;

};


/**
 *
 * @param {string|StoreSchema} store_name_or_schema
 * @return {ydn.db.schema.Store}
 * @private
 */
ydn.db.core.DbOperator.prototype.getStore_ = function(store_name_or_schema) {

  var store_name = goog.isString(store_name_or_schema) ?
    store_name_or_schema : goog.isObject(store_name_or_schema) ?
    store_name_or_schema['name'] : undefined;
  if (!goog.isString(store_name)) {
    throw new ydn.error.ArgumentException('store name');
  }

  var store = this.schema.getStore(store_name);
  if (!store) {
    if (!this.schema.isAutoSchema()) {
      throw new ydn.db.NotFoundError(store_name);
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
  if (!store) {
    throw new ydn.db.NotFoundError(store_name);
  }
  return store;
};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.load = function(store_name_or_schema, data, opt_delimiter) {

  var delimiter = opt_delimiter || ',';

  var store = this.getStore_(store_name_or_schema);
  var store_name = store.getName();

  var df = ydn.db.base.createDeferred();
  var me = this;

  this.tx_thread.exec(function(tx) {
    me.getExecutor(tx).putData(df, store_name, data, delimiter);
  }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putData');
  return df;
};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.put = function(store_name_or_schema, value,
                                                opt_keys) {

  var store = this.getStore_(store_name_or_schema);
  var store_name = store.getName();

  var df = ydn.db.base.createDeferred();
  var me = this;


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
    this.tx_thread.exec(function(tx) {
      //console.log('putObjects');
      me.getExecutor(tx).putObjects(df, store_name, objs, keys);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObjects');

    if (store.dispatch_events) {
      df.addCallback(function(keys) {
        var event = new ydn.db.events.StoreEvent(ydn.db.events.Types.UPDATED,
          me.getStorage(), store_name, keys, objs);
        me.getStorage().dispatchEvent(event);
      });
    }

  } else if (goog.isObject(value)) {
    var obj = value;
    var key = /** @type {number|string|undefined} */ (opt_keys);

    this.tx_thread.exec(function(tx) {
      me.getExecutor(tx).putObject(df, store_name, obj, key);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObject');

    if (store.dispatch_events) {
      df.addCallback(function(key) {
        var event = new ydn.db.events.RecordEvent(ydn.db.events.Types.UPDATED,
          me.getStorage(), store_name, key, obj);
        me.getStorage().dispatchEvent(event);
      });
    }

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
 * @param {*=} arg2 delete a specific row.
 * @param {*=} arg3 delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.core.DbOperator.prototype.clear = function(arg1, arg2, arg3) {

  var df = ydn.db.base.createDeferred();
  var me = this;

  if (goog.isString(arg1)) {
    var st_name = arg1;
    var store = this.schema.getStore(st_name);
    if (!store) {
      throw new ydn.db.NotFoundError(st_name);
    }
    if (goog.isDef(arg3)) {
      if (goog.isString(arg2)) {
        var index = store.getIndex(arg2);
        if (!index) {
          throw new ydn.error.ArgumentException('index: ' + arg2 + ' not found in ' + st_name);
        }
        if (goog.isObject(arg3) || goog.isNull(arg3)) {
          var key_range = ydn.db.KeyRange.parseIDBKeyRange(
            /** @type {KeyRangeJson} */ (arg3));
          this.tx_thread.exec(function (tx) {
            me.getExecutor(tx).clearByIndexKeyRange(df, st_name, index.getName(), key_range);
          }, [st_name], ydn.db.base.TransactionMode.READ_WRITE, 'clearByIndexKeyRange');
        } else {
          throw new ydn.error.ArgumentException('arg3');
        }
      } else {
        throw new ydn.error.ArgumentException('arg2 must be string');
      }
    } else {
      if (goog.isObject(arg2) || goog.isNull(arg2)) {
        var key_range = ydn.db.KeyRange.parseIDBKeyRange(
          /** @type {KeyRangeJson} */ (arg2));
        this.tx_thread.exec(function (tx) {
          me.getExecutor(tx).clearByKeyRange(df, st_name, key_range);
        }, [st_name], ydn.db.base.TransactionMode.READ_WRITE, 'clearByKeyRange');
      } else if (goog.isString(arg2) || goog.isNumber(arg2) || goog.isArray(arg2)) {
        var id = /** @type {(!Array|number|string)} */  (arg2);
        this.tx_thread.exec(function (tx) {
          me.getExecutor(tx).clearById(df, st_name, id);
        }, [st_name], ydn.db.base.TransactionMode.READ_WRITE, 'clearById');

        if (store.dispatch_events) {
          df.addCallback(function (key) {
            var event = new ydn.db.events.RecordEvent(ydn.db.events.Types.DELETED,
              me.getStorage(), st_name, key, undefined);
            me.getStorage().dispatchEvent(event);
          });
        }

      } else if (!goog.isDef(arg2)) {
        this.tx_thread.exec(function (tx) {
          me.getExecutor(tx).clearByStores(df, [st_name]);
        }, [st_name], ydn.db.base.TransactionMode.READ_WRITE, 'clearByStores');

        if (store.dispatch_events) {
          df.addCallback(function (count) {
            var event = new ydn.db.events.StoreEvent(ydn.db.events.Types.DELETED,
                me.getStorage(), st_name, null, undefined);
            me.getStorage().dispatchEvent(event);
          });
        }

      } else {
        throw new ydn.error.ArgumentException('arg2');
      }
    }

  } else if (!goog.isDef(arg1) || goog.isArray(arg1) && goog.isString(arg1[0])) {
    var store_names = arg1 || this.schema.getStoreNames();
    this.tx_thread.exec(function(tx) {
      me.getExecutor(tx).clearByStores(df, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE, 'clearByStores');

    for (var j = 0; j < store_names.length; j++) {
      var store_j = this.schema.getStore(store_names[j]);
      if (store_j.dispatch_events) {
        df.addCallback(function (count) {
          var event = new ydn.db.events.StoreEvent(ydn.db.events.Types.DELETED,
              me.getStorage(), store_names[j], null, undefined);
          me.getStorage().dispatchEvent(event);
        });
      }
    }

  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};



/** @override */
ydn.db.core.DbOperator.prototype.toString = function() {
  var s = 'TxStorage:' + this.getStorage().getName();
//  if (goog.DEBUG) {
//    var scope = this.getScope();
//    scope = scope ? '[' + scope + ']' : '';
//    var mu = this.getMuTx().getScope();
//    var mu_scope = mu ? '[' + mu + ']' : '';
//    return s + ':' + this.q_no_ + scope + ':' + this.getTxNo() + mu_scope;
//  }
  return s;
};




