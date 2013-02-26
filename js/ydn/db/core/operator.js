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
goog.require('ydn.db.core.IOperator');
goog.require('ydn.db.ISyncOperator');
goog.require('ydn.db.tr.DbOperator');
goog.require('ydn.error.NotSupportedException');
goog.require('ydn.debug.error.ArgumentException');



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
 * @param {ydn.db.tr.IThread} sync_thread
 * @implements {ydn.db.core.IOperator}
 * @implements {ydn.db.ISyncOperator}
 * @constructor
 * @extends {ydn.db.tr.DbOperator}
*/
ydn.db.core.DbOperator = function(storage, schema, tx_thread, sync_thread) {
  goog.base(this, storage, schema, tx_thread, sync_thread);
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
      throw new ydn.debug.error.ArgumentException('too many arguments.');
    }
    store_names = this.schema.getStoreNames();

    var dfl = new goog.async.Deferred();
    this.logger.finer('countStores: ' + ydn.json.stringify(store_names));
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
      throw new ydn.debug.error.ArgumentException('too many arguments.');
    }

    store_names = store_name;
    for (var i = 0; i < store_names.length; i++) {
      if (!this.schema.hasStore(store_names[i])) {
        throw new ydn.db.NotFoundError(store_names[i]);
      }
    }

    //console.log('waiting to count');
    this.logger.finer('countStores: ' + ydn.json.stringify(store_names));
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
        throw new ydn.debug.error.ArgumentException("Invalid key range or index");
      }
      key_range = ydn.db.KeyRange.parseIDBKeyRange(index_or_keyrange);
    } else {
      throw new ydn.debug.error.ArgumentException('key range');
    }

    this.logger.finer('countKeyRange: ' + store_names[0] + ' ' +
      (index_name ? index_name : '') + ydn.json.stringify(key_range));
    this.tx_thread.exec(function (tx) {
      me.getExecutor(tx).countKeyRange(df, store_names[0], key_range, index_name);
    }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'countKeyRange');

  } else {
    throw new ydn.debug.error.ArgumentException("Invalid store name or store names.");
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
        throw new ydn.debug.error.ArgumentException('Store: ' +
          k_store_name + ' not found.');
      }
    }

    var kid = k.getId();
    this.logger.finer('getById: ' + k_store_name + ':' + kid);
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
        throw new ydn.debug.error.ArgumentException('Store: ' + store_name +
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
      this.logger.finer('getById: ' + store_name + ':' + ydn.json.stringify(key_range));
      this.tx_thread.exec(function(tx) {
        me.getExecutor(tx).listByKeyRange(list_df, store_name, key_range, false, 1, 0);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');

    } else {
      var id = arg2;
      this.logger.finer('getById: ' + store_name + ':' + id);


      var req_df = df;
      if (ydn.db.base.SYNC && store.sync) {
        req_df = new goog.async.Deferred();
        req_df.addCallbacks(function(record) {
          if (goog.isFunction(store.syncObject)) { // inject syncObject function from sync module.
            store.syncObject(ydn.db.schema.Store.SyncMethod.GET, function(x) {
              df.callback(x);
            }, record, id);
          }
        }, function(e) {
          df.errback(e);
        });
      }

      this.tx_thread.exec(function(tx) {
        me.getExecutor(tx).getById(req_df, store_name, id);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');

    }

  } else {
    throw new ydn.debug.error.ArgumentException();
  }

  return df;
};


/**
 *
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.keys = function(opt_store_name, arg1,
     arg2, arg3, arg4, arg5) {
  var me = this;

  /**
   * @type {number}
   */
  var limit;
  /**
   * @type {number}
   */
  var offset;
  /**
   * @type {ydn.db.IDBKeyRange}
   */
  var range = null;
  /**
   * @type {boolean}
   */
  var reverse = false;
  /**
   *
   * @type {string}
   */
  var store_name = /** @type {string} */ (opt_store_name);

  var store = this.schema.getStore(store_name);

  if (goog.DEBUG) {
    if (!goog.isString(store_name)) {
      throw new ydn.debug.error.ArgumentException('store_name must be a string');
    }
    if (!this.schema.isAutoSchema()) {
      if (!store) {
        throw new ydn.db.NotFoundError(store_name);
      }
      if (goog.isString(arg1)) {
        var index = store.getIndex(arg1);
        if (!index) {
          throw new ydn.db.NotFoundError('index: ' + arg1 + ' in store: ' + store_name);
        }
      }
    }
  }

  if (this.schema.isAutoSchema() && !store) {
    return goog.async.Deferred.succeed([]);
  }

  var df = new goog.async.Deferred();

  if (goog.isString(arg1)) { // index key range
    var index_name = arg1;
    if (goog.DEBUG) {
      var msg = ydn.db.KeyRange.validate(/** @type {KeyRangeJson} */ (arg2));
      if (msg) {
        throw new ydn.debug.error.ArgumentException('invalid key range: ' +
          arg2 + ' ' + msg);
      }
    }
    range = ydn.db.KeyRange.parseKeyRange(/** @type {KeyRangeJson} */ (arg2));

    if (goog.isNumber(arg3)) {
      limit = arg3;
    } else if (!goog.isDef(arg3)) {
      limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    } else {
      throw new ydn.debug.error.ArgumentException('limit must be a number');
    }
    if (goog.isNumber(arg4)) {
      offset = arg4;
    } else if (!goog.isDef(arg4)) {
      offset = 0;
    } else {
      throw new ydn.debug.error.ArgumentException('offset must be a number');
    }
    if (goog.isDef(arg5)) {
      if (goog.isBoolean) {
        reverse = arg5;
      } else {
        throw new ydn.debug.error.ArgumentException('reverse must be a boolean');
      }
    }
    this.logger.finer('keysByIndexKeyRange: ' + store_name);
    this.tx_thread.exec(function (tx) {
      me.getExecutor(tx).keysByIndexKeyRange(df, store_name, index_name,
        range, reverse, limit, offset, false);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'keysByIndexKeyRange');
  } else {
    if (goog.DEBUG) {
      var msg = ydn.db.KeyRange.validate(arg1);
      if (msg) {
        throw new ydn.debug.error.ArgumentException('invalid key range: ' +
          arg1 + ' ' + msg);
      }
    }
    range = ydn.db.KeyRange.parseKeyRange(arg1);
    if (goog.isNumber(arg2)) {
      limit = arg2;
    } else if (!goog.isDef(arg2)) {
      limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    } else {
      throw new ydn.debug.error.ArgumentException('limit must be a number');
    }
    if (goog.isNumber(arg3)) {
      offset = arg3;
    } else if (!goog.isDef(arg3)) {
      offset = 0;
    } else {
      throw new ydn.debug.error.ArgumentException('offset must be a number');
    }
    if (goog.isDef(arg4)) {
      if (goog.isBoolean(arg4)) {
        reverse = arg4;
      } else {
        throw new ydn.debug.error.ArgumentException('reverse must be a boolean');
      }
    }
    this.logger.finer('keysByKeyRange: ' + store_name);
    this.tx_thread.exec(function (tx) {
      me.getExecutor(tx).keysByKeyRange(df, store_name, range, reverse, limit, offset);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'keysByKeyRange');

  }

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.values = function(arg1, arg2, arg3, arg4, arg5, arg6) {

  var me = this;
  var df = ydn.db.base.createDeferred();

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
  var reverse = false;

  if (goog.isString(arg1)) {
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    if (!store) {
      if (this.schema.isAutoSchema()) {
        return goog.async.Deferred.succeed([]);
      } else {
        throw new ydn.db.NotFoundError(store_name);
      }
    }

    if (goog.isArray(arg2)) {
      if (goog.DEBUG && (goog.isDef(arg3) || goog.isDef(arg4))) {
        throw new ydn.debug.error.ArgumentException('too many input arguments');
      }
      var ids = arg2;
      this.logger.finer('listByIds: ' + store_name + ' ' +
        ids.length + ' ids');
      this.tx_thread.exec(function(tx) {
        me.getExecutor(tx).listByIds(df, store_name, ids);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByIds');
    } else if (goog.isString(arg2)) { // index name
      var index_name = arg2;
      if (goog.DEBUG) {
        var msg = ydn.db.KeyRange.validate(/** @type {KeyRangeJson} */ (arg3));
        if (msg) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
            arg3 + ' ' + msg);
        }
      }
      var range = ydn.db.KeyRange.parseKeyRange(/** @type {KeyRangeJson} */ (arg3));
      if (!goog.isDef(arg4)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg4)) {
        limit = arg4;
      } else {
        throw new ydn.debug.error.ArgumentException('limit must be a number.');
      }
      if (!goog.isDef(arg5)) {
        offset = 0;
      } else if (goog.isNumber(arg5)) {
        offset = arg5;
      } else {
        throw new ydn.debug.error.ArgumentException('offset must be a number.');
      }
      if (goog.isBoolean(arg6)) {
        reverse = arg6;
      } else if (goog.isDef(arg6)) {
        throw new ydn.debug.error.ArgumentException('reverse must be a boolean, but ' + arg6);
      }
      this.logger.finer('listByIndexKeyRange: ' + store_name + ':' + index_name);

      // inject sync module function.
      if (ydn.db.base.SYNC && goog.isFunction(store.syncObjects) && store.sync &&
          offset == 0 && reverse == true) {
        store.syncObjects(ydn.db.schema.Store.SyncMethod.LIST_BY_UPDATED, function() {
          me.sync_thread.exec(function (tx) {
            me.getExecutor(tx).listByIndexKeyRange(df, store_name, index_name,
                range, reverse, limit, offset, false);
          }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByIndexKeyRange');
        }, []);

      } else {
        this.tx_thread.exec(function (tx) {
          me.getExecutor(tx).listByIndexKeyRange(df, store_name, index_name,
              range, reverse, limit, offset, false);
        }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByIndexKeyRange');
      }

    } else {
      if (goog.DEBUG) {
        var msg = ydn.db.KeyRange.validate(arg2);
        if (msg) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
            arg2 + ' ' + msg);
        }
      }
      var range = ydn.db.KeyRange.parseKeyRange(arg2);
      if (!goog.isDef(arg3)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg3)) {
        limit = arg3;
      } else {
        throw new ydn.debug.error.ArgumentException('limit must be a number.');
      }
      if (!goog.isDef(arg4)) {
        offset = 0;
      } else if (goog.isNumber(arg4)) {
        offset = arg4;
      } else {
        throw new ydn.debug.error.ArgumentException('offset must be a number.');
      }
      if (goog.isDef(arg5)) {
        if (goog.isBoolean(arg5)) {
          reverse = arg5;
        } else {
          throw new ydn.debug.error.ArgumentException('reverse must be a boolean, but ' + arg5);
        }
      }
      this.logger.finer((range ? 'listByKeyRange: ' : 'listByStore: ') + store_name);

      // inject sync module function.
      if (ydn.db.base.SYNC && goog.isFunction(store.syncObjects) && store.sync &&
          offset == 0 && reverse == false) {
        store.syncObjects(ydn.db.schema.Store.SyncMethod.LIST_BY_ASCENDING_KEY, function() {
          me.tx_thread.exec(function (tx) {
            me.getExecutor(tx).listByKeyRange(df, store_name, range, reverse,
                limit, offset);
          }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByKeyRange');
        }, []);
      } else if (ydn.db.base.SYNC && goog.isFunction(store.syncObjects) && store.sync &&
            offset == 0 && reverse == true) {
          store.syncObjects(ydn.db.schema.Store.SyncMethod.LIST_BY_DESCENDING_KEY, function() {
            me.tx_thread.exec(function (tx) {
              me.getExecutor(tx).listByKeyRange(df, store_name, range, reverse,
                  limit, offset);
            }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByKeyRange');
          }, []);
      } else {
        this.tx_thread.exec(function (tx) {
          me.getExecutor(tx).listByKeyRange(df, store_name, range, reverse,
              limit, offset);
        }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listByKeyRange');

      }


    }
  } else if (goog.isArray(arg1)) {
    if (arg1[0] instanceof ydn.db.Key) {
      var store_names = [];
      /**
       * @type {!Array.<!ydn.db.Key>}
       */
      var keys = /** @type {!Array.<!ydn.db.Key>} */ (arg1);
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
            throw new ydn.debug.error.ArgumentException('Store: ' + i_store_name +
              ' not found.');
          }
        }
        if (!goog.array.contains(store_names, i_store_name)) {
          store_names.push(i_store_name);
        }
      }
      this.logger.finer('listByKeys: ' + ydn.json.stringify(store_names) +
          ' ' + keys.length + ' keys');
      this.tx_thread.exec(function(tx) {
        me.getExecutor(tx).listByKeys(df, keys);
      }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'listByKeys');
    } else {
      throw new ydn.debug.error.ArgumentException('must be array of ydn.db.Key');
    }
  } else {
    throw new ydn.debug.error.ArgumentException();
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
    throw new ydn.debug.error.ArgumentException('store name');
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
    this.logger.finer('Adding object store: ' + store_name);
    this.addStoreSchema(store);

  } else if (this.schema.isAutoSchema() && goog.isObject(store_name_or_schema)) {
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
    throw new ydn.debug.error.ArgumentException(
        'key cannot provide while in-line key ' + 'is in used.');
  } else if (store.autoIncrement && goog.isDef(opt_keys)) {
    // The object store uses in-line keys or has a key generator, and a key
    // parameter was provided.
    throw new ydn.debug.error.ArgumentException('key cannot provide while ' +
        'autoIncrement is true.');
  } else if (!goog.isString(store.keyPath) && !store.autoIncrement &&
      !goog.isDef(opt_keys)) {
    // The object store uses out-of-line keys and has no key generator, and no
    // key parameter was provided.
    throw new ydn.debug.error.ArgumentException('out-of-line key must be provided.');
  }

  if (goog.isArray(value)) {
    var objs = value;
    var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
    //console.log('waiting to putObjects');
    this.logger.finer('addObjects: ' + store_name +
      ' ' + objs.length + ' objects');
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

    this.logger.finer('addObject: ' + store_name + ' ' + key);
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
    throw new ydn.debug.error.ArgumentException();
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
    throw new ydn.debug.error.ArgumentException('store name');
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
    this.logger.finer('Adding object store: ' + store_name);
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
    throw new ydn.debug.error.ArgumentException(
      'key cannot provide while in-line key ' + 'is in used.');
  } else if (store.autoIncrement && goog.isDef(opt_keys)) {
    // The object store uses in-line keys or has a key generator, and a key
    // parameter was provided.
    throw new ydn.debug.error.ArgumentException('key cannot provide while ' +
      'autoIncrement is true.');
  } else if (!goog.isString(store.keyPath) && !store.autoIncrement &&
    !goog.isDef(opt_keys)) {
    // The object store uses out-of-line keys and has no key generator, and no
    // key parameter was provided.
    throw new ydn.debug.error.ArgumentException('out-of-line key must be provided.');
  }

  if (goog.isArray(value)) {
    var objs = value;
    var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
    this.logger.finer('putObjects: ' + store_name + ' ' +
      objs.length + ' objects');
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
    this.logger.finer('putObject: ' + store_name + ' ' + key);
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
    throw new ydn.debug.error.ArgumentException();
  }

  return df;

};


/**
 * Dump object into the database. Use only by synchronization process when updating from
 * server.
 * This is friendly module use only.
 * @param {string} store_name store name.
 * @param {!Array.<Object>} objs objects.
 * @return {!goog.async.Deferred} df return no result.
 * @override
 */
ydn.db.core.DbOperator.prototype.dump = function(store_name, objs) {
  var df = new goog.async.Deferred();
  var me = this;
  var on_completed = function(t, e) {
    if (t == ydn.db.base.TransactionEventTypes.COMPLETE) {
      df.callback();
    } else {
      df.errback();
    }
  };
  this.sync_thread.exec(function(tx) {
    me.getExecutor(tx).putObjects(new goog.async.Deferred(), store_name, objs);
  }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'dump', on_completed);
  return df;
};


/**
 * List records from the database. Use only by synchronization process when updating from
 * server.
 * This is friendly module use only.
 * @param {string} store_name
 * @param {?string} index_name
 * @param {?IDBKeyRange} key_range
 * @param {boolean} reverse
 * @param {number} limit
 * @return {goog.async.Deferred} df
 * @override
 */
ydn.db.core.DbOperator.prototype.list = function(store_name, index_name, key_range, reverse, limit) {
  var df = new goog.async.Deferred();
  var me = this;
  var out;
  var on_completed = function(t, e) {
    if (t == ydn.db.base.TransactionEventTypes.COMPLETE) {
      df.callback(out);
    } else {
      df.errback(e);
    }
    out = null;
  };
  var req_df = new goog.async.Deferred();
  req_df.addBoth(function(x) {
    out = x;
  });
  if (goog.isString(index_name)) {
    var index = index_name;
    this.sync_thread.exec(function (tx) {
      me.getExecutor(tx).listByIndexKeyRange(req_df, store_name, index,
        key_range, reverse, limit, 0, false);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'list', on_completed);
  } else {
    this.sync_thread.exec(function (tx) {
      me.getExecutor(tx).listByKeyRange(req_df, store_name,
          key_range, reverse, limit, 0);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'list', on_completed);
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
          throw new ydn.debug.error.ArgumentException('index: ' + arg2 + ' not found in ' + st_name);
        }
        if (goog.isObject(arg3) || goog.isNull(arg3)) {
          var key_range = ydn.db.KeyRange.parseIDBKeyRange(
            /** @type {KeyRangeJson} */ (arg3));
          this.logger.finer('clearByIndexKeyRange: ' + st_name + ':' +
            index.getName() + ' ' + ydn.json.stringify(key_range));
          this.tx_thread.exec(function (tx) {
            me.getExecutor(tx).clearByIndexKeyRange(df, st_name, index.getName(), key_range);
          }, [st_name], ydn.db.base.TransactionMode.READ_WRITE, 'clearByIndexKeyRange');
        } else {
          throw new ydn.debug.error.ArgumentException('arg3');
        }
      } else {
        throw new ydn.debug.error.ArgumentException('arg2 must be string');
      }
    } else {
      if (goog.isObject(arg2) || goog.isNull(arg2)) {
        var key_range = ydn.db.KeyRange.parseIDBKeyRange(
          /** @type {KeyRangeJson} */ (arg2));
        this.logger.finer('clearByKeyRange: ' + st_name + ':' +
          ydn.json.stringify(key_range));
        this.tx_thread.exec(function (tx) {
          me.getExecutor(tx).clearByKeyRange(df, st_name, key_range);
        }, [st_name], ydn.db.base.TransactionMode.READ_WRITE, 'clearByKeyRange');
      } else if (goog.isString(arg2) || goog.isNumber(arg2) || goog.isArray(arg2)) {
        var id = /** @type {(!Array|number|string)} */  (arg2);
        this.logger.finer('clearById: ' + st_name + ':' + id);
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
        this.logger.finer('clearByStore: ' + st_name);
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
        throw new ydn.debug.error.ArgumentException('arg2');
      }
    }

  } else if (!goog.isDef(arg1) || goog.isArray(arg1) && goog.isString(arg1[0])) {
    var store_names = arg1 || this.schema.getStoreNames();
    this.logger.finer('clearByStores: ' + ydn.json.stringify(store_names));
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
    throw new ydn.debug.error.ArgumentException();
  }

  return df;
};



/** @override */
ydn.db.core.DbOperator.prototype.toString = function() {
  var s = 'DbOperator:' + this.getStorage().getName();
//  if (goog.DEBUG) {
//    var scope = this.getScope();
//    scope = scope ? '[' + scope + ']' : '';
//    var mu = this.getMuTx().getScope();
//    var mu_scope = mu ? '[' + mu + ']' : '';
//    return s + ':' + this.q_no_ + scope + ':' + this.getTxNo() + mu_scope;
//  }
  return s;
};




