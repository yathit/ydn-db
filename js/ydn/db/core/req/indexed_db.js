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
 * @fileoverview Implements ydn.db.core.req.IRequestExecutor with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.req.IndexedDb');
goog.require('goog.async.DeferredList');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.req.RequestExecutor');
goog.require('ydn.error');
goog.require('ydn.json');


/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @extends {ydn.db.req.RequestExecutor}
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.core.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.IndexedDb, ydn.db.req.RequestExecutor);


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.core.req.IndexedDb.DEBUG = false;


/**
 *
 * Large number of requests can cause memory hog without increasing performance.
 * @const
 * @type {number} Maximum number of requests created per transaction.
 */
ydn.db.core.req.IndexedDb.REQ_PER_TX = 10;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.core.req.IndexedDb');


/**
 *
 * @return {!IDBTransaction} casted tx.
 */
ydn.db.core.req.IndexedDb.prototype.getTx = function() {
  return /** @type {!IDBTransaction} */ (this.tx);
};


/**
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {!Array.<string>}  stores store name.
 */
ydn.db.core.req.IndexedDb.prototype.countStores = function(df, stores) {

  var me = this;
  var total = 0;

  var count_store = function(i) {
    var table = stores[i];
    var store = me.tx.objectStore(table);
    var request = store.count();
    request.onsuccess = function(event) {
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      total += event.target.result;
      i++;
      if (i == stores.length) {
        df.callback(total);
      } else {
        count_store(i);
      }

    };
    request.onerror = function(event) {
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      df.errback(event);
    };
  };

  if (stores.length == 0) {
    df.callback(0);
  } else {
    count_store(0);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.putByKeys = goog.abstractMethod;



/**
* Execute PUT request either storing result to tx or callback to df.
* @param {goog.async.Deferred} df deferred to feed result.
* @param {string} table table name.
* @param {!Object} value object to put.
* @param {(!Array|string|number)=} opt_key optional out-of-line key.
*/
ydn.db.core.req.IndexedDb.prototype.putObject = function(df, table, value, opt_key)
{
  var store = this.tx.objectStore(table);

  var request;
  try {
    if (goog.isDef(opt_key)) {
      request = store.put(value, opt_key);
    } else {
      request = store.put(value);
    }
  } catch (e) {
    if (goog.DEBUG && e.name == 'DataError') {
      // give useful info.
      var str = ydn.json.stringify(value);
      throw new ydn.db.InvalidKeyException(table + ': ' + str.substring(0, 50));
    } else {
      throw e;
    }
  }
  request.onsuccess = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([event, table, value]);
    }
    df.callback(event.target.result);
  };
  request.onerror = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([event, table, value]);
    }
    df.errback(event);
  };
};


/**
 * Execute PUT request either storing result to tx or callback to df.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {string} store_name table name.
 * @param {!Array.<!Object>} objs object to put.
 * @param {!Array.<(!Array|string|number)>=} opt_keys optional out-of-line keys.
 */
ydn.db.core.req.IndexedDb.prototype.putObjects = function(df, store_name, objs,
                                                      opt_keys) {

  var results = [];
  var result_count = 0;

  var store = this.tx.objectStore(store_name);
  var put = function(i) {

    var request;
    // try - catch block is only for debugging build.
    try {
      if (goog.isDef(opt_keys)) {
        request = store.put(objs[i], opt_keys[i]);
      } else {
        request = store.put(objs[i]);
      }
    } catch (e) {
      if (goog.DEBUG && e.name == 'DataError') {
        // DataError is due to invalid key.
        // http://www.w3.org/TR/IndexedDB/#widl-IDBObjectStore-get-
        // IDBRequest-any-key
        throw new ydn.db.InvalidKeyException('put to "' + store_name + '": ' +
            i + ' of ' + objs.length);
      } if (goog.DEBUG && e.name == 'DataCloneError') {
        throw new ydn.db.DataCloneError('put to "' + store_name + '": ' + i +
            ' of ' + objs.length);
      } else {
        throw e;
      }
    }

    request.onsuccess = function(event) {
      result_count++;
      //if (ydn.db.core.req.IndexedDb.DEBUG) {
      //  window.console.log([store_name, event]);
      //}
      results[i] = event.target.result;
      if (result_count == objs.length) {
        df.callback(results);
      } else {
        var next = i + ydn.db.core.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log([store_name, event]);
      }
      df.errback(event);
      // abort transaction ?
    };

  };

  if (objs.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.core.req.IndexedDb.REQ_PER_TX &&
      i < objs.length; i++) {
      put(i);
    }
  } else {
    df.callback([]);
  }
};


