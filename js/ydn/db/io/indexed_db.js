// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Implements ydn.db.QueryService with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.IndexedDb');
goog.require('goog.async.DeferredList');
goog.require('ydn.db.IndexedDbWrapper');
goog.require('ydn.db.Query');
goog.require('ydn.json');
goog.require('ydn.error');


/**
 * @see goog.db.IndexedDb
 * @see ydn.db.Storage for schema defination
 * @implements {ydn.db.QueryService}
 * @param {string} dbname name of database.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @extends {ydn.db.IndexedDbWrapper}
 * @constructor
 */
ydn.db.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.IndexedDb, ydn.db.IndexedDbWrapper);


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.IndexedDb.DEBUG = goog.DEBUG && (ydn.db.IndexedDbWrapper.DEBUG || false);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.IndexedDb.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.IndexedDb');



/**
 * Execute GET request either storing result to tx or callback to df.
 * @param {IDBTransaction} tx active transaction object.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {string} store_name table name.
 * @param {string|number} id id to get.
 * @private
 */
ydn.db.IndexedDb.prototype.executeGet_ = function(tx, df, store_name, id) {
  var me = this;

  var store = tx.objectStore(store_name);
  var request = store.get(id);

  request.onsuccess = function(event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    df.callback(event.target.result);
  };

  request.onerror = function(event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    me.logger.warning('Error retrieving ' + id + ' in ' + store_name + ' ' +
        event.message);
    df.errback(event);
  };
};



/**
 * Execute GET request callback results to df.
 * @param {IDBTransaction} tx active transaction object.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {string} store_name table name.
 * @param {!Array.<string|number>} ids id to get.
 * @throws {ydn.db.YdnDbValidKeyException}
 * @throws {ydn.error.InternalError}
 * @private
 */
ydn.db.IndexedDb.prototype.executeGetMultiple_ = function (tx, df, store_name,
                                                           ids) {
  var me = this;

  var results = [];
  var result_count = 0;

  for (var i = 0; i < ids.length; i++) {
    var store = tx.objectStore(store_name);
    try { // should use try just to cache offending id ?
          // should put outside for loop or just remove try block?
      var request = store.get(ids[i]);

      request.onsuccess = goog.partial(function (i, event) {
        result_count++;
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log([store_name, event]);
        }
        results[i] = event.target.result;
        if (result_count == ids.length) {
          df.callback(results);
        }
      }, i);

      request.onerror = function (event) {
        result_count++;
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log([store_name, event]);
        }
        df.errback(event);
        // abort transaction ?
      };
    } catch (e) {
      if (e.name == 'DataError') {
        // http://www.w3.org/TR/IndexedDB/#widl-IDBObjectStore-get-IDBRequest-any-key
        throw new ydn.db.YdnDbValidKeyException(ids[i]);
      } else {
        throw e;
      }
    }
  }
};


/**
 * Execute GET request callback results to df.
 * @param {IDBTransaction} tx active transaction object.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!Array.<!ydn.db.Key>} keys id to get.
 * @private
 */
ydn.db.IndexedDb.prototype.executeGetKeys_ = function (tx, df, keys) {
  var me = this;

  var results = [];
  var result_count = 0;

  /**
   * @type {IDBObjectStore}
   */
  var store;
  for (var i = 0; i < keys.length; i++) {
    /**
     * @type {!ydn.db.Key}
     */
    var key = keys[i];
    if (!store || store.name != key.getStoreName()) {
      store = tx.objectStore(key.getStoreName());
    }
    try { // should use try just to cache offending id ?
      // should put outside for loop or just remove try block?
      var request = store.get(key.getId());

      request.onsuccess = goog.partial(function (i, event) {
        result_count++;
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log(event);
        }
        results[i] = event.target.result;
        if (result_count == keys.length) {
          // here we cannot simply check results.length == keys.length to
          // decide finished collecting because success result will
          // not return in order in general.
          df.callback(results);
        }
      }, i);

      request.onerror = function (event) {
        result_count++;
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log([keys, event]);
        }
        df.errback(event);
        // abort transaction ?
      };
    } catch (e) {
      if (e.name == 'DataError') {
        // http://www.w3.org/TR/IndexedDB/#widl-IDBObjectStore-get-IDBRequest-any-key
        throw new ydn.db.YdnDbValidKeyException(key.getId());
      } else {
        throw e;
      }
    }
  }
};


