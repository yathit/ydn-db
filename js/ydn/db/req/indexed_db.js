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
goog.require('ydn.db.IDBCursor');
goog.require('ydn.db.IDBValueCursor');
goog.require('ydn.db.req.IdbQuery');
goog.require('ydn.error');
goog.require('ydn.json');


/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @extends {ydn.db.req.RequestExecutor}
 * @param {!ydn.db.schema.Database} schema schema.
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
ydn.db.req.IndexedDb.DEBUG = false;


/**
 *
 * Large number of requests can cause memory hog without increasing performance.
 * @const
 * @type {number} Maximum number of requests created per transaction.
 */
ydn.db.req.IndexedDb.REQ_PER_TX = 10;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.req.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.req.IndexedDb');



/**
* Execute PUT request either storing result to tx or callback to df.
* @param {goog.async.Deferred} df deferred to feed result.
* @param {string} table table name.
* @param {!Object} value object to put.
* @param {(!Array|string|number)=} opt_key optional out-of-line key.
*/
ydn.db.req.IndexedDb.prototype.putObject = function(df, table, value, opt_key)
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
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log([event, table, value]);
    }
    df.callback(event.target.result);
  };
  request.onerror = function(event) {
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
 * @param {!Array.<(!Array|string|number)>=} opt_keys optional out-of-line keys.
 */
ydn.db.req.IndexedDb.prototype.putObjects = function(df, store_name, objs,
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

    request.onerror = function(event) {
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
    for (var i = 0; i < ydn.db.req.IndexedDb.REQ_PER_TX &&
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
ydn.db.req.IndexedDb.prototype.clearById = function(df, store_name, key) {

  var store = this.tx.objectStore(store_name);
  var request = store['delete'](key);
  request.onsuccess = function(event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log([store_name, key, event]);
    }
    df.callback(event.target.result);
  };
  request.onerror = function(event) {
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
 * @param {(string|!Array.<string>)=} opt_store_name store name.
 */
ydn.db.req.IndexedDb.prototype.clearByStore = function(df, opt_store_name) {

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
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log([n_done, event]);
      }
      if (n_done == n_todo) {
        df.callback(true);
      }
    };
    request.onerror = function(event) {
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
ydn.db.req.IndexedDb.prototype.getKeysByStore = function(df, not_key_only,
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
ydn.db.req.IndexedDb.prototype.listByStores = function(df, store_names) {
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
      if (ydn.db.req.IndexedDb.DEBUG) {
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
ydn.db.req.IndexedDb.prototype.getById = function(df, store_name, id) {

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
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    df.callback(event.target.result);
  };

  request.onerror = function(event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
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
ydn.db.req.IndexedDb.prototype.getByQuery = function(df, q) {

  var obj;

  /**
   *
   * @param {ydn.db.ICursor} cursor
   */
  var next = function(cursor) {
    obj = cursor.value();
    return true; // to break the iteration
  };

  var req = this.open(q, next);
  req.addCallback(function () {
    df.callback(obj);
  });
  req.addErrback(function (e) {
    df.errback(e);
  });

};


/**
 * @inheritDoc
 */
ydn.db.req.IndexedDb.prototype.listByIds = function(df, store_name, ids) {
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
        var next = i + ydn.db.req.IndexedDb.REQ_PER_TX;
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
        if (ydn.db.req.IndexedDb.DEBUG) {
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
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log([store_name, ids, i, event]);
      }
      results[i] = event.target.result;
      if (result_count == n) {
        df.callback(results);
      } else {
        var next = i + ydn.db.req.IndexedDb.REQ_PER_TX;
        if (next < n) {
          get(next);
        }
      }
    });

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log([store_name, ids, i, event]);
      }
      df.errback(event);
    };

  };

  if (n > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.req.IndexedDb.REQ_PER_TX && i < n; i++) {
      get(i);
    }
  } else {
    df.callback([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.req.IndexedDb.prototype.listByKeys = function(df, keys) {
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

    request.onsuccess = function(event) {
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

    request.onerror = function(event) {
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
    for (var i = 0; i < ydn.db.req.IndexedDb.REQ_PER_TX && i < keys.length; i++)
    {
      get(i);
    }
  } else {
    df.callback([]);
  }
};

//
///**
// * Index scanning.
// * @param {!Array.<!ydn.db.Query>>} indexes list of indexes.
// * @param {(function(keys: !Array, index_keys: !Array): number)=} callback
// * @param {number=} limit limit number of match results.
// * @param {boolean=} no_prefetch no prefetching of result.
// * @return {!goog.async.Deferred} promise on completed.
// */
//ydn.db.req.IndexedDb.prototype.scan = function(indexes, callback, limit, no_prefetch) {
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
 * Open an index. This will resume depending on the cursor state.
 * @param {!ydn.db.Query} iterator The cursor.
 * @param {ydn.db.base.CursorMode} mode mode.
 * @return {{
 *    onnext: Function,
 *    onerror: Function,
 *    forward: Function
 *    }}
 */
ydn.db.req.IndexedDb.prototype.openQuery = function(iterator, mode) {

  var result = {
    onnext: null,
    onerror: null,
    forward: null
  };

  var me = this;
  var store = this.schema.getStore(iterator.store_name);

  /**
   * @type {IDBObjectStore}
   */
  var obj_store;
  try {
    obj_store = this.tx.objectStore(store.name);
  } catch (e) {
    if (goog.DEBUG && e.name == 'NotFoundError') {
      var msg = this.tx.db.objectStoreNames.contains(store.name) ?
          'store: ' + store.name + ' not in transaction.' :
          'store: ' + store.name + ' not in database: ' + this.tx.db.name;
      throw new ydn.db.NotFoundError(msg);
    } else {
      throw e; // InvalidStateError: we can't do anything about it ?
    }
  }

  var resume = iterator.has_done === false;
  if (resume) {
    // continue the iteration
    goog.asserts.assert(iterator.store_key);
  } else { // start a new iteration
    iterator.counter = 0;
  }
  iterator.has_done = undefined; // switching to working state.

  var index = null;
  if (goog.isDefAndNotNull(iterator.index)) {
    if (iterator.index != store.keyPath) {
      try {
        index = obj_store.index(iterator.index);
      } catch (e) {

        /**
         * externs file fix.
         * @type {DOMStringList}
         */
        var indexNames = /** @type {DOMStringList} */ (obj_store.indexNames);
        if (goog.DEBUG && e.name == 'NotFoundError') {
          var msg = indexNames.contains(iterator.index) ?
              'index: ' + iterator.index + ' of ' + obj_store.name +
                  ' not in transaction scope' :
              'index: ' + iterator.index + ' not found in store: ' +
                  obj_store.name;
          throw new ydn.db.NotFoundError(msg);
        } else {
          throw e;
        }
      }
    }
  }

  var dir = /** @type {number} */ (iterator.direction); // new standard is string.

  // keyRange is nullable but cannot be undefined.
  var keyRange = goog.isDef(iterator.keyRange) ? iterator.keyRange : null;

  var key_only = mode === ydn.db.base.CursorMode.KEY_ONLY;

  var cur = null;

  /**
   * Make cursor opening request.
   */
  var open_request = function() {
    var request;
    if (key_only) {
      if (index) {
        if (goog.isDefAndNotNull(dir)) {
          request = index.openKeyCursor(keyRange, dir);
        } else if (goog.isDefAndNotNull(keyRange)) {
          request = index.openKeyCursor(keyRange);
        } else {
          request = index.openKeyCursor();
        }
      } else {
        throw new ydn.error.InvalidOperationException(
          'object store cannot open for key cursor');
      }
    } else {
      if (index) {
        if (goog.isDefAndNotNull(dir)) {
          request = index.openCursor(keyRange, dir);
        } else if (goog.isDefAndNotNull(keyRange)) {
          request = index.openCursor(keyRange);
        } else {
          request = index.openCursor();
        }
      } else {
        if (goog.isDefAndNotNull(dir)) {
          request = obj_store.openCursor(keyRange, dir);
        } else if (goog.isDefAndNotNull(keyRange)) {
          request = obj_store.openCursor(keyRange);
          // some browser have problem with null, even though spec said OK.
        } else {
          request = obj_store.openCursor();
        }
      }
    }

    me.logger.finest('Iterator: ' + iterator + ' opened.');

    var cue = false;
    request.onsuccess = function (event) {
      cur = (event.target.result);
      if (cur) {
        if (resume) {
          // cue to correct position
          if (cur.key != iterator.key) {
            if (cue) {
              me.logger.warning('Resume corrupt on ' + iterator.store_name + ':' +
                iterator.store_key + ':' + iterator.index_key);
              result.onerror(new ydn.db.InvalidStateError());
              return;
            }
            cue = true;
            cur['continue'](iterator.key);
            return;
          } else {
            if (cur.primaryKey == iterator.index_key) {
              resume = false; // got it
            }
            // we still need to skip the current position.
            cur['continue']();
            return;
          }
        }

        // invoke next callback function
        //console.log(cur);
        iterator.counter++;
        iterator.store_key = cur.primaryKey;
        iterator.index_key = cur.key;
        var value = key_only ? undefined : cur['value'];

        result.onnext(cur.primaryKey, cur.key, value);

      } else {
        iterator.has_done = true;
        me.logger.finest('Iterator: ' + iterator + ' completed.');
        result.onnext(); // notify that cursor iteration is finished.
      }

    };

    request.onerror = function (event) {
      result.onerror(event);
    };

  };

  open_request();

  result.forward = function (next_position) {
    //console.log(['next_position', cur, next_position]);

    if (cur) {
      if (next_position === false) {
        // restart the iterator
        me.logger.finest('Iterator: ' + iterator + ' restarting.');
        iterator.has_done = undefined;
        iterator.counter = 0;
        iterator.store_key = undefined;
        iterator.index_key = undefined;
        cur = null;
        open_request();
      } else if (next_position === true) {
        if (goog.DEBUG && iterator.has_done) {
          me.logger.warning('Iterator: ' + iterator + ' completed, ' +
            'but continuing.');
        }
        cur['continue']();
      } else if (goog.isDefAndNotNull(next_position)) {
        if (goog.DEBUG && iterator.has_done) {
          me.logger.warning('Iterator: ' + iterator + ' completed, ' +
            'but continuing to ' + next_position);
        }
        cur['continue'](next_position);
      } else {
        me.logger.finest('Iterator: ' + iterator + ' resting.');
        iterator.has_done = false; // decided not to continue.
      }
    } else {
      me.logger.severe(iterator + ' cursor gone.');
    }
  };



  return result;
};


/**
 *
 * @param {!ydn.db.Query} cursor the cursor.
 * @param {Function} callback icursor handler.
 * @param {ydn.db.base.CursorMode?=} mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.req.IndexedDb.prototype.open = function(cursor, callback, mode) {

  var df = new goog.async.Deferred();
  var me = this;
  mode = mode || ydn.db.base.CursorMode.READ_ONLY;


  var req = this.openQuery(cursor, mode);
  req.onerror = function(e) {
    df.errback(e);
  };
  req.onnext = function (cur) {
    var i_cursor = new ydn.db.IDBValueCursor(cur, [], mode == 'readonly');
    var adv = callback(i_cursor);
    i_cursor.dispose();
    req.forward(adv);
  };

  return df;
};




/**
 * Cursor scan iteration.
 * @param {!goog.async.Deferred} df promise on completed.
 * @param {!Array.<!ydn.db.Query>} queries the cursor.
 * @param {Function} join_algo next callback handler.
 * @param {number=} limit limit number of matched results.
 * @param {boolean=} no_collect_key if true not prefetch.
 * @param {boolean=} no_prefetch if true not prefetch.
 */
ydn.db.req.IndexedDb.prototype.scan = function(df, queries, join_algo, limit,
                                               no_collect_key, no_prefetch) {

  var me = this;
  var mode = ydn.db.base.CursorMode.KEY_ONLY;

  var done = false;
  var n = queries.length;
  var keys = [];
  var index_keys = [];
  var requests = [];

  var match_keys, match_index_keys, result_values, objStore;
  if (!no_collect_key) {
    match_keys = [];
    match_index_keys = [];
  }
  if (!no_prefetch) {
    result_values = [];
    objStore = this.tx.objectStore(queries[0].getStoreName());
  }

  var pre_fetch_count = 0;
  var do_prefetch = function(i, key) {
    var req = objStore.get(key);
    req.onsuccess = function (event) {
      pre_fetch_count++;
      result_values[i] = event.target.result;

      if (done && pre_fetch_count == 0) {
        df.callback({
          'keys': match_keys,
          'indexKeys': match_index_keys,
          'values': result_values});
      }
    };
    req.onerror = function(e) {
      pre_fetch_count++;
      result_values[i] = null;

      if (done && pre_fetch_count == 0) {
        df.callback({
          'keys': match_keys,
          'indexKeys': match_index_keys,
          'values': result_values});
      }
    };
  };

  var existed = false;
  var do_exit = function() {
    if (existed) {
      throw new ydn.error.InternalError('existed');
    }
    for (var k = 0; k < queries.length; k++) {
      if (!goog.isDef(queries[k].has_done)) {
        // change iterators busy state to resting state.
        queries[k].has_done = false;
      }
    }

    if (no_prefetch) {
      df.callback({
        'keys':match_keys,
        'indexKeys':match_index_keys,
        'values':result_values});
    } else if (pre_fetch_count == 0) {
      df.callback({
        'keys':match_keys,
        'indexKeys':match_index_keys,
        'values':result_values});
    }

    done = true;
  };

  var result_count = 0;
  var has_key_count = 0;
  /**
   * Received cursor result.
   * @param {number} i
   * @param {*} key
   * @param {*} indexKey
   * @param {*} value
   */
  var next = function (i, key, indexKey, value) {
    if (done) {
      if (ydn.db.req.IndexedDb.DEBUG) {
        window.console.log(['next', i, key, indexKey, value,  queries[i]]);
      }
      throw new ydn.error.InternalError();
    }
    //console.log(['next', i, key, indexKey, value,  queries[i]]);
    result_count++;

    keys[i] = key;
    index_keys[i] = indexKey;
    //console.log([i, key, indexKey]);
    if (result_count === n) { // receive all cursor results
      result_count = 0; // reset for new iteration
      // check for match
      if (!no_collect_key && goog.isDefAndNotNull(keys[0])) {
        var same_key = true;
        for (var k = 1; k < keys.length; k++) {
          if (goog.isArray(keys[0])) {
            if (!goog.array.equals(keys[i - 1], keys[i])) {
              same_key = false;
              break;
            }
          } else if (keys[i - 1] != keys[i]) {
            same_key = false;
            break;
          }
        }
        if (same_key) {
          match_keys.push(keys[0]);
          match_index_keys.push(ydn.object.clone(index_keys));
          pre_fetch_count--;
          do_prefetch(match_keys.length - 1, keys[0]);
        }
      }

      // all cursor has results, than sent to join algorithm callback.
      var adv = join_algo(keys, index_keys);
      //console.log('join_algo: ' + adv + ' of ' + keys[0]);
      if (goog.isArray(adv)) {
        goog.asserts.assert(adv.length === n);

        for (var j = 0; j < n; j++) {
          var query = queries[j];
          if (goog.isDefAndNotNull(adv[j])) {
            if (!goog.isDefAndNotNull(keys[j])) {
              throw new ydn.error.InvalidOperationError('Return value at ' + j + ' must not set.');
            }
            keys[j] = undefined;
            index_keys[j] = undefined;
            //console.log('moving ' + i + ' to ' + adv[j]);
            requests[j].forward(adv[j]);

          } else {
            // pass
            // reuse previous result
            // increase the result counter since we already have it
            result_count++;
          }
        }
        var is_moving = result_count < n;
        if (!is_moving) {
          do_exit();
        }
      } else {
        // end of iteration
        do_exit();
      }

    }
  };

  var on_error = function (e) {
    df.errback(e);
  };

  for (var i = 0; i < queries.length; i++) {
    var query = queries[i];
    var req = this.openQuery(query, mode);
    req.onerror = on_error;
    req.onnext = goog.partial(next, i);
    requests[i] = req;
  }

};


/**
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!ydn.db.Query} q query.
 * @param {?function(*): boolean} clear clear iteration function.
 * @param {?function(*): *} update update iteration function.
 * @param {?function(*): *} map map iteration function.
 * @param {?function(*, *, number): *} reduce reduce iteration function.
 * @param {*} initial initial value for reduce iteration function.
 * @param {?function(*): *} finalize finalize function.
 */
ydn.db.req.IndexedDb.prototype.iterate = function(df, q, clear, update, map,
                                                  reduce, initial, finalize) {
  var me = this;
  var is_reduce = goog.isFunction(reduce);

  var mode = goog.isFunction(clear) || goog.isFunction(update) ?
    ydn.db.base.CursorMode.READ_WRITE :
    ydn.db.base.CursorMode.READ_ONLY;


  var idx = -1; // iteration index
  var results = [];
  var previousResult = initial;

  var request = this.open(q, function (cursor) {

    var value = cursor.value();
    idx++;
    //console.log([idx, cursor.key(), value]);

    var consumed = false;

    if (goog.isFunction(clear)) {
      var to_clear = clear(value);
      if (to_clear === true) {
        consumed = true;
        cursor.clear();
      }
    }

    if (!consumed && goog.isFunction(update)) {
      var updated_value = update(value);
      if (updated_value !== value) {
        cursor.update(updated_value);
      }
    }

    if (goog.isFunction(map)) {
      value = map(value);
    }

    if (is_reduce) {
      previousResult = reduce(value, previousResult, idx);
    } else {
      results.push(value);
    }

  }, mode);

  request.addCallback(function() {
    var result = is_reduce ? previousResult : results;
    if (goog.isFunction(finalize)) {
      result = finalize(result);
    }
    df.callback(result);
  });

  request.addErrback(function(event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log([q, event]);
    }
    df.errback(event);
  });

};


/**
 * @inheritDoc
 */
ydn.db.req.IndexedDb.prototype.listByQuery = function(df, q) {
  var arr = [];
  var req = this.open(q, function(cursor) {
    arr.push(cursor.value());
  });
  req.addCallbacks(function() {
    df.callback(arr);
  }, function(e) {
    df.errback(e);
  })
};


/**
* @param {goog.async.Deferred} df deferred to feed result.
* @param {!ydn.db.Query} q query.
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
  } catch (e) {
    if (goog.DEBUG && e.name == 'NotFoundError') {
      var msg = this.tx.db.objectStoreNames.contains(store.name) ?
          'store: ' + store.name + ' not in transaction.' :
          'store: ' + store.name + ' not in database: ' + this.tx.db.name;
      throw new ydn.db.NotFoundError(msg);
    } else {
      throw e; // InvalidStateError: we can't do anything about it ?
    }
  }

  /**
   * externs file fix.
   * @type {DOMStringList}
   */
  var indexNames = /** @type {DOMStringList} */ (obj_store.indexNames);

  var index = null;

  if (goog.isDefAndNotNull(q.index)) {
    if (q.index != store.keyPath) {
      try {
        index = obj_store.index(q.index);
      } catch (e) {
        if (goog.DEBUG && e.name == 'NotFoundError') {
          var msg = indexNames.contains(q.index) ?
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
    } else if (goog.isDefAndNotNull(keyRange)) {
      request = index.openCursor(keyRange);
    } else {
      request = index.openCursor();
    }
  } else {
    if (goog.isDefAndNotNull(dir)) {
      request = obj_store.openCursor(keyRange, dir);
    } else if (goog.isDefAndNotNull(keyRange)) {
      request = obj_store.openCursor(keyRange);
      // some browser have problem with null, even though spec said OK.
    } else {
      request = obj_store.openCursor();
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
 *
 * @param {goog.async.Deferred} df deferred to feed result.
 * @param {!ydn.db.Sql} q query.
 */
ydn.db.req.IndexedDb.prototype.fetchQuery = function(df, q) {

  var cursor = q.toIdbQuery(this.schema);
  this.fetchCursor(df, cursor);

};


/**
 * @inheritDoc
 */
ydn.db.req.IndexedDb.prototype.executeSql = function(df, sql) {
  var cursor = sql.toIdbQuery(this.schema);
  var initial = goog.isFunction(cursor.initial) ? cursor.initial() : undefined;
  this.iterate(df, cursor, null, null,
    cursor.map, cursor.reduce, initial, cursor.finalize);
  return df;
};


/**
 * @inheritDoc
 */
ydn.db.req.IndexedDb.prototype.explainQuery = function(query) {
  return /** @type {Object} */ (query.toJSON());
};



/**
 * @inheritDoc
 */
ydn.db.req.IndexedDb.prototype.explainSql = function(sql) {
  var cursor = sql.toIdbQuery(this.schema);
  var json = /** @type {Object} */ (cursor.toJSON());
  json['map'] = cursor.map ? cursor.map.toString() : null;
  json['reduce'] = cursor.reduce ? cursor.reduce.toString() : null;
  json['initial'] = cursor.initial;
  return json;
};


/**
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {!Array.<string>}  stores store name.
*/
ydn.db.req.IndexedDb.prototype.countStores = function(df, stores) {

  var me = this;
  var total = 0;

  var count_store = function(i) {
    var table = stores[i];
    var store = me.tx.objectStore(table);
    var request = store.count();
    request.onsuccess = function(event) {
      if (ydn.db.req.IndexedDb.DEBUG) {
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
      if (ydn.db.req.IndexedDb.DEBUG) {
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
 * @param {!goog.async.Deferred} df return a deferred function.
 * @param {string} table store name.
 * @param {ydn.db.KeyRange} keyRange key range.
 */
ydn.db.req.IndexedDb.prototype.countKeyRange = function(df, table, keyRange) {

  var self = this;

  var key_range = ydn.db.IDBKeyRange.bound(keyRange.lower, keyRange.upper,
      keyRange.lowerOpen, keyRange.upperOpen);

  var store = this.tx.objectStore(table);
  var request = store.count(key_range);
  request.onsuccess = function(event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    df.callback(event.target.result);
  };
  request.onerror = function(event) {
    if (ydn.db.req.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    df.errback(event);
  };

};