/**
* Get object in the store in a transaction. This return requested object
* immediately.
*
* @param {goog.async.Deferred} df deferred to feed result.
* @param {string} store_name store name.
* @param {(!Array|string|number)} key object key.
*/
ydn.db.core.req.IndexedDb.prototype.clearById = function(df, store_name, key) {

  var store = this.tx.objectStore(store_name);
  var request = store['delete'](key);
  request.onsuccess = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([store_name, key, event]);
    }
    df.callback(event.target.result);
  };
  request.onerror = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([store_name, key, event]);
    }
    df.errback(event);
  };

};



/**
 * Get object in the store in a transaction. This return requested object
 * immediately.
 *
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {(string|!Array.<string>)=} opt_store_name store name.
 */
ydn.db.core.req.IndexedDb.prototype.clearByStore = function(df, opt_store_name) {

  var store_names_to_clear = (goog.isArray(opt_store_name) &&
    opt_store_name.length > 0) ?
    opt_store_name : goog.isString(opt_store_name) ? [opt_store_name] :
      this.schema.getStoreNames();
  var n_todo = store_names_to_clear.length;
  var n_done = 0;

  for (var i = 0; i < n_todo; i++) {
    var store_name = store_names_to_clear[i];
    var store = this.tx.objectStore(store_name);
    var request = store.clear();
    request.onsuccess = function(event) {
      n_done++;
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log([n_done, event]);
      }
      if (n_done == n_todo) {
        df.callback(true);
      }
    };
    request.onerror = function(event) {
      n_done++;
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log([n_done, event]);
      }
      if (n_done == n_todo) {
        df.errback(event);
      }
    };
  }
};


/**
 * Get all item in the store.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {boolean} not_key_only query only keys.
 * @param {string|!Array.<string>=} opt_store_name table name.
 */
ydn.db.core.req.IndexedDb.prototype.getKeysByStore = function(df, not_key_only,
                                                         opt_store_name) {
  var self = this;

  var getAll = function(store_name) {
    var results = [];
    var store = self.tx.objectStore(store_name);

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
      if (ydn.db.core.req.IndexedDb.DEBUG) {
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
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.listByKeyRange = function(df, store_name,
      key_range, reverse, limit, offset) {
  var results = [];
  var store = this.tx.objectStore(store_name);
  var dir = ydn.db.base.getDirection(reverse);
  var request = store.openCursor(key_range, dir);
  var cued = false;
  request.onsuccess = function(event) {
    /**
     *
     * @type {IDBCursorWithValue}
     */
    var cursor = event.target.result;
    if (cursor) {
      if (!cued && offset > 0) {
        cued = true;
        if (offset != 1) {
          cursor.advance(offset - 1);
        }
        return;
      }
      results.push(cursor.value);
      if (results.length < limit) {
        cursor.advance(1);
      }
    } else {
      df.callback(results);
    }
  };
  request.onerror = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([store_name, event]);
    }
    df.errback(event);
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.keysByKeyRange = function(df, store_name,
    key_range, reverse, limit, offset) {
  var results = [];
  var store = this.tx.objectStore(store_name);
  var dir = ydn.db.base.getDirection(reverse);
  var request = store.openCursor(key_range, dir);
  var cued = false;
  request.onsuccess = function(event) {
    var cursor = event.target.result;
    if (cursor) {
      if (!cued && offset > 0) {
        cued = true;
        if (offset != 1) {
          cursor.advance(offset - 1);
        }
        return;
      }
      results.push(cursor.key);
      if (results.length < limit) {
        cursor.advance(1);
      }
    } else {
      df.callback(results);
    }
  };
  request.onerror = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([store_name, event]);
    }
    df.errback(event);
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.keysByStore = function(df, store_name,
   reverse, limit, offset) {
  var results = [];
  var store = this.tx.objectStore(store_name);
  var dir = ydn.db.base.getDirection(reverse);
  var request = store.openCursor(null, dir);
  var cued = false;
  request.onsuccess = function(event) {
    /**
     * @type {IDBCursor}
     */
    var cursor = event.target.result;
    if (cursor) {
      if (!cued && offset > 0) {
        cued = true;
        if (offset != 1) {
          cursor.advance(offset - 1);
        }
        return;
      }
      results.push(cursor.primaryKey);
      if (results.length < limit) {
        cursor.advance(1);
      }
    } else {
      df.callback(results);
    }
  };
  request.onerror = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([store_name, event]);
    }
    df.errback(event);
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.keysByIndexKeyRange = function(df, store_name,
      index_name, key_range, reverse, limit, offset, unique) {
  var results = [];
  var store = this.tx.objectStore(store_name);
  var index = store.index(index_name);
  var dir = ydn.db.base.getDirection(reverse, unique);
  var request = index.openKeyCursor(key_range, dir);
  var cued = false;
  request.onsuccess = function(event) {
    /**
     * @type {IDBCursor}
     */
    var cursor = event.target.result;
    if (cursor) {
      if (!cued && offset > 0) {
        cued = true;
        if (offset != 1) {
          cursor.advance(offset - 1);
        }
        return;
      }
      results.push(cursor.primaryKey);
      if (results.length < limit) {
        cursor.advance(1);
      }
    } else {
      df.callback(results);
    }
  };
  request.onerror = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([store_name, event]);
    }
    df.errback(event);
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.keysByIndexKeys = goog.abstractMethod;




/**
* @inheritDoc
*/
ydn.db.core.req.IndexedDb.prototype.listByStores = function(df, store_names) {
  var me = this;
  var results = [];

  var getAll = function(i) {
    var store_name = store_names[i];
    var store = me.tx.objectStore(store_name);

    // Get everything in the store;
    var request = store.openCursor();

    request.onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        results.push(cursor['value']);
        cursor['continue'](); // result.continue();
      } else {
        i++;
        if (i == store_names.length) {
          df.callback(results);
        } else {
          getAll(i);
        }
      }
    };

    request.onerror = function(event) {
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log([store_name, event]);
      }
      df.errback(event);
    };
  };

  if (store_names.length > 0) {
    getAll(0);
  } else {
    df.callback([]);
  }
};