/**
 * Execute PUT request either storing result to tx or callback to df.
 * @param {IDBTransaction} tx active transaction object.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {string} table table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @private
 */
ydn.db.IndexedDb.prototype.executePut_ = function(tx, df, table, value) {
  var store = tx.objectStore(table);
  var request;

  if (goog.isArray(value)) {
    var results = [];
    for (var i = 0; i < value.length; i++) {
      request = store.put(value[i]);
      request.onsuccess = function(event) {
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log([event, table]);
        }
        results.push(event.target.result);
        var last = results.length == value.length;
        if (last) {
          df.callback(results);
        }
      };
      request.onerror = function(event) {
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log([event, table]);
        }
        df.errback(event);
      };

    }
  } else {
    request = store.put(value);
    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log([event, table, value]);
      }
      df.callback(event.target.result);
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log([event, table, value]);
      }
      df.errback(event);
    };
  }
};


/**
 * Get object in the store in a transaction. This return requested object
 * immediately.
 *
 * This method must be {@link #runInTransaction}.
 * @param {IDBTransaction} tx active transaction object.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {string=} opt_store_name store name.
 * @param {(string|number)=} opt_key object key.
 * @private
 */
ydn.db.IndexedDb.prototype.executeClear_ = function(tx, df, opt_store_name,
                                                    opt_key) {

  var request, store;
  if (goog.isDef(opt_key)) {
    goog.asserts.assertString(opt_store_name);
    store = tx.objectStore(opt_store_name);
    request = store['delete'](opt_key);
    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log([tx, store_name, opt_key, event]);
      }
      df.callback(event.target.result);
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log([tx, store_name, opt_key, event]);
      }
      df.errback(event);
    };
  } else {
    var store_names_to_clear = goog.isDef(opt_store_name) ? [opt_store_name] :
      this.schema.getStoreNames();
    var n_todo = store_names_to_clear.length;
    var n_done = 0;

    for (var i = 0; i < n_todo; i++) {
      var store_name = store_names_to_clear[i];
      store = tx.objectStore(store_name);
      request = store.clear();
      request.onsuccess = function(event) {
        n_done++;
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log([tx, n_done, event]);
        }
        if (n_done == n_todo) {
          df.callback(event.target.result);
        }
      };
      request.onerror = function(event) {
        n_done++;
        if (ydn.db.IndexedDb.DEBUG) {
          window.console.log([tx, n_done, event]);
        }
        if (n_done == n_todo) {
          df.errback(event);
        }
      };
    }
  }

};


/**
 * @param {string} table table name.
 * @param {!Object|Array.<!Object>} value object to put.
 * @param {(string|number)=} opt_key
 * @return {!goog.async.Deferred} return key in deferred function.
 */
ydn.db.IndexedDb.prototype.put = function(table, value, opt_key) {
  var me = this;

  if (ydn.db.IndexedDb.DEBUG) {
    if (!this.schema.hasStore(table)) {
      throw Error(table + ' not exist in ' + this.dbname);
    }
  }

  var open_tx = this.isOpenTransaction();
  var tx = this.getActiveIdbTx();
  var df = new goog.async.Deferred();
  if (open_tx) {
    goog.asserts.assertObject(tx);
    me.executePut_(tx.getTx(), df, table, value);
    return df;
  } else {
    this.doTransaction(function(tx) {
      me.executePut_(tx.getTx(), df, table, value);
    }, [table], ydn.db.TransactionMode.READ_WRITE);
  }
  return df;
};


/**
 * Get all item in the store.
 * @private
 * @param {IDBTransaction} tx active transaction object.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {boolean} not_key_only query only keys.
 * @param {string|!Array.<string>=} opt_store_name table name.
 */
