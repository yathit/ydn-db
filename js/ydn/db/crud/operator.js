/**
* @fileoverview Provide atomic CRUD database operations on a transaction queue.
*
*
*/


goog.provide('ydn.db.crud.DbOperator');
goog.require('ydn.db.tr.AtomicSerial');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.db');
goog.require('ydn.db.Key');
goog.require('ydn.db.crud.IOperator');
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
 * @param {!ydn.db.crud.Storage} storage base storage object.
 * @param {!ydn.db.schema.Database} schema
 * @param {ydn.db.tr.IThread} tx_thread
 * @param {string} scope_name
 * @param {ydn.db.tr.IThread} sync_thread
 * @implements {ydn.db.crud.IOperator}
 * @implements {ydn.db.ISyncOperator}
 * @constructor
 * @extends {ydn.db.tr.DbOperator}
*/
ydn.db.crud.DbOperator = function(storage, schema, scope_name, tx_thread, sync_thread) {
  goog.base(this, storage, schema, scope_name, tx_thread, sync_thread);
};
goog.inherits(ydn.db.crud.DbOperator, ydn.db.tr.DbOperator);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.DbOperator.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.crud.DbOperator');




/**
 *
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.count = function(store_name, index_or_keyrange,
                                                 index_key_range, unique) {
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
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      me.getExecutor().countStores(tx, tx_no, cb, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'countStores');

    df.addCallbacks(function(count) {
      var total = goog.array.reduce(count, function(p, x) {
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
        throw new ydn.debug.error.ArgumentException('store name "' +
          store_names[i] + '" at ' + i + ' not found.');
      }
    }

    //console.log('waiting to count');
    this.logger.finer('countStores: ' + ydn.json.stringify(store_names));
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      //console.log('counting');
      me.getExecutor().countStores(tx, tx_no, cb, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'countStores');
  } else if (goog.isString(store_name)) {
    if (!this.schema.hasStore(store_name)) {
      throw new ydn.debug.error.ArgumentException('store name "' + store_name +
        '" not found.');
    }
    if (goog.DEBUG && goog.isDef(unique) && !goog.isBoolean(unique)) {
      throw new TypeError('unique value "' + unique +
        '" must be boolean, but found ' + typeof unique + '.');
    }
    store_names = [store_name];

    if (goog.isString(index_or_keyrange)) {
      index_name = index_or_keyrange;
      if (goog.DEBUG) {
        var msg1 = ydn.db.KeyRange.validate(
          /** @type {KeyRangeJson} */ (index_or_keyrange));
        if (msg1) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
            ydn.json.toShortString(index_key_range) + ' ' + msg1);
        }
      }
      key_range = ydn.db.KeyRange.parseIDBKeyRange(
        /** @type {ydn.db.IDBKeyRange} */ (index_key_range));
    } else if (goog.isObject(index_or_keyrange) ||
      !goog.isDef(index_or_keyrange)) {
      if (goog.isDef(index_key_range)) {
        throw new ydn.debug.error.ArgumentException(
          'Invalid key range "' + ydn.json.toShortString(index_key_range) +
            '"');
      }
      if (goog.DEBUG) {
        var msg = ydn.db.KeyRange.validate(
          /** @type {KeyRangeJson} */ (index_or_keyrange));
        if (msg) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
            ydn.json.toShortString(index_key_range) + ' ' + msg);
        }
      }
      key_range = ydn.db.KeyRange.parseIDBKeyRange(index_or_keyrange);
    } else {
      throw new ydn.debug.error.ArgumentException('key range must be an ' +
        'object, but ' + ydn.json.toShortString(index_key_range) + ' of type ' +
        typeof index_or_keyrange + ' found.');
    }

    this.logger.finer('countKeyRange: ' + store_names[0] + ' ' +
      (index_name ? index_name : '') + ydn.json.stringify(key_range));
    this.tx_thread.exec(df, function (tx, tx_no, cb) {
      me.getExecutor().countKeyRange(tx, tx_no, cb, store_names[0], key_range,
        index_name, !!unique);
    }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'countKeyRange');

  } else {
    throw new ydn.debug.error.ArgumentException(
      "Invalid store name or store names.");
  }

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.get = function(arg1, arg2) {

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
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      me.getExecutor().getById(tx, tx_no, cb, k_store_name, kid);
    }, [k_store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');
  } else if (goog.isString(arg1) && goog.isDef(arg2)) {
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    if (!store) {
      if (this.schema.isAutoSchema()) {
        return goog.async.Deferred.succeed(undefined);
      } else {
        throw new ydn.debug.error.ArgumentException('Store name "' +
          store_name + '" not found.');
      }
    }
    if (arg2 instanceof ydn.db.IDBKeyRange || arg2 instanceof ydn.db.KeyRange) {
      var list_df = new goog.async.Deferred();
      list_df.addCallbacks(function(x) {
        df.callback(x[0]); // undefined OK.
      }, function(e) {
        df.errback(e);
      });
      if (goog.DEBUG) {
        var msg = ydn.db.KeyRange.validate(/** @type {KeyRangeJson} */ (arg2));
        if (msg) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
            arg2 + ' ' + msg);
        }
      }
      var key_range = ydn.db.KeyRange.parseIDBKeyRange(arg2);
      this.logger.finer('getById: ' + store_name + ':' +
        ydn.json.stringify(key_range));
      this.tx_thread.exec(list_df, function(tx, tx_no, cb) {
        me.getExecutor().listByKeyRange(tx, tx_no, cb, store_name, key_range, false,
          1, 0);
      }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');

    } else {
      var id = arg2;
      this.logger.finer('getById: ' + store_name + ':' + id);

      if (ydn.db.base.USE_HOOK) {
        var req_df = new goog.async.Deferred();
        this.tx_thread.exec(req_df, function(tx, tx_no, cb) {
          me.getExecutor().getById(tx, tx_no, cb, store_name, id);
        }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');

        req_df.addCallbacks(function (record) {
          store.postHook(ydn.db.schema.Store.SyncMethod.GET, {}, function (x) {
            df.callback(x);
          }, record, id);
        }, function (e) {
          df.errback(e);
        });

      } else {
        this.tx_thread.exec(df, function(tx, tx_no, cb) {
          me.getExecutor().getById(tx, tx_no, cb, store_name, id);
        }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getById');
      }

    }

  } else {
    throw new ydn.debug.error.ArgumentException(
      'get require valid input arguments.');
  }

  return df;
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.keys = function(opt_store_name, arg1,
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
      throw new ydn.debug.error.ArgumentException(
        'store name must be a string, ' +
        'but ' + store_name + ' of type ' + typeof store_name + ' is not.');
    }
    if (!this.schema.isAutoSchema()) {
      if (!store) {
        throw new ydn.debug.error.ArgumentException('store name "' +
          store_name + '" not found.');
      }
      if (goog.isString(arg1)) {
        var index = store.getIndex(arg1);
        if (!index) {
          throw new ydn.debug.error.ArgumentException('index "' + arg1 +
            '" not found in store "' + store_name + '".');
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
    range = ydn.db.KeyRange.parseIDBKeyRange(
      /** @type {KeyRangeJson} */ (arg2));

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
        throw new ydn.debug.error.ArgumentException(
          'reverse must be a boolean');
      }
    }
    this.logger.finer('keysByIndexKeyRange: ' + store_name);
    this.tx_thread.exec(df, function (tx, tx_no, cb) {
      me.getExecutor().keysByIndexKeyRange(tx, tx_no, cb, store_name,
        index_name, range, reverse, limit, offset, false);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY,
      'keysByIndexKeyRange');
  } else {
    if (goog.DEBUG) {
      var msg = ydn.db.KeyRange.validate(arg1);
      if (msg) {
        throw new ydn.debug.error.ArgumentException('invalid key range: ' +
          arg1 + ' ' + msg);
      }
    }
    range = ydn.db.KeyRange.parseIDBKeyRange(arg1);
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
        throw new ydn.debug.error.ArgumentException(
          'reverse must be a boolean');
      }
    }
    this.logger.finer('keysByKeyRange: ' + store_name);
    this.tx_thread.exec(df, function (tx, tx_no, cb) {
      me.getExecutor().keysByKeyRange(tx, tx_no, cb, store_name, range, reverse, limit,
        offset);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'keysByKeyRange');

  }

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.values = function(arg1, arg2, arg3, arg4, arg5,
                                                   arg6) {

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
      this.tx_thread.exec(df, function(tx, tx_no, cb) {
        me.getExecutor().listByIds(tx, tx_no, cb, store_name, ids);
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
      var range = ydn.db.KeyRange.parseIDBKeyRange(
        /** @type {KeyRangeJson} */ (arg3));
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
        throw new ydn.debug.error.ArgumentException(
          'reverse must be a boolean, but ' + arg6);
      }
      this.logger.finer('listByIndexKeyRange: ' + store_name + ':' +
        index_name);

      // inject sync module function.
      if (ydn.db.base.USE_HOOK) {
        var opt = {
          index: index_name,
          reverse: reverse,
          offset: offset,
          limit: limit};
        store.preHook(ydn.db.schema.Store.SyncMethod.LIST, opt, function() {
          me.logger.finest('listByIndexKeyRange: continue from preHook');
          me.sync_thread.exec(df, function (tx, tx_no, cb) {
            me.getExecutor().listByIndexKeyRange(tx, tx_no, cb, store_name, index_name,
                range, reverse, limit, offset, false);
          }, [store_name], ydn.db.base.TransactionMode.READ_ONLY,
            'listByIndexKeyRange');
        }, 100);

      } else {
        this.tx_thread.exec(df, function (tx, tx_no, cb) {
          me.getExecutor().listByIndexKeyRange(tx, tx_no, cb, store_name, index_name,
              range, reverse, limit, offset, false);
        }, [store_name], ydn.db.base.TransactionMode.READ_ONLY,
          'listByIndexKeyRange');
      }

    } else {
      if (goog.DEBUG) {
        var msg = ydn.db.KeyRange.validate(arg2);
        if (msg) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
            arg2 + ' ' + msg);
        }
      }
      var range = ydn.db.KeyRange.parseIDBKeyRange(arg2);
      if (!goog.isDef(arg3)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg3)) {
        limit = arg3;
      } else {
        throw new ydn.debug.error.ArgumentException('limit must be a number, ' +
          'but ' + arg3 + ' is ' + typeof arg3);
      }
      if (!goog.isDef(arg4)) {
        offset = 0;
      } else if (goog.isNumber(arg4)) {
        offset = arg4;
      } else {
        throw new ydn.debug.error.ArgumentException(
          'offset must be a number, ' +  'but ' + arg4 + ' is ' + typeof arg4);
      }
      if (goog.isDef(arg5)) {
        if (goog.isBoolean(arg5)) {
          reverse = arg5;
        } else {
          throw new ydn.debug.error.ArgumentException('reverse must be a ' +
            'boolean, but ' + arg5 + ' is ' + typeof arg5);
        }
      }
      this.logger.finer((range ? 'listByKeyRange: ' : 'listByStore: ') +
        store_name);

      // inject sync module function.
      if (ydn.db.base.USE_HOOK) {
        var opt = {index: null, offset: offset, reverse: reverse};
        store.preHook(ydn.db.schema.Store.SyncMethod.LIST, opt, function() {
          me.tx_thread.exec(df, function (tx, tx_no, cb) {
            me.getExecutor().listByKeyRange(tx, tx_no, cb, store_name, range, reverse,
                limit, offset);
          }, [store_name], ydn.db.base.TransactionMode.READ_ONLY,
            'listByKeyRange');
        });
      } else {
        this.tx_thread.exec(df, function (tx, tx_no, cb) {
          me.getExecutor().listByKeyRange(tx, tx_no, cb, store_name, range, reverse,
              limit, offset);
        }, [store_name], ydn.db.base.TransactionMode.READ_ONLY,
          'listByKeyRange');

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
            throw new ydn.debug.error.ArgumentException('Store: ' +
              i_store_name + ' not found.');
          }
        }
        if (!goog.array.contains(store_names, i_store_name)) {
          store_names.push(i_store_name);
        }
      }
      this.logger.finer('listByKeys: ' + ydn.json.stringify(store_names) +
          ' ' + keys.length + ' keys');
      this.tx_thread.exec(df, function(tx, tx_no, cb) {
        me.getExecutor().listByKeys(tx, tx_no, cb, keys);
      }, store_names, ydn.db.base.TransactionMode.READ_ONLY, 'listByKeys');
    } else {
      throw new ydn.debug.error.ArgumentException('first argument' +
        'must be array of ydn.db.Key, but ' + arg1[0] + ' of ' +
        typeof arg1[0] + ' found.');
    }
  } else {
    throw new ydn.debug.error.ArgumentException('first argument ' + arg1 +
      ' is invalid.');
  }

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.add = function(store_name_or_schema, value,
                                               opt_keys) {

  var store_name = goog.isString(store_name_or_schema) ?
      store_name_or_schema : goog.isObject(store_name_or_schema) ?
      store_name_or_schema['name'] : undefined;
  if (!goog.isString(store_name)) {
    throw new ydn.debug.error.ArgumentException('store name ' + store_name +
      ' must be a string, but ' + typeof store_name);
  }

  var store = this.schema.getStore(store_name);
  if (!store) {
    if (!this.schema.isAutoSchema()) {
      throw new ydn.debug.error.ArgumentException('store name "' + store_name +
        '" not found.');
    }
    var schema = goog.isObject(store_name_or_schema) ?
        store_name_or_schema : {'name': store_name};

    // this is async process, but we don't need to wait for it.
    store = ydn.db.schema.Store.fromJSON(/** @type {!StoreSchema} */ (schema));
    this.logger.finer('Adding object store: ' + store_name);
    this.addStoreSchema(store);

  } else if (this.schema.isAutoSchema() &&
      goog.isObject(store_name_or_schema)) {
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
    throw new ydn.debug.error.ArgumentException('store name "' + store_name +
      '" not found.');
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
    throw new ydn.debug.error.ArgumentException(
      'out-of-line key must be provided.');
  }

  if (goog.isArray(value)) {
    var objs = value;
    var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
    //console.log('waiting to putObjects');
    this.logger.finer('addObjects: ' + store_name + ' ' + objs.length +
      ' objects');
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      //console.log('putObjects');
      me.getExecutor().addObjects(tx, tx_no, cb, store_name, objs, keys);
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
    var label = 'store: ' + store_name + ' key: ' +
      store.usedInlineKey() ? store.extractKey(obj) : key;

    this.logger.finer('addObject: ' + label);

    if (ydn.db.base.USE_HOOK) {
      var post_df = new goog.async.Deferred();
      var opt = {};
      store.preHook(ydn.db.schema.Store.SyncMethod.ADD, opt, function (obj) {
        if (goog.isObject(obj)) {
          me.logger.finest('addObject prehook: ' + label);
          me.tx_thread.exec(post_df, function (tx, tx_no, cb) {
            //console.log('putObjects');
            me.getExecutor().addObject(tx, tx_no, cb, store_name, obj, key);
          }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'addObject');
        } else {
          me.logger.finer('prehook reject add: ' + label);
          post_df.errback();
        }
      }, obj, key);

      post_df.addCallbacks(function (key) {  // todo: use chain
        df.callback(key);
      }, function (e) {
        df.errback(e);
      });

    } else {
      this.tx_thread.exec(df, function (tx, tx_no, cb) {
        me.getExecutor().addObject(tx, tx_no, cb, store_name, obj, key);
      }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObject');
    }

    if (store.dispatch_events) {
      df.addCallback(function(key) {
        var event = new ydn.db.events.RecordEvent(ydn.db.events.Types.CREATED,
          me.getStorage(), store.getName(), key, obj);
        me.getStorage().dispatchEvent(event);
      });
    }

  } else {
    throw new ydn.debug.error.ArgumentException('record must be an object or ' +
      'array list of objects' +
      ', but ' + value + ' of type ' + typeof value + ' found.');
  }

  return df;

};


/**
 *
 * @param {string|StoreSchema} store_name_or_schema
 * @return {ydn.db.schema.Store}
 * @private
 */
ydn.db.crud.DbOperator.prototype.getStore_ = function(store_name_or_schema) {

  var store_name = goog.isString(store_name_or_schema) ?
    store_name_or_schema : goog.isObject(store_name_or_schema) ?
    store_name_or_schema['name'] : undefined;
  if (!goog.isString(store_name)) {
    throw new ydn.debug.error.ArgumentException('store name must be a string');
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
ydn.db.crud.DbOperator.prototype.load = function(store_name_or_schema, data,
                                                 opt_delimiter) {

  var delimiter = opt_delimiter || ',';

  var store = this.getStore_(store_name_or_schema);
  var store_name = store.getName();

  var df = ydn.db.base.createDeferred();
  var me = this;

  this.tx_thread.exec(df, function(tx, tx_no, cb) {
    me.getExecutor().putData(tx, tx_no, cb, store_name, data, delimiter);
  }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putData');
  return df;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.put = function (arg1, value, opt_keys) {

  var df = ydn.db.base.createDeferred();
  var me = this;

  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {!ydn.db.Key}
     */
    var k = arg1;
    var k_s_name = k.getStoreName();
    var k_store = this.schema.getStore(k_s_name);
    if (!k_store) {
      throw new ydn.debug.error.ArgumentException('store "' + k_s_name +
        '" not found.');
    }
    if (k_store.usedInlineKey()) {
      var v_k = k_store.extractKey(value);
      if (goog.isDefAndNotNull(v_k)) {
        if (ydn.db.cmp(v_k, k.getId()) != 0) {
          throw new ydn.debug.error.ArgumentException('Inline key must be ' +
            k + ' but ' + v_k + ' found.');
        }
      } else {
        k_store.setKeyValue(value, k.getId());
      }
      return this.put(k_s_name, value);
    } else {
      return this.put(k_s_name, value, k.getId());
    }
  } else if (goog.isArray(arg1)) { // array of keys
    if (goog.isDef(opt_keys)) {
      throw new ydn.debug.error.ArgumentException('too many arguments');
    }
    var db_keys = /** @type {!Array.<!ydn.db.Key>} */ (arg1);
    if (goog.DEBUG && !goog.isDef(value)) {
      throw new ydn.debug.error.ArgumentException('record values required');
    }
    goog.asserts.assertArray(value, 'record values must also be in an array');
    var values = /** @type {!Array} */ (value);
    goog.asserts.assert(db_keys.length === values.length, 'number of keys ' +
      'and number of object must be same, but found ' + db_keys.length +
      ' vs. ' + values.length);
    var store_names = [];
    for (var i = 0, n = db_keys.length; i < n; i++) {
      var s_name = db_keys[i].getStoreName();
      if (goog.array.indexOf(store_names, s_name) == -1) {
        store_names.push(s_name);
      }
      var store = this.schema.getStore(s_name);
      if (!store) {
        throw new ydn.debug.error.ArgumentException('store "' + s_name +
          '" not found.');
      }
      if (store.usedInlineKey()) {
        store.setKeyValue(values[i], db_keys[i].getId());
      }
    }
    this.logger.finer('putByKeys: to ' + ydn.json.stringify(store_names) + ' ' +
      values.length + ' objects');
    this.tx_thread.exec(df, function (tx, tx_no, cb) {
      me.getExecutor().putByKeys(tx, tx_no, cb, values, db_keys);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE, 'putByKeys');
  } else if (goog.isString(arg1) || goog.isObject(arg1)) {

    var store = this.getStore_(arg1);
    var store_name = store.getName();

    // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBObjectStore#put
    if (store.usedInlineKey() && goog.isDef(opt_keys)) {
      // The object store uses in-line keys or has a key generator, and a key
      // parameter was provided.
      throw new ydn.debug.error.ArgumentException(
        'key cannot provide while in-line key ' + 'is in used.');
    } else if (store.autoIncrement && goog.isDef(opt_keys)) {
      // The object store uses in-line keys or has a key generator, and a key
      // parameter was provided.
      throw new ydn.debug.error.ArgumentException('key cannot provide while ' +
        'autoIncrement is true.');
    } else if (!store.usedInlineKey() && !store.autoIncrement &&
      !goog.isDef(opt_keys)) {
      // The object store uses out-of-line keys and has no key generator, and no
      // key parameter was provided.
      throw new ydn.debug.error.ArgumentException(
        'out-of-line key must be provided.');
    }

    if (goog.isArray(value)) {
      var objs = value;
      var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
      this.logger.finer('putObjects: ' + store_name + ' ' +
        objs.length + ' objects');
      this.tx_thread.exec(df, function (tx, tx_no, cb) {
        //console.log('putObjects');
        me.getExecutor().putObjects(tx, tx_no, cb, store_name, objs, keys);
      }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObjects');

      if (store.dispatch_events) {
        df.addCallback(function (keys) {
          var event = new ydn.db.events.StoreEvent(ydn.db.events.Types.UPDATED,
            me.getStorage(), store_name, keys, objs);
          me.getStorage().dispatchEvent(event);
        });
      }

    } else if (goog.isObject(value)) {
      var obj = value;
      var key = /** @type {number|string|undefined} */ (opt_keys);
      if (goog.DEBUG) {
        if (goog.isDef(key)) {
          goog.asserts.assert(ydn.db.Key.isValidKey(key), key +
            ' of type ' + (typeof key) + ' is invalid key for ' +
            ydn.json.toShortString(obj));
        } else if (!store.getAutoIncrement() && store.usedInlineKey()) {
          goog.asserts.assert(ydn.db.Key.isValidKey(store.extractKey(obj)),
            'in-line key on ' + store.getKeyPath() + ' must provided in ' +
              ydn.json.toShortString(obj));
        }
      }
      this.logger.finer('putObject: ' + store_name + ' ' + key);

      if (ydn.db.base.USE_HOOK) {
        var post_df = new goog.async.Deferred();
        var opt = {};
        store.preHook(ydn.db.schema.Store.SyncMethod.PUT, opt, function (obj) {
          goog.asserts.assertObject(obj);
          me.tx_thread.exec(df, function (tx, tx_no, cb) {
            //console.log('putObjects');
            me.getExecutor().putObject(tx, tx_no, cb, store_name, obj, key);
          }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObject');
        }, obj, key);

        post_df.addCallbacks(function (key) {  // todo: use chain
          df.callback(key);
        }, function (e) {
          df.errback(e);
        });

      } else {
        this.tx_thread.exec(df, function (tx, tx_no, cb) {
          me.getExecutor().putObject(tx, tx_no, cb, store_name, obj, key);
        }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'putObject');
      }

      if (store.dispatch_events) {
        df.addCallback(function (key) {
          var event = new ydn.db.events.RecordEvent(ydn.db.events.Types.UPDATED,
            me.getStorage(), store_name, key, obj);
          me.getStorage().dispatchEvent(event);
        });
      }

    } else {
      throw new ydn.debug.error.ArgumentException('put record value must be ' +
        'Object or array of Objects');
    }
  } else {
    throw new ydn.debug.error.ArgumentException('the first argument of put ' +
      'must be store name, store schema or array of keys.');
  }

  return df;

};


/**
 * Dump object into the database. Use only by synchronization process when
 * updating from
 * server.
 * This is friendly module use only.
 * @param {string} store_name store name.
 * @param {!Array.<Object>} objs objects.
 * @param {!Array.<Object>=} keys keys.
 * @return {!goog.async.Deferred} df return no result.
 * @override
 */
ydn.db.crud.DbOperator.prototype.dumpInternal = function(store_name, objs,
                                                         keys) {
  var df = new goog.async.Deferred();
  var me = this;
  var on_completed = function(t, e) {
    if (t == ydn.db.base.TransactionEventTypes.COMPLETE) {
      df.callback();
    } else {
      df.errback();
    }
  };
  this.sync_thread.exec(df, function(tx, tx_no, cb) {
    me.getExecutor().putObjects(tx, tx_no, cb, store_name, objs,
      keys);
  }, [store_name], ydn.db.base.TransactionMode.READ_WRITE, 'dumpInternal',
    on_completed);
  return df;
};


/**
 * List records from the database. Use only by synchronization process when
 * updating from server.
 * This is friendly module use only.
 * @param {string} store_name
 * @param {?string} index_name
 * @param {?IDBKeyRange|ydn.db.KeyRange} key_range
 * @param {boolean} reverse
 * @param {number} limit
 * @return {!goog.async.Deferred} df
 * @override
 */
ydn.db.crud.DbOperator.prototype.listInternal = function(store_name, index_name,
     key_range, reverse, limit) {
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
  var kr = ydn.db.KeyRange.parseIDBKeyRange(key_range);
  if (goog.isString(index_name)) {
    var index = index_name;
    this.sync_thread.exec(req_df, function (tx, tx_no, cb) {
      me.getExecutor().listByIndexKeyRange(tx, tx_no, cb, store_name, index,
        kr, reverse, limit, 0, false);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listInternal',
      on_completed);
  } else {
    this.sync_thread.exec(req_df, function (tx, tx_no, cb) {
      me.getExecutor().listByKeyRange(tx, tx_no, cb, store_name,
          kr, reverse, limit, 0);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'listInternal',
      on_completed);
  }
  return df;
};




/**
 * List keys from the database. Use only by synchronization process when
 * updating from server.
 * This is friendly module use only.
 * @param {string} store_name
 * @param {?string} index_name
 * @param {?IDBKeyRange} key_range
 * @param {boolean} reverse
 * @param {number} limit
 * @return {goog.async.Deferred} df
 * @override
 */
ydn.db.crud.DbOperator.prototype.keysInternal = function(store_name, index_name,
      key_range, reverse, limit) {
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
    this.sync_thread.exec(req_df, function (tx, tx_no, cb) {
      me.getExecutor().keysByIndexKeyRange(tx, tx_no, cb, store_name, index,
        key_range, reverse, limit, 0, false);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'keysInternal',
      on_completed);
  } else {
    this.sync_thread.exec(req_df, function (tx, tx_no, cb) {
      me.getExecutor().keysByKeyRange(tx, tx_no, cb, store_name,
        key_range, reverse, limit, 0);
    }, [store_name], ydn.db.base.TransactionMode.READ_ONLY, 'keysInternal',
      on_completed);
  }
  return df;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.clear = function(arg1, arg2, arg3) {

  if (goog.DEBUG && goog.isDef(arg3)) {
    throw new ydn.debug.error.ArgumentException('too many input arguments');
  }

  var df = ydn.db.base.createDeferred();
  var me = this;

  if (goog.isString(arg1)) {
    var st_name = arg1;
    var store = this.schema.getStore(st_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store name "' + st_name +
        '" not found.');
    }

    if (goog.isObject(arg2)) {
      var key_range = ydn.db.KeyRange.parseIDBKeyRange(
        /** @type {KeyRangeJson} */ (arg2));
      if (goog.isNull(key_range)) {
        throw new ydn.debug.error.ArgumentException('clear method requires' +
          ' a valid non-null KeyRange object.');
      }
      this.logger.finer('clearByKeyRange: ' + st_name + ':' +
        ydn.json.stringify(key_range));
      this.tx_thread.exec(df, function (tx, tx_no, cb) {
          me.getExecutor().clearByKeyRange(tx, tx_no, cb, st_name, key_range);
        }, [st_name], ydn.db.base.TransactionMode.READ_WRITE,
        'clearByKeyRange');
    } else if (!goog.isDef(arg2)) {
      this.logger.finer('clearByStore: ' + st_name);
      this.tx_thread.exec(df, function (tx, tx_no, cb) {
        me.getExecutor().clearByStores(tx, tx_no, cb, [st_name]);
      }, [st_name], ydn.db.base.TransactionMode.READ_WRITE, 'clearByStores');

    } else {
      throw new ydn.debug.error.ArgumentException('clear method requires' +
        ' a valid KeyRange object as second argument, but found ' + arg2 +
        ' of type ' + typeof arg2);
    }

  } else if (!goog.isDef(arg1) || goog.isArray(arg1) &&
      goog.isString(arg1[0])) {
    var store_names = arg1 || this.schema.getStoreNames();
    this.logger.finer('clearByStores: ' + ydn.json.stringify(store_names));
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      me.getExecutor().clearByStores(tx, tx_no, cb, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE, 'clearByStores');

  } else {
    throw new ydn.debug.error.ArgumentException('first argument "' + arg1 +
      '" is invalid.');
  }

  return df;
};



/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.remove = function(arg1, arg2, arg3) {

  var df = ydn.db.base.createDeferred();
  var me = this;

  if (goog.isString(arg1)) {
    /**
     * @type {string}
     */
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store name "' + store_name +
        '" not found.');
    }
    if (goog.isDef(arg3)) {
      if (goog.isString(arg2)) {
        var index = store.getIndex(arg2);
        if (!index) {
          throw new ydn.debug.error.ArgumentException('index: ' + arg2 +
            ' not found in ' + store_name);
        }
        if (goog.isObject(arg3) || goog.isNull(arg3)) {
          var key_range = ydn.db.KeyRange.parseIDBKeyRange(
            /** @type {KeyRangeJson} */ (arg3));
          this.logger.finer('removeByIndexKeyRange: ' + store_name + ':' +
            index.getName() + ' ' + store_name);
          this.tx_thread.exec(df, function (tx, tx_no, cb) {
            me.getExecutor().removeByIndexKeyRange(tx, tx_no, cb, store_name,
              index.getName(), key_range);
          }, [store_name], ydn.db.base.TransactionMode.READ_WRITE,
            'removeByIndexKeyRange');
        } else {
          throw new ydn.debug.error.ArgumentException('key range ' + arg3 +
            ' is invalid type "' + typeof arg3 + '".');
        }
      } else {
        throw new ydn.debug.error.ArgumentException('index name "' + arg2 +
          '" must be a string, but ' + typeof arg2 + ' found.');
      }
    } else {
      if (goog.isString(arg2) || goog.isNumber(arg2) ||
        goog.isArrayLike(arg2) || arg2 instanceof Date) {
        var id = /** @type {(!Array|number|string)} */  (arg2);
        this.logger.finer('removeById: ' + store_name + ':' + id);
        if (ydn.db.base.USE_HOOK) {
          var post_df = new goog.async.Deferred();
          var opt = {};
          store.preHook(ydn.db.schema.Store.SyncMethod.REMOVE, opt,
              function (server_id) {
            if (server_id === id) {
              me.tx_thread.exec(post_df, function (tx, tx_no, cb) {
                  me.getExecutor().removeById(tx, tx_no, cb, store_name, id);
                }, [store_name], ydn.db.base.TransactionMode.READ_WRITE,
                'removeById');
            } else {
              post_df.callback(0); // number of remove is 0.
            }
          }, null, id);
          post_df.addCallbacks(function (key) {
            df.callback(key);
          }, function (e) {
            df.errback(e);
          });
        } else {
          this.tx_thread.exec(df, function (tx, tx_no, cb) {
            me.getExecutor().removeById(tx, tx_no, cb, store_name, id);
          }, [store_name], ydn.db.base.TransactionMode.READ_WRITE,
            'removeById');
        }

        if (store.dispatch_events) {
          df.addCallback(function (key) {
            var event = new ydn.db.events.RecordEvent(
              ydn.db.events.Types.DELETED,
              me.getStorage(), store_name, key, undefined);
            me.getStorage().dispatchEvent(event);
          });
        }

      } else if (goog.isObject(arg2)) {
        var key_range = ydn.db.KeyRange.parseIDBKeyRange(
          /** @type {KeyRangeJson} */ (arg2));
        this.logger.finer('removeByKeyRange: ' + store_name + ':' +
          ydn.json.stringify(key_range));
        this.tx_thread.exec(df, function (tx, tx_no, cb) {
            me.getExecutor().removeByKeyRange(tx, tx_no, cb, store_name, key_range);
          }, [store_name], ydn.db.base.TransactionMode.READ_WRITE,
          'removeByKeyRange');

        if (store.dispatch_events) {
          df.addCallback(function (key) {
            var event = new ydn.db.events.StoreEvent(
                ydn.db.events.Types.DELETED,
                me.getStorage(), store_name, key, undefined);
            me.getStorage().dispatchEvent(event);
          });
        }
      } else {
        throw new ydn.debug.error.ArgumentException(
          'Invalid key or key range "' + arg2 + '" of type ' + typeof arg2);
      }
    }
  } else if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {!ydn.db.Key}
     */
    var key = arg1;
    this.tx_thread.exec(df, function (tx, tx_no, cb) {
          me.getExecutor().removeById(tx, tx_no, cb, key.getStoreName(),
              arg1.getId());
        }, [key.getStoreName()], ydn.db.base.TransactionMode.READ_WRITE,
        'removeByKey');
  } else if (goog.isArray(arg1)) {
    /**
     * @type {!Array.<!ydn.db.Key>}
     */
    var arr = arg1;
    var store_names = [];
    for (var i = 0, n = arr.length; i < n; i++) {
      if (goog.DEBUG && !(arr[i] instanceof ydn.db.Key)) {
        throw new ydn.debug.error.ArgumentException('key list element at ' + i +
            ' of ' + n + ' must be yn.db.Key, but "' +
            ydn.json.toShortString(arg1[i]) +
            '" (' + goog.typeOf(arg1[i]) + ') ' +
            'is not ydn.db.Key.');
      }
      var st = arr[i].getStoreName();
      if (goog.array.indexOf(store_names, st) == -1) {
        store_names.push(st);
      }
    }
    if (store_names.length < 1) {
      throw new ydn.debug.error.ArgumentException('at least one valid key ' +
          'required in key list "' + ydn.json.toShortString(arg1) + '"');
    }
    this.tx_thread.exec(df, function (tx, tx_no, cb) {
          me.getExecutor().removeByKeys(tx, tx_no, cb, arr);
        }, store_names, ydn.db.base.TransactionMode.READ_WRITE,
        'removeByKeys');
  } else {
    throw new ydn.debug.error.ArgumentException('first argument requires ' +
      'store name (string), key (ydn.db.Key) or list of keys (array) , but "' +
      ydn.json.toShortString(arg1) + '" (' + goog.typeOf(arg1) + ') found.');
  }

  return df;
};



/** @override */
ydn.db.crud.DbOperator.prototype.toString = function() {
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