/**
* @inheritDoc
*/
ydn.db.core.req.IndexedDb.prototype.getById = function(df, store_name, id) {

  var me = this;

  var store;
  try {
    store = this.tx.objectStore(store_name);
  } catch (e) {
    if (e.name == 'NotFoundError') {
      throw new ydn.db.NotFoundError(store_name + ' not in Tx scope: ' +
        this.scope);
    } else {
      throw e;
    }
  }
  var request = store.get(id);

  request.onsuccess = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    df.callback(event.target.result);
  };

  request.onerror = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    //me.logger.warning('Error retrieving ' + id + ' in ' + store_name + ' ' +
    // event.message);
    df.errback(event);
  };
};




/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.listByIds = function(df, store_name, ids) {
  var me = this;

  var results = [];
  var result_count = 0;
  var store = this.tx.objectStore(store_name);
  var n = ids.length;

  var get = function(i) {

    if (!goog.isDefAndNotNull(ids[i])) {
      // should we just throw error ?
      result_count++;
      results[i] = undefined;
      if (result_count == n) {
        df.callback(results);
      } else {
        var next = i + ydn.db.core.req.IndexedDb.REQ_PER_TX;
        if (next < n) {
          get(next);
        }
      }
    }

    var request;
    try {
      request = store.get(ids[i]);
    } catch (e) {
      if (e.name == 'DataError') {
        if (ydn.db.core.req.IndexedDb.DEBUG) {
          window.console.log([store_name, i, ids[i], e]);
        }
        // http://www.w3.org/TR/IndexedDB/#widl-IDBObjectStore-get-
        // IDBRequest-any-key
        throw new ydn.db.InvalidKeyException(ids[i]);
      } else {
        throw e;
      }
    }
    request.onsuccess = (function(event) {
      result_count++;
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log([store_name, ids, i, event]);
      }
      results[i] = event.target.result;
      if (result_count == n) {
        df.callback(results);
      } else {
        var next = i + ydn.db.core.req.IndexedDb.REQ_PER_TX;
        if (next < n) {
          get(next);
        }
      }
    });

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log([store_name, ids, i, event]);
      }
      df.errback(event);
    };

  };

  if (n > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.core.req.IndexedDb.REQ_PER_TX && i < n; i++) {
      get(i);
    }
  } else {
    df.callback([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.listByKeys = function(df, keys) {
  var me = this;

  var results = [];
  var result_count = 0;


  var getKey = function(i) {
    /**
     * @type {!ydn.db.Key}
     */
    var key = keys[i];
    /**
     * @type {IDBObjectStore}
     */
    var store = me.tx.objectStore(key.getStoreName());
    var request;
    try {
      request = store.get(key.getId());
    } catch (e) {
      if (e.name == 'DataError') {
        throw new ydn.db.InvalidKeyException(key + ' at ' + i);
      } else {
        throw e;
      }
    }

    request.onsuccess = function(event) {
      result_count++;
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      results[i] = event.target.result;
      if (result_count == keys.length) {
        df.callback(results);
      } else {
        var next = i + ydn.db.core.req.IndexedDb.REQ_PER_TX;
        if (next < keys.length) {
          getKey(next);
        }
      }
    };

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log([keys, event]);
      }
      df.errback(event);
      // abort transaction ?
    };

  };

  if (keys.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.core.req.IndexedDb.REQ_PER_TX && i < keys.length; i++)
    {
      getKey(i);
    }
  } else {
    df.callback([]);
  }
};