ydn.db.IndexedDb.prototype.executeGetAll_ = function(tx, df, not_key_only, opt_store_name) {
  var self = this;

  var getAll = function(store_name) {
    var results = [];
    var store = tx.objectStore(store_name);

    // Get everything in the store;
    var request = store.openCursor();

    request.onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        if (not_key_only) {
          results.push(cursor['value']);
        } else {
          results.push(cursor['key']);
        }
        cursor['continue'](); // result.continue();
      } else {
        n_done++;
        if (n_done == n_todo) {
          df.callback(results);
        }
      }
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log([store_name, event]);
      }
      df.errback(event);
    };
  };

  var store_names = goog.isString(opt_store_name) ? [opt_store_name] :
    goog.isArray(opt_store_name) && opt_store_name.length > 0 ?
        opt_store_name : this.schema.getStoreNames();

  var n_todo = store_names.length;
  var n_done = 0;

  if (n_todo > 0) {
    for (var i = 0; i < store_names.length; i++) {
      getAll(store_names[i]);
    }
  } else {
    df.callback([]);
  }

};


/**
 *
 * @param {!ydn.db.Query} q query object.
 * @return {!goog.async.Deferred} return object in deferred function.
 * @private
 */
ydn.db.IndexedDb.prototype.getQuery_ = function(q) {
  var df = new goog.async.Deferred();

  var fetch_df = this.fetch(q, 1);
  fetch_df.addCallback(function(value) {
    df.callback(goog.isArray(value) ? value[0] : undefined);
  });
  fetch_df.addErrback(function(value) {
    df.errback(value);
  });

  return df;
};


/**
 * @param {IDBTransaction} tx active transaction object.
 * @param {string} store_name
 * @param {string|number} id
 * @return {!goog.async.Deferred} return object in deferred function.
 * @private
 */
ydn.db.IndexedDb.prototype.getById_ = function(tx, store_name, id) {
  var me = this;
  var df = new goog.async.Deferred();
  if (tx) {
    this.executeGet_(tx, df, store_name, id);
  } else {
    this.doTransaction(function(tx) {
      me.executeGet_(tx.getTx(), df, store_name, id);
    }, [store_name], ydn.db.TransactionMode.READ_ONLY);
  }
  return df;
};


/**
 * @param {IDBTransaction} tx active transaction object.
 * @param {string} store_name
 * @param {!Array.<string|number>} ids
 * @return {!goog.async.Deferred} return object in deferred function.
 * @private
 */
ydn.db.IndexedDb.prototype.getByIds_ = function(tx, store_name, ids) {
  var me = this;
  var df = new goog.async.Deferred();
  if (tx) {
    this.executeGetMultiple_(tx, df, store_name, ids);
  } else {
    this.doTransaction(function(tx) {
      me.executeGetMultiple_(tx.getTx(), df, store_name, ids);
    }, [store_name], ydn.db.TransactionMode.READ_ONLY);
  }
  return df;
};


/**
 * @param {IDBTransaction} tx active transaction object.
 * @param {!Array.<!ydn.db.Key>} keys
 * @return {!goog.async.Deferred} return object in deferred function.
 * @private
 */
ydn.db.IndexedDb.prototype.getByKeys_ = function(tx, keys) {
  var me = this;
  var df = new goog.async.Deferred();
  if (tx) {
    this.executeGetKeys_(tx, df, keys);
  } else {
    var store_names = [];
    for (var i = 1; i < keys.length; i++) {
      var store_name = keys[i].getStoreName();
      if (store_names.indexOf(store_name) == -1) {
        store_names.push(store_name);
      }
    }
    this.doTransaction(function(tx) {
      me.executeGetKeys_(tx.getTx(), df, keys);
    }, store_names, ydn.db.TransactionMode.READ_ONLY);
  }
  return df;
};


/**
 * @param {IDBTransaction=} tx active transaction object.
 * @param {(string|!Array.<string>)=} store_name
 * @return {!goog.async.Deferred} return object in deferred function.
 * @private
 */
ydn.db.IndexedDb.prototype.getByStore_ = function(tx, store_name) {
  var me = this;
  var df = new goog.async.Deferred();
  if (tx) {
    this.executeGetAll_(tx, df, false, store_name);
  } else {
    this.doTransaction(function(tx) {
      me.executeGetAll_(tx.getTx(), df, false, store_name);
    }, [store_name], ydn.db.TransactionMode.READ_ONLY);

  }
  return df;
};




