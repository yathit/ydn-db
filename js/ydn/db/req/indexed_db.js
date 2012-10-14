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
 * @fileoverview Implements ydn.db.io.QueryService with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.req.IndexedDb');
goog.require('goog.async.DeferredList');
goog.require('ydn.db.req.RequestExecutor');
goog.require('ydn.json');
goog.require('ydn.error');


/**
 *  @param {string} dbname
 * @extends {ydn.db.req.RequestExecutor}
 * @param {!ydn.db.DatabaseSchema} schema
 * @constructor
 */
ydn.db.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.req.IndexedDb, ydn.db.req.RequestExecutor);


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.req.IndexedDb.DEBUG = goog.DEBUG && false;


/**
 * Maximum number of requests created per transaction.
 * Large number of requests can cause memory hog without increasing performance.
 * @const
 * @type {number}
 */
ydn.db.req.IndexedDb.REQ_PER_TX = 10;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.req.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.req.IndexedDb');


/**
 * Execute GET request callback results to df.
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {string} store_name table name.
 * @param {!Array.<string|number>} ids id to get.
 * @throws {ydn.db.InvalidKeyException}
 * @throws {ydn.error.InternalError}
 */
ydn.db.req.IndexedDb.prototype.getByIds = function (df, store_name, ids) {
  var me = this;

  var results = [];
  var result_count = 0;
  var store = this.tx.objectStore(store_name);

  var get = function (i) {

    if (!goog.isDefAndNotNull(ids[i])) {
      // should we just throw error ?
      result_count++;
      results[i] = undefined;
      if (result_count == ids.length) {
        df.callback(results);
      } else {
        var next = i + ydn.db.req.IndexedDb.REQ_PER_TX;
        if (next < ids.length) {
          get(next);
        }
      }
    }

    var request;
    try {
      request = store.get(ids[i]);
    } catch (e) {
      if (e.name == 'DataError') {
        if (ydn.db.req.IndexedDb.DEBUG) {
          window.console.log([store_name, i, ids[i], e]);
        }
        // http://www.w3.org/TR/IndexedDB/#widl-IDBObjectStore-get-IDBRequest-any-key
        throw new ydn.db.InvalidKeyException(ids[i]);
      } else {
        throw e;
      }
    }
    request.onsuccess = (function (event) {
      result_count++;
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log([store_name, ids, i, event]);
      }
      results[i] = event.target.result;
      if (result_count == ids.length) {
        df.callback(results);
      } else {
        var next = i + ydn.db.req.IndexedDb.REQ_PER_TX;
        if (next < ids.length) {
          get(next);
        }
      }
    });

    request.onerror = function (event) {
      result_count++;
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log([store_name, ids, i, event]);
      }
      df.errback(event);
    };

  };

  if (ids.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.req.IndexedDb.REQ_PER_TX && i < ids.length; i++) {
      get(i);
    }
  } else {
    df.callback([]);
  }
};


/**
* Execute GET request callback results to df.
* @param {goog.async.Deferred} df deferred to feed result.
* @param {!Array.<!ydn.db.Key>} keys id to get.
* @private
*/
ydn.db.req.IndexedDb.prototype.getByKeys = function (df, keys) {
  var me = this;

  var results = [];
  var result_count = 0;


  var get = function(i) {
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

    request.onsuccess = function (event) {
      result_count++;
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      results[i] = event.target.result;
      if (result_count == keys.length) {
        df.callback(results);
      } else {
        var next = i + ydn.db.req.IndexedDb.REQ_PER_TX;
        if (next < keys.length) {
          get(next);
        }
      }
    };

    request.onerror = function (event) {
      result_count++;
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log([keys, event]);
      }
      df.errback(event);
      // abort transaction ?
    };

  };

  if (keys.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.req.IndexedDb.REQ_PER_TX && i < keys.length; i++) {
      get(i);
    }
  } else {
    df.callback([]);
  }
};