//
///**
// * Index scanning.
// * @param {!Array.<!ydn.db.Iterator>>} indexes list of indexes.
// * @param {(function(keys: !Array, index_keys: !Array): number)=} callback
// * @param {number=} limit limit number of match results.
// * @param {boolean=} no_prefetch no prefetching of result.
// * @return {!goog.async.Deferred} promise on completed.
// */
//ydn.db.core.req.IndexedDb.prototype.scan = function(indexes, callback, limit, no_prefetch) {
//  var df = new goog.async.Deferred();
//  var me = this;
//  var store = this.schema.getStore(cursor.store_name);
//
//  var resume = cursor.has_done === false;
//  if (resume) {
//    goog.asserts.assert(cursor.store_key);
//  }
//
//  /**
//   * @type {IDBObjectStore}
//   */
//  var obj_store;
//  try {
//    obj_store = this.tx.objectStore(store.name);
//  } catch (e) {
//    if (goog.DEBUG && e.name == 'NotFoundError') {
//      var msg = this.tx.db.objectStoreNames.contains(store.name) ?
//          'store: ' + store.name + ' not in transaction.' :
//          'store: ' + store.name + ' not in database: ' + this.tx.db.name;
//      throw new ydn.db.NotFoundError(msg);
//    } else {
//      // InvalidStateError: we don't have any more info for this case.
//      throw e;
//    }
//  }
//
//  return df;
//};





/**
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {string} table store name.
 * @param {ydn.db.KeyRange} keyRange key range.
 */
ydn.db.core.req.IndexedDb.prototype.countKeyRange = function(df, table, keyRange) {

  var self = this;

  var key_range = ydn.db.IDBKeyRange.bound(keyRange.lower, keyRange.upper,
      keyRange.lowerOpen, keyRange.upperOpen);

  var store = this.tx.objectStore(table);
  var request = store.count(key_range);
  request.onsuccess = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    df.callback(event.target.result);
  };
  request.onerror = function(event) {
    if (ydn.db.core.req.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    df.errback(event);
  };

};


/**
 * Get list of keys in a range.
 * @param {!goog.async.Deferred} df result promise.
 * @param {string} store_name store name.
 * @param {IDBKeyRange} key_range The key range.
 * @param {string} key_range_index Index name of key range.
 * @param {number=} offset number of result to skip.
 * @param {number=} limit place upper bound on results.
 */
ydn.db.core.req.IndexedDb.prototype.getKeysByIndexKeyRange = function(df, store_name,
    key_range, key_range_index, offset, limit) {
  var store = this.tx.objectStore(store_name);
  var index = store.index(key_range_index);
  var req = index.openKeyCursor(key_range);

  var keys = [];
  var cue = false;
  req.onsuccess = function(event) {
    var cur = /** @type {IDBCursor} */ (event.target.result);
    if (cur) {
      if (goog.isDef(offset) && !cue) {
        cue = true;
        cur.advance(offset);
      }
      keys.push(cur.primaryKey);
      if (goog.isDef(limit) && keys.length >= limit) {
        df.callback(keys);
      } else {
        cur.advance(1);
      }
    } else {
      df.callback(keys);
    }
  };

  req.onerror = function(ev) {
    df.errback(ev);
  };
};



/**
 * Get list of keys in a range.
 * @param {!goog.async.Deferred} df result promise.
 * @param {string} store_name store name.
 * @param {string} index_name Index name of key range.
 * @param {!Array} keys The key range.
 * @param {number=} offset number of result to skip.
 * @param {number=} limit place upper bound on results.
 */
ydn.db.core.req.IndexedDb.prototype.getIndexKeysByKeys = function(df,
    store_name, index_name, keys, offset, limit) {
  var store = this.tx.objectStore(store_name);
  var index = store.index(index_name);

  var results = [];
  var result_count = 0;
  limit = goog.isDef(limit) ? limit : keys.length;

  var getKey = function(i) {
    var key = keys[i];
    var req = index.get(key);

    req.onsuccess = function(event) {
      result_count++;
      var cur = /** @type {IDBCursor} */ (event.target.result);
      if (cur) {
        results[i] = cur.key;
      } else {
        results[i] = undefined;
      }

      if (result_count === limit) {
        df.callback(results);
      } else {
        var next = i + ydn.db.core.req.IndexedDb.REQ_PER_TX;
        if (next < limit) {
          getKey(next);
        }
      }
    };

    req.onerror = function(ev) {
      df.errback(ev);
    };
  };

  if (keys.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.core.req.IndexedDb.REQ_PER_TX && i < keys.length; i++)
    {
      getKey(i);
    }
  } else {
    df.callback([]);
  }
};