/**
 * Return object
 * @param {IDBTransaction|IDBTransaction|Object} tx
 * @param {(string|!Array.<string>|!ydn.db.Key|!Array.<!ydn.db.Key>)=} arg1 table name.
 * @param {(string|number|!Array.<string>)=} arg2 object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!goog.async.Deferred} return object in deferred function.
 */
ydn.db.IndexedDb.prototype.getInTx = function (tx, arg1, arg2) {

  tx = /** @type {IDBTransaction} */ (tx);

  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {ydn.db.Key}
     */
    var k = arg1;
    return this.getById_(tx, k.getStoreName(), k.getId());
  } else if (goog.isString(arg1)) {
    if (goog.isString(arg2) || goog.isNumber(arg2)) {
      /** @type {string} */
      var store_name = arg1;
      /** @type {string|number} */
      var id = arg2;
      return this.getById_(tx, store_name, id);
    } else if (!goog.isDef(arg2)) {
      return this.getByStore_(tx, arg1);
    } else if (goog.isArray(arg2)) {
      if (goog.isString(arg2[0]) || goog.isNumber(arg2[0])) {
        return this.getByIds_(tx, arg1, arg2);
      } else {
        throw new ydn.error.ArgumentException();
      }
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (goog.isArray(arg1)) {
    if (arg1[0] instanceof ydn.db.Key) {
      return this.getByKeys_(tx, arg1);
    } else {
      throw new ydn.error.ArgumentException();
    }
  } else if (!goog.isDef(arg1) && !goog.isDef(arg2)) {
    return this.getByStore_(tx);
  } else {
    throw new ydn.error.ArgumentException();
  }

};


/**
* Return object
* @param {(string|!Array.<string>|!ydn.db.Key|!Array.<!ydn.db.Key>)=} arg1 table name.
* @param {(string|number|!Array.<string>)=} arg2 object key to be retrieved, if not provided,
* all entries in the store will return.
* @return {!goog.async.Deferred} return object in deferred function.
*/
ydn.db.IndexedDb.prototype.get = function (arg1, arg2) {
  return this.getInTx(null, arg1, arg2);
};


/**
 * @param {IDBTransaction} tx active transaction object.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!Array.<!ydn.db.Key>} keys query.
 * @param {number=} limit limit.
 * @param {number=} offset offset.
 * @deprecated
 * @private
 */
ydn.db.IndexedDb.prototype.executeFetchKeys_ = function (tx, df, keys, limit, offset) {
  var me = this;

  var n = keys.length;
  var result = [];
  offset = goog.isDef(offset) ? offset : 0;
  limit = goog.isDef(limit) ? limit : keys.length;
  for (var i = offset; i < limit; i++) {
    var key = keys[i];
    goog.asserts.assert(goog.isDef(key.getId()) && goog.isString(key.getStoreName()),
      'Invalid key: ' + key);
    var store = tx.objectStore(key.getStoreName());
    var request = store.get(key.getId());

    request.onsuccess = function (event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      result.push(event.target.result);
      if (result.length == limit) {
        df.callback(result);
      }
    };

    request.onerror = function (event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      df.errback(event);
    };
  }

};



/**
 * @param {IDBTransaction} tx active transaction object.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!ydn.db.Query} q query.
 * @param {number=} limit limit.
 * @param {number=} offset offset.
 * @private
 */
ydn.db.IndexedDb.prototype.executeFetchQuery_ = function(tx, df, q, limit,
                                                         offset) {
  var me = this;
  var store = this.schema.getStore(q.store_name);
  var is_reduce = goog.isFunction(q.reduce);

  var start = offset || 0;
  var end = goog.isDef(limit) ? start + limit : undefined;

  //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column +
  // ' in ' + table);
  var obj_store = tx.objectStore(store.name);

  var index = goog.isDefAndNotNull(q.index) ?
      obj_store.index(q.index) : null;

  //console.log('opening ' + q.op + ' cursor ' + value + ' ' + value_upper +
  // ' of ' + column + ' in ' + table);
  var request;
  if (goog.isDefAndNotNull(q.keyRange)) {
    if (goog.isDef(q.direction)) {
      var dir = /** @type {number} */ (q.direction); // new standard is string.
      request = index.openCursor(q.keyRange, dir);
    } else {
      request = index.openCursor(q.keyRange);
    }
  } else {
    if (index) {
      request = index.openCursor();
    } else {
      request = obj_store.openCursor();
    }
  }

  var idx = -1; // iteration index
  var results = [];
  var previousResult = undefined; // q.initialValue

  request.onsuccess = function(event) {

    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([q, idx, event]);
    }
    /**
     * @type {IDBCursor}
     */
    var cursor = /** @type {IDBCursor} */ (event.target.result);
    //console.log(cursor);
    if (cursor) {

      var value = /** @type {!Object} */ cursor['value']; // should not
      // necessary if externs are

      var to_continue = !goog.isFunction(q.continue) || q.continue(value);

      // do the filtering if requested.
      if (!goog.isFunction(q.filter) || q.filter(value)) {
        idx++;

        if (idx >= start) {
          if (goog.isFunction(q.map)) {
            value = q.map(value);
          }

          if (is_reduce) {
            previousResult = q.reduce(previousResult, value, idx);
          } else {
            results.push(value);
          }
        }
      }

      if (to_continue && (!goog.isDef(end) || (idx + 1) < end)) {
        //cursor.continue();
        cursor['continue'](); // Note: Must be quoted to avoid parse error.
      } else {
        var result = is_reduce ? previousResult : results;
        df.callback(result);
      }
    } else {
      var result = is_reduce ? previousResult : results;
      df.callback(result);
    }
  };

  request.onerror = function(event) {
    if (ydn.db.IndexedDb.DEBUG) {
      window.console.log([q, event]);
    }
    df.errback(event);
  };

};