/**
* Execute PUT request either storing result to tx or callback to df.
* @param {goog.async.Deferred} df deferred to feed result.
* @param {string} table table name.
* @param {!Object} value object to put.
* @param {(!Array|string|number)=} opt_key
*/
ydn.db.req.IndexedDb.prototype.putObject = function (df, table, value, opt_key) {
  var store = this.tx.objectStore(table);

  var request;
  try {
    if (goog.isDef(opt_key)) {
      request = store.put(value, opt_key);
    } else {
      request = store.put(value);
    }
  } catch (e) {
    if (e.name == 'DataError') {
      // give useful info.
      var str = ydn.json.stringify(value);
      throw new ydn.db.InvalidKeyException(table + ': ' + str.substring(0, 50));
    } else {
      throw e;
    }
  }
  request.onsuccess = function (event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log([event, table, value]);
    }
    df.callback(event.target.result);
  };
  request.onerror = function (event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
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
 * @param {!Array.<(!Array|string|number)>=} opt_keys
 * @private
 */
ydn.db.req.IndexedDb.prototype.putObjects = function (df, store_name, objs, opt_keys) {

  var results = [];
  var result_count = 0;

  var store = this.tx.objectStore(store_name);
  var put = function(i) {

    var request;
    try {
      if (goog.isDef(opt_keys)) {
        request = store.put(objs[i], opt_keys[i]);
      } else {
        request = store.put(objs[i]);
      }
    } catch (e) {
      if (e.name == 'DataError') {
        // http://www.w3.org/TR/IndexedDB/#widl-IDBObjectStore-get-IDBRequest-any-key
        throw new ydn.db.InvalidKeyException(i + ' of ' + objs.length);
      } if (e.name == 'DataCloneError') {
        throw new ydn.db.DataCloneError(i + ' of ' + objs.length);
      } else {
        throw e;
      }
    }

    request.onsuccess = function (event) {
      result_count++;
      //if (ydn.db.req.IndexedDb.DEBUG) {
      //  window.console.log([store_name, event]);
      //}
      results[i] = event.target.result;
      if (result_count == objs.length) {
        df.callback(results);
      } else {
        var next = i + ydn.db.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

    request.onerror = function (event) {
      result_count++;
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log([store_name, event]);
      }
      df.errback(event);
      // abort transaction ?
    };

  };

  if (objs.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.req.IndexedDb.REQ_PER_TX && i < objs.length; i++) {
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
* @private
*/
ydn.db.req.IndexedDb.prototype.clearById = function (df, store_name, key) {

  var store = this.tx.objectStore(store_name);
  var request = store['delete'](key);
  request.onsuccess = function (event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log([store_name, key, event]);
    }
    df.callback(event.target.result);
  };
  request.onerror = function (event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
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
 *  @param {(string|!Array.<string>)=} opt_store_name
 * @private
 */
ydn.db.req.IndexedDb.prototype.clearByStore = function (df, opt_store_name) {

  var store_names_to_clear = (goog.isArray(opt_store_name) && opt_store_name.length > 0) ?
    opt_store_name : goog.isString(opt_store_name) ? [opt_store_name] :
      this.schema.getStoreNames();
  var n_todo = store_names_to_clear.length;
  var n_done = 0;

  for (var i = 0; i < n_todo; i++) {
    var store_name = store_names_to_clear[i];
    var store = this.tx.objectStore(store_name);
    var request = store.clear();
    request.onsuccess = function (event) {
      n_done++;
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log([n_done, event]);
      }
      if (n_done == n_todo) {
        df.callback(true);
      }
    };
    request.onerror = function (event) {
      n_done++;
      if (ydn.db.req.IndexedDb.DEBUG) {
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
ydn.db.req.IndexedDb.prototype.getKeysByStore = function(df, not_key_only, opt_store_name) {
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
      if (ydn.db.req.IndexedDb.DEBUG) {
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
* Get all item in the store.
* @param {goog.async.Deferred} df deferred to feed result.
* @param {string|!Array.<string>=} opt_store_name table name.
*/
ydn.db.req.IndexedDb.prototype.getByStore = function(df, opt_store_name) {
  var me = this;

  var getAll = function (store_name) {
    var results = [];
    var store = me.tx.objectStore(store_name);

    // Get everything in the store;
    var request = store.openCursor();

    request.onsuccess = function (event) {
      var cursor = event.target.result;
      if (cursor) {
        results.push(cursor['value']);
        cursor['continue'](); // result.continue();
      } else {
        n_done++;
        if (n_done == n_todo) {
          df.callback(results);
        }
      }
    };

    request.onerror = function(event) {
      if (ydn.db.req.IndexedDb.DEBUG) {
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
ydn.db.req.IndexedDb.prototype.getById = function(df, store_name, id) {

  var me = this;

  var store;
  try {
    store = this.tx.objectStore(store_name);
  } catch (e) {
    if (e.name == 'NotFoundError') {
      throw new ydn.db.NotFoundError(store_name + ' not in Tx scope: ' + this.scope);
    } else {
      throw e;
    }
  }
  var request = store.get(id);

  request.onsuccess = function(event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    df.callback(event.target.result);
  };

  request.onerror = function(event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    //me.logger.warning('Error retrieving ' + id + ' in ' + store_name + ' ' + event.message);
    df.errback(event);
  };
};


/**
* @param {goog.async.Deferred} df deferred to feed result.
* @param {!ydn.db.Cursor} q query.
*/
ydn.db.req.IndexedDb.prototype.fetchCursor = function(df, q) {
  var me = this;
  var store = this.schema.getStore(q.store_name);
  var is_reduce = goog.isFunction(q.reduce);

  var on_complete = function(result) {
    if (goog.isFunction(q.finalize)) {
      df.callback(q.finalize(result));
    } else {
      df.callback(result);
    }
  };

  //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column +
  // ' in ' + table);
  var obj_store;
  try {
    obj_store = this.tx.objectStore(store.name);
  }  catch (e) {
    if (goog.DEBUG && e.name == 'NotFoundError') {
      var msg = this.tx.db.objectStoreNames.contains(store.name) ?
          'store: ' + store.name + ' not in transaction.' :
          'store: ' + store.name + ' not in database: ' + this.tx.db.name;
      throw new ydn.db.NotFoundError(msg);
    } else {
      throw e; // InvalidStateError: we can't do anything about it ?
    }
  }

  var index = null;

  if (goog.isDefAndNotNull(q.index)) {
    if (q.index != store.keyPath) {
      try {
        index = obj_store.index(q.index);
      } catch (e) {
        if (goog.DEBUG && e.name == 'NotFoundError') {
          var msg = obj_store.indexNames.contains(q.index) ?
              'index: ' + q.index + ' of ' + obj_store.name +
                  ' not in transaction scope' :
              'index: ' + q.index + ' not found in store: ' + obj_store.name;
          throw new ydn.db.NotFoundError(msg);
        } else {
          throw e;
        }
      }
    }
  }


  //console.log('opening ' + q.op + ' cursor ' + value + ' ' + value_upper +
  // ' of ' + column + ' in ' + table);
  var request;
  var dir = /** @type {number} */ (q.direction); // new standard is string.

  // keyRange is nullable but cannot be undefined.
  var keyRange = goog.isDef(q.keyRange) ? q.keyRange : null;

  if (index) {
    if (goog.isDefAndNotNull(dir)) {
      request = index.openCursor(keyRange, dir);
    } else {
      request = index.openCursor(keyRange);
    }
  } else {
    if (goog.isDefAndNotNull(dir)) {
      request = obj_store.openCursor(keyRange, dir);
    } else {
      request = obj_store.openCursor(keyRange);
    }
  }


  var idx = -1; // iteration index
  var results = [];
  var previousResult = goog.isFunction(q.initial) ? q.initial() : undefined;

  request.onsuccess = function(event) {

    if (ydn.db.req.IndexedDb.DEBUG) {
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

      var to_continue = !goog.isFunction(q.continued) || q.continued(value);

      // do the filtering if requested.
      if (!goog.isFunction(q.filter) || q.filter(value)) {
        idx++;


          if (goog.isFunction(q.map)) {
            value = q.map(value);
          }

          if (is_reduce) {
            previousResult = q.reduce(previousResult, value, idx);
          } else {
            results.push(value);
          }

      }

      if (to_continue) {
        //cursor.continue();
        cursor['continue'](); // Note: Must be quoted to avoid parse error.
      }
//      } else {
//        var result = is_reduce ? previousResult : results;
//        on_complete(result);
//      }
    } else {
      var result = is_reduce ? previousResult : results;
      on_complete(result);
    }
  };

  request.onerror = function(event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log([q, event]);
    }
    df.errback(event);
  };

};


/**
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!ydn.db.Query} q query.
 */
ydn.db.req.IndexedDb.prototype.fetchQuery = function(df, q) {

  var cursor = q.toCursor(this.schema);
  this.fetchCursor(df, cursor);

};



/**
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {string} table store name.
*/
ydn.db.req.IndexedDb.prototype.count = function (df, table) {

  var self = this;

  var store = this.tx.objectStore(table);
  var request = store.count();
  request.onsuccess = function (event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    df.callback(event.target.result);
  };
  request.onerror = function (event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    df.errback(event);
  };

};