/**
 * @param {!ydn.db.Query} q query.
 * @param {number=} limit limit.
 * @param {number=} offset offset.
 * @return {!goog.async.Deferred} result in deferred.
 */
ydn.db.IndexedDb.prototype.fetch = function(q, limit, offset) {

  var self = this;
  var df, tx;
  var open_tx = this.isOpenTransaction();
  if (q instanceof ydn.db.Query) {
    tx = this.getActiveIdbTx();
    df = new goog.async.Deferred();
    if (open_tx) {
      this.executeFetchQuery_(tx.getTx(), df, q, limit, offset);
    } else {
      this.doTransaction(function(tx) {
        self.executeFetchQuery_(tx.getTx(), df, q, limit, offset);
      }, [q.store_name], ydn.db.TransactionMode.READ_ONLY);
    }
    return df;
  } else {
    throw new ydn.error.ArgumentException();
  }
};


/**
 *
 * @param {string} table store name.
 * @param {string} id key.
 * @return {!goog.async.Deferred} deferred result.
 * @private
 */
ydn.db.IndexedDb.prototype.deleteItem_ = function(table, id) {
  var me = this;

  if (goog.DEBUG && !this.schema.hasStore(table)) {
    throw Error(table + ' not exist in ' + this.dbname);
  }

  var df = new goog.async.Deferred();
  this.doTransaction(function(tx) {
    var store = tx.objectStore(table);
    var request = store['delete'](id);

    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      df.callback(true); // setting 'true' meaningful ?
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      df.errback(event);
    };
  }, [table], ydn.db.TransactionMode.READ_WRITE);
  return df;
};


/**
 *
 * @param {string} table store name.
 * @return {!goog.async.Deferred} deferred result.
 * @private
 */
ydn.db.IndexedDb.prototype.deleteStore_ = function(table) {
  var me = this;

  if (!this.schema.hasStore(table)) {
    throw Error(table + ' not exist in ' + this.dbname);
  }

  var df = new goog.async.Deferred();
  this.doTransaction(function(tx) {
    var request = tx.getTx().deleteObjectStore(table);

    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      df.callback(true);
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      df.errback(event);
    };
  }, [table], ydn.db.TransactionMode.READ_WRITE);
  return df;
};


///**
// *
// * @param {ydn.db.IdbTxMutex} tx active transaction object.
// * @param {goog.async.Deferred} df deferred to feed result.
// * @param {string=} opt_table delete the table as provided otherwise
// * delete all stores.
// * @param {string=} opt_key delete a specific row.
// * @private
// */
//ydn.db.IndexedDb.prototype.executeClear_ = function(tx, df, opt_table,
// opt_key) {
//
//};




/**
 * Delete the database, store or an entry.
 *
 * @param {string=} opt_table delete a specific store.
 * @param {string=} opt_id delete a specific row.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.IndexedDb.prototype.remove = function(opt_table, opt_id) {
  /*
  * Note: I wish this method be named 'delete' but closure compiler complain
  * or sometimes problem with exporting 'delete' as method name.
  */

  if (goog.isDef(opt_table)) {
    if (goog.isDef(opt_id)) {
      return this.deleteItem_(opt_table, opt_id);
    } else {
      return this.deleteStore_(opt_table);
    }
  } else {
    if (goog.isFunction(ydn.db.IndexedDbWrapper.indexedDb.deleteDatabase)) {
      var df = new goog.async.Deferred();
      var req = ydn.db.IndexedDbWrapper.indexedDb.deleteDatabase(this.dbname);
      req.onsuccess = function(e) {
        df.addCallback(e);
      };
      req.onerror = function(e) {
        df.addErrback(e);
      };
      return df;
    } else {
      return this.clear();
    }
  }
};


/**
 * @param {string} table store name.
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.IndexedDb.prototype.count = function(table) {

  var self = this;

  var df = new goog.async.Deferred();
  this.doTransaction(function(tx) {
    var store = tx.getTx().objectStore(table);
    var request = store.count();
    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      df.callback(event.target.result);
    };
    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      df.callback(event);
    };

  }, [table], ydn.db.TransactionMode.READ_ONLY);
  return df;
};


/**
 * Print out list of key for debug use.
 * @param {string} store_name table name.
 * @return {!goog.async.Deferred} return as deferred function.
 */
ydn.db.IndexedDb.prototype.listKeys = function(store_name) {
  var self = this;

  goog.asserts.assertObject(this.schema[store_name], 'store ' + store_name +
    ' not exists in ' + this.dbname);
  var column = this.schema[store_name].keyPath;

  var keys = [];

  var df = new goog.async.Deferred();
  this.doTransaction(function(tx) {
    //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column +
    // ' in ' + table);
    var store = tx.objectStore(store_name);
    var index = store.index(column);
    var boundKeyRange;
    var value_upper = '';

    //console.log('opening ' + q.op + ' cursor ' + value + ' ' + value_upper +
    // ' of ' + column + ' in ' + table);
    var request = index.openCursor();

    request.onsuccess = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      /**
       * @type {IDBCursor}
       */
      var cursor = /** @type {IDBCursor} */ (event.target.result);
      //console.log(cursor);
      if (cursor) {
        keys.push(cursor['key']);
        //cursor.continue();
        cursor['continue'](); // Note: Must be quoted to avoid parse error.
      } else { // no more
        df.callback(keys);
      }
    };

    request.onerror = function(event) {
      if (ydn.db.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      df.errback(event);
    };

  }, [store_name], ydn.db.TransactionMode.READ_ONLY);
  return df;
};



/**
 * Remove a specific entry from a store or all.
 * @param {string=} opt_table delete the table as provided otherwise
 * delete all stores.
 * @param {(string|number)=} opt_key delete a specific row.
 * @see {@link #remove}
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.IndexedDb.prototype.clear = function(opt_table, opt_key) {

  var store_names = goog.isDefAndNotNull(opt_table) ? [opt_table] :
      this.schema.getStoreNames();
  var self = this;
  var tx = this.getActiveIdbTx();
  var open_tx = this.isOpenTransaction();
  var df = new goog.async.Deferred();
  if (open_tx) {
    this.executeClear_(tx.getTx(), df, opt_table, opt_key);
  } else {
    this.doTransaction(function(tx) {
      self.executeClear_(tx.getTx(), df, opt_table, opt_key);
    }, store_names, ydn.db.TransactionMode.READ_WRITE);
  }
  return df;
};



/**
 * Perform explicit transaction.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} scopes list of store names involved in the
 * transaction.
 * @param {ydn.db.TransactionMode} mode mode, default to 'readonly'.
 * @override
 */
ydn.db.IndexedDb.prototype.transaction = function (trFn, scopes, mode) {

  goog.base(this, 'transaction', trFn, scopes, mode);

};
