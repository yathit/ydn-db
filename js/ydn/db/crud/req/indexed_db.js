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
 * @fileoverview IndexedDB request executor.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.crud.req.IndexedDb');
goog.require('goog.async.DeferredList');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.crud.req.RequestExecutor');
goog.require('ydn.error');
goog.require('ydn.json');



/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @extends {ydn.db.crud.req.RequestExecutor}
 * @implements {ydn.db.crud.req.IRequestExecutor}
 * @struct
 */
ydn.db.crud.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.crud.req.IndexedDb, ydn.db.crud.req.RequestExecutor);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.req.IndexedDb.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.crud.req.IndexedDb');


/**
 *
 * @const {boolean} turn on debug flag to dump debug objects.
 */
ydn.db.crud.req.IndexedDb.DEBUG = false; // always false here.


/**
 * Large number of requests can cause memory hog without increasing performance.
 * @const
 * @type {number} Maximum number of requests created per transaction.
 */
ydn.db.crud.req.IndexedDb.REQ_PER_TX = 10;


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.countStores = function(tx, tx_no, df,
                                                           stores) {

  var me = this;
  var out = [];
  var msg = tx_no + ' countStores: ' + stores;
  this.logger.finest(msg);

  var count_store = function(i) {
    var table = stores[i];
    var store = tx.objectStore(table);
    var request = store.count();
    request.onsuccess = function(event) {
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      out[i] = event.target.result;
      i++;
      if (i == stores.length) {
        df(out);
        df = null;
      } else {
        count_store(i);
      }

    };
    request.onerror = function(event) {
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      event.preventDefault();
      df(request.error, true);
      df = null;
    };
  };

  if (stores.length == 0) {
    df([]);
    df = null;
  } else {
    count_store(0);
  }

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.addObject = function(tx, tx_no, df, table,
                                                         value, opt_key) {
  var store = tx.objectStore(table);
  var msg = tx_no + ' addObject: ' + table + ' ' + opt_key;
  this.logger.finest(msg);
  var me = this;
  var request;

  if (goog.isDef(opt_key)) {
    request = store.add(value, opt_key);
  } else {
    request = store.add(value);
  }

  request.onsuccess = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([event, table, value]);
    }
    df(event.target.result);
  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([event, table, value]);
    }
    event.preventDefault();
    df(request.error, true);
  };
};


/**
* @inheritDoc
*/
ydn.db.crud.req.IndexedDb.prototype.putObject = function(
    tx, tx_no, df, table, value, opt_key) {
  var store = tx.objectStore(table);
  var msg = tx_no + ' putObject to store "' + table + '" ' +
      (goog.isDef(opt_key) ? ' key: ' + opt_key : '');
  this.logger.finest(msg);
  // console.log(value);
  var me = this;
  var request;

  if (goog.isDef(opt_key)) {
    request = store.put(value, opt_key);
  } else {
    request = store.put(value);
  }

  request.onsuccess = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([event, table, value]);
    }
    df(event.target.result);
  };

  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([event, table, value]);
    }
    if (goog.DEBUG && event.name == 'DataError') {
      // give useful info.
      var str = ydn.json.stringify(value);
      event = new ydn.db.InvalidKeyException(table + ': ' +
          str.substring(0, 70));
    }
    event.preventDefault();
    df(request.error, true);
  };
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.addObjects = function(
    tx, tx_no, df, store_name, objs, opt_keys) {

  var results = [];
  var result_count = 0;

  var me = this;
  var has_error = true;
  var store = tx.objectStore(store_name);
  var msg = tx_no + ' addObjects: ' + store_name + ' ' +
      objs.length + ' objects';
  this.logger.finest(msg);

  var put = function(i) {

    var request;

    if (goog.isDefAndNotNull(opt_keys)) {
      request = store.add(objs[i], opt_keys[i]);
    } else {
      request = store.add(objs[i]);
    }

    request.onsuccess = function(event) {
      result_count++;
      //if (ydn.db.crud.req.IndexedDb.DEBUG) {
      //  window.console.log([store_name, event]);
      //}
      results[i] = event.target.result;
      if (result_count == objs.length) {
        df(results, has_error);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log([store_name, event]);
      }
      var error = request.error;
      if (goog.DEBUG) {
        me.logger.warning(tx_no + ' add request to "' + store_name +
            '" cause ' + error.name + ' for object "' +
            ydn.json.toShortString(objs[i]) + '" at index ' +
            i + ' of ' + objs.length + ' objects.');
      }
      results[i] = error;
      has_error = true;
      event.preventDefault(); // not abort the transaction.
      if (result_count == objs.length) {
        df(event.target.transaction, has_error);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

  };

  if (objs.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.IndexedDb.REQ_PER_TX &&
        i < objs.length; i++) {
      put(i);
    }
  } else {
    df([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.putObjects = function(tx, tx_no, df,
    store_name, objs, opt_keys) {

  var results = [];
  var result_count = 0;
  var has_error = false;

  var me = this;
  var store = tx.objectStore(store_name);
  var msg = tx_no + ' put ' + objs.length + ' objects' +
          ' to store "' + store_name + '"';
  this.logger.finest(msg);

  /**
   *
   * @param {IDBTransaction} tx
   */
  var out = function(tx) {
    if (has_error) {
      df(results, true);
    } else {
      df(results);
    }
  };

  var put = function(i) {

    var request;

    if (goog.isDefAndNotNull(opt_keys)) {
      request = store.put(objs[i], opt_keys[i]);
    } else {
      request = store.put(objs[i]);
    }

    request.onsuccess = function(event) {
      result_count++;
      //if (ydn.db.crud.req.IndexedDb.DEBUG) {
      //  window.console.log([store_name, event]);
      //}
      results[i] = event.target.result;
      if (result_count == objs.length) {
        out(event.target.transaction);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log([store_name, event]);
      }
      var error = request.error;
      if (goog.DEBUG) {
        me.logger.warning(tx_no + ' put request to "' + store_name +
            '" cause ' + error.name + ' for object "' +
            ydn.json.toShortString(objs[i]) + '" at index ' +
            i + ' of ' + objs.length + ' objects.');
      }
      // accessing request.error can cause InvalidStateError,
      // although it is not possible here since request has already done flag.
      // http://www.w3.org/TR/IndexedDB/#widl-IDBRequest-error
      results[i] = error;
      has_error = true;
      event.preventDefault(); // not abort the transaction.
      if (result_count == objs.length) {
        out(event.target.transaction);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

  };

  if (objs.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.IndexedDb.REQ_PER_TX &&
        i < objs.length; i++) {
      put(i);
    }
  } else {
    df([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.putByKeys = function(tx, tx_no, df, objs,
                                                         keys) {

  var results = [];
  var result_count = 0;
  var has_error = false;

  var out = function() {
    if (has_error) {
      df(results, true);
    } else {
      df(results);
    }
  };

  var me = this;

  var msg = tx_no + ' putByKeys: of ' + objs.length + ' objects';
  this.logger.finest(msg);

  var put = function(i) {
    /**
     * @type {!ydn.db.Key}
     */
    var key = keys[i];
    var store_name = key.getStoreName();
    var store = tx.objectStore(store_name);

    var request;

    if (goog.isNull(store.keyPath)) {
      request = store.put(objs[i], key.getId());
    } else {
      request = store.put(objs[i]);
    }

    request.onsuccess = function(event) {
      result_count++;
      //if (ydn.db.crud.req.IndexedDb.DEBUG) {
      //  window.console.log([store_name, event]);
      //}
      results[i] = event.target.result;
      if (result_count == objs.length) {
        out();
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log([store_name, event]);
      }
      var name = event.name;
      if (goog.DEBUG) {
        me.logger.warning('request result ' + name +
            ' error when put keys to "' + store_name + '" for object "' +
            ydn.json.toShortString(objs[i]) + '" at index ' +
            i + ' of ' + objs.length + ' objects.');
      }
      results[i] = request.error;
      has_error = true;
      event.preventDefault();
      if (result_count == objs.length) {
        out();
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

  };

  if (objs.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.IndexedDb.REQ_PER_TX &&
        i < objs.length; i++) {
      put(i);
    }
  } else {
    out();
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.putData = function(tx, tx_no, df,
    store_name, data, delimiter) {
  var me = this;
  var store = this.schema.getStore(store_name);
  var objectStore = tx.objectStore(store_name);
  var results = [];
  var prev_pos = data.indexOf('\n');
  var fields = data.substr(0, prev_pos).split(delimiter);
  var types = [];
  for (var j = 0; j < fields.length; j++) {
    var index = store.getIndex(fields[j]);
    if (index) {
      types[j] = index.getType();
    } else if (fields[j] == store.getKeyPath()) {
      types[j] = store.getType();
    }
  }
  prev_pos++;

  var msg = tx_no + ' Loading data ' + ' of ' + fields.length +
      '-fields record to ' + store_name;
  this.logger.finest(msg);

  var put = function() {

    var obj = {};
    var next_pos = data.indexOf('\n', prev_pos);
    var done = false;
    var text;
    if (next_pos == -1) {
      done = true;
      text = data.substring(prev_pos);
    } else {
      text = data.substring(prev_pos, next_pos);
      prev_pos = next_pos + 1;
    }

    var values = text.split(delimiter);
    for (var j = 0; j < fields.length; j++) {
      var value = values[j];
      if (types[j]) {
        if (types[j] == ydn.db.schema.DataType.TEXT) {
          value = goog.string.stripQuotes(value, '"');
        } else if (types[j] == ydn.db.schema.DataType.INTEGER) {
          value = parseInt(value, 10);
        } else if (types[j] == ydn.db.schema.DataType.NUMERIC) {
          value = parseFloat(value);
        }
      }
      obj[fields[j]] = value;
    }

    //console.log([text, obj]);

    var request = objectStore.put(obj);

    request.onsuccess = function(event) {

      //if (ydn.db.crud.req.IndexedDb.DEBUG) {
      //  window.console.log([store_name, event]);
      //}
      results.push(event.target.result);
      if (done) {
        df(results);
      } else {
        put();
      }
    };

    request.onerror = function(event) {

      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log([store_name, event]);
      }
      if (goog.DEBUG && event.name == 'DataError') {
        // give useful info.
        event = new ydn.db.InvalidKeyException(store + ': ' +
            text.substring(0, 70));
      }
      event.preventDefault();
      df(request.error, true);
      // abort transaction ?
    };

  };

  put();
};


/**
* @inheritDoc
*/
ydn.db.crud.req.IndexedDb.prototype.removeById = function(tx, tx_no, df,
                                                          store_name, key) {

  var me = this;
  var store = tx.objectStore(store_name);
  var msg = tx_no + ' clearById: ' + store_name + ' ' + key;
  this.logger.finest(msg);

  var request = store.openCursor(ydn.db.IDBKeyRange.only(key));
  request.onsuccess = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([store_name, key, event]);
    }
    var cursor = event.target.result;
    if (cursor) {
      var req = cursor['delete']();
      req.onsuccess = function(e) {
        df(1);
      };
      req.onerror = function(e) {
        df(event, true);
      };
    } else {
      df(undefined);
    }

  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([store_name, key, event]);
    }
    event.preventDefault();
    df(request.error, true);
  };

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.removeByKeys = function(tx, tx_no, df,
                                                            keys) {

  var me = this;
  var count = 0;
  var store_name, store, key;
  var msg = tx_no + ' removeByKeys: ' + keys.length + ' keys';
  this.logger.finest(msg);
  var errors = [];

  var removeAt = function(i) {

    if (i >= keys.length) {
      var has_failed = errors.length > 0;
      var out = has_failed ? errors : count;
      df(out, has_failed);
      return;
    }

    if (keys[i].getStoreName() != store_name) {
      store_name = keys[i].getStoreName();
      store = tx.objectStore(store_name);
    }

    var request = store['delete'](keys[i].getId());

    request.onsuccess = function(event) {
      i++;
      removeAt(i);
    };
    request.onerror = function(event) {
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log([store_name, key, event]);
      }
      event.preventDefault();
      errors[i] = request.error;
      removeAt(i);
    };
  };

  removeAt(0);

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.removeByKeyRange = function(
    tx, tx_no, df, store_name, key_range) {

  var me = this;
  var store = tx.objectStore(store_name);
  var request = store.count(key_range);
  var msg = tx_no + ' clearByKeyRange: ' + store_name + ' ' + key_range;
  this.logger.finest(msg);
  request.onsuccess = function(event) {
    var n = event.target.result;
    var req = store['delete'](key_range);
    req.onsuccess = function() {
      df(n);
    };
    req.onerror = function(e) {
      df(request.error, true);
    };
  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([store_name, key_range, event]);
    }
    me.logger.finest('count error ' + msg);
    event.preventDefault();
    df(request.error, true);
  };

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.clearByKeyRange = function(
    tx, tx_no, df, store_name, key_range) {

  var me = this;
  var store = tx.objectStore(store_name);

  var msg = tx_no + ' clearByKeyRange: ' + store_name + ' ' + key_range;
  this.logger.finest(msg);

  var req = store['delete'](key_range);
  req.onsuccess = function(event) {
    df(undefined);
  };
  req.onerror = function(event) {
    event.preventDefault();
    df(req.error, true);
  };

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.removeByIndexKeyRange = function(
    tx, tx_no, df, store_name, index_name, key_range) {

  var me = this;
  var store = tx.objectStore(store_name);
  var index = store.index(index_name);
  var msg = tx_no + ' clearByIndexKeyRange: ' + store_name + ':' + index_name +
      ' ' + key_range;
  this.logger.finest(msg);
  var errors = [];
  // var request = index.openKeyCursor(key_range);
  // theoritically key cursor should be able to delete the record, but
  // according to IndexedDB API spec, it is not.
  // if this cursor was created using openKeyCursor a DOMException of type
  // InvalidStateError is thrown.
  var request = index.openCursor(key_range);
  var n = 0;
  request.onsuccess = function(event) {
    var cursor = event.target.result;
    if (cursor) {
      //console.log(cursor);
      var req = cursor['delete']();
      req.onsuccess = function() {
        n++;
        cursor['continue']();
      };
      req.onerror = function(event) {
        errors.push(req.error);
        event.preventDefault();
        cursor['continue']();
      };
    } else {
      var has_failed = errors.length > 0;
      var out = has_failed ? errors : n;
      df(out, has_failed);
    }

  };
  request.onerror = function(event) {
    event.preventDefault();
    df(request.error, true);
  };

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.clearByStores = function(tx, tx_no, df,
                                                             store_names) {

  var me = this;
  var n_todo = store_names.length;
  var n_done = 0;
  var msg = tx_no + ' clearByStores: ' + store_names;
  this.logger.finest(msg);
  for (var i = 0; i < n_todo; i++) {
    var store_name = store_names[i];
    var store = tx.objectStore(store_name);
    var request = store.clear();
    request.onsuccess = function(event) {
      n_done++;
      // if (ydn.db.crud.req.IndexedDb.DEBUG) {
      //   window.console.log([n_done, event]);
      // }
      if (n_done == n_todo) {
        df(n_done);
      }
    };
    request.onerror = function(event) {
      n_done++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log([n_done, event]);
      }
      event.preventDefault();
      if (n_done == n_todo) {
        df(request.error, true);
      }
    };
  }
};


/**
 * General executor for LIST methods.
 * @param {ydn.db.con.IDatabase.Transaction} tx tx.
 * @param {string} tx_no tx label.
 * @param {?function(*, boolean=)} df object in deferred function.
 * @param {string} store_name store name.
 * @param {string?} index index name.
 * @param {IDBKeyRange} key_range range to list.
 * @param {boolean} reverse to sort reverse order.
 * @param {number} limit the results.
 * @param {number} offset skip first results.
 * @param {boolean=} opt_unique unique attribute for index listing.
 * @private
 */
ydn.db.crud.req.IndexedDb.prototype.listByKeyRange_ = function(tx, tx_no, df,
    store_name, index, key_range, reverse, limit, offset, opt_unique) {
  var me = this;
  var results = [];
  var store = tx.objectStore(store_name);
  var dir = ydn.db.base.getDirection(reverse, opt_unique);
  var msg = tx_no + ' listByKeyRange: ' + store_name +
      (index ? ':' + index : '') +
      (key_range ? ydn.json.stringify(key_range) : '');
  if (reverse) {
    msg += ' reverse';
  }
  if (opt_unique) {
    msg += ' unique';
  }
  this.logger.finest(msg);
  var request;
  if (index) {
    request = store.index(index).openCursor(key_range, dir);
  } else {
    request = store.openCursor(key_range, dir);
  }

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
        cursor.advance(offset);
        return;
      }
      results.push(cursor.value);
      if (results.length < limit) {
        cursor['continue']();
      } else {
        me.logger.finest(tx_no + ' success ' + results.length + ' objects');
        df(results);
      }
    } else {
      me.logger.finest(tx_no + ' success ' + results.length + ' objects');
      df(results);
    }
  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([store_name, event]);
    }
    event.preventDefault();
    df(request.error, true);
  };
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.listByKeyRange =
    function(tx, tx_no, df, store_name, key_range, reverse, limit, offset) {
  this.listByKeyRange_(tx, tx_no, df, store_name, null, key_range, reverse,
      limit, offset);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.listByIndexKeyRange = function(tx, tx_no,
    df, store_name, index, key_range, reverse, limit, offset, unique) {
  this.listByKeyRange_(tx, tx_no, df,
      store_name, index, key_range, reverse, limit, offset, unique);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.keysByKeyRange = function(tx, tx_no, df,
    store_name, key_range, reverse, limit, offset) {
  var results = [];
  var me = this;
  var store = tx.objectStore(store_name);
  var dir = ydn.db.base.getDirection(reverse);
  var msg = tx_no + ' keysByKeyRange: ' + store_name + ' ' + key_range;
  this.logger.finest(msg);
  var request = store.openCursor(key_range, dir);
  var cued = false;
  request.onsuccess = function(event) {
    var cursor = event.target.result;
    if (cursor) {
      if (!cued && offset > 0) {
        cued = true;
        cursor.advance(offset);
        return;
      }
      results.push(cursor.key);
      if (results.length < limit) {
        cursor['continue']();
      } else {
        df(results);
      }
    } else {
      df(results);
    }
  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([store_name, event]);
    }
    event.preventDefault();
    df(request.error, true);
  };
};

//
///**
// * @inheritDoc
// */
//ydn.db.crud.req.IndexedDb.prototype.keysByStore = function(df, store_name,
//    reverse, limit, offset) {
//  var me = this;
//  var results = [];
//  var store = this.tx.objectStore(store_name);
//  var dir = ydn.db.base.getDirection(reverse);
//  var msg = 'keysByStore: ' + store_name;
//  this.logger.finest(msg);
//  var request = store.openCursor(null, dir);
//  var cued = false;
//  request.onsuccess = function(event) {
//    /**
//     * @type {IDBCursor}
//     */
//    var cursor = event.target.result;
//    if (cursor) {
//      if (!cued && offset > 0) {
//        cued = true;
//        cursor.advance(offset);
//        return;
//      }
//      results.push(cursor.primaryKey);
//      if (results.length < limit) {
//        cursor['continue']();
//      } else {
//        me.logger.finest('success ' + msg);
//        df.callback(results);
//      }
//    } else {
//      me.logger.finest('success ' + msg);
//      df.callback(results);
//    }
//  };
//  request.onerror = function(event) {
//    if (ydn.db.crud.req.IndexedDb.DEBUG) {
//      window.console.log([store_name, event]);
//    }
//    me.logger.finest('error ' + msg);
//    df.errback(event);
//  };
//};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.keysByIndexKeyRange = function(tx, lbl, df,
    store_name, index_name, key_range, reverse, limit, offset, unique) {
  var results = [];
  var me = this;
  var store = tx.objectStore(store_name);
  var index = store.index(index_name);
  var msg = lbl + ' keysByStore: ' + store_name + ':' + index_name + ' ' +
      key_range;
  this.logger.finest(msg);
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
        cursor.advance(offset);
        return;
      }
      results.push(cursor.primaryKey);
      if (results.length < limit) {
        cursor['continue']();
      }
    } else {
      df(results);
    }
  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([store_name, event]);
    }
    event.preventDefault();
    df(request.error, true);
  };
};


/**
* @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.listByStore = function(tx, tx_no, df,
                                                           store_name) {
  var me = this;
  var results = [];
  var msg = tx_no + ' listByStore: ' + store_name;
  this.logger.finest(msg);

  var store = tx.objectStore(store_name);

  // Get everything in the store;
  var request = store.openCursor();

  request.onsuccess = function(event) {
    var cursor = event.target.result;
    if (cursor) {
      results.push(cursor['value']);
      cursor['continue'](); // result.continue();
    } else {
      df(results);

    }
  };

  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([store_name, event]);
    }
    event.preventDefault();
    df(request.error, true);
  };

};


/**
* @inheritDoc
*/
ydn.db.crud.req.IndexedDb.prototype.getById = function(tx, tx_no, df,
                                                       store_name, id) {

  var me = this;
  var msg = tx_no + ' getById: ' + store_name + ':' + id;
  this.logger.finest(msg);
  var store = tx.objectStore(store_name);

  var request = store.get(id);

  request.onsuccess = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    me.logger.finest(tx_no + ' record ' + id +
        (goog.isDefAndNotNull(event.target.result) ? ' ' : ' not ') +
        ' exists.');
    df(event.target.result);
  };

  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log([store_name, id, event]);
    }
    //me.logger.warning('Error retrieving ' + id + ' in ' + store_name + ' ' +
    // event.message);
    event.preventDefault();
    df(request.error, true);
  };
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.listByIds = function(tx, tx_no, df,
                                                         store_name, ids) {
  var me = this;

  var results = [];
  var result_count = 0;
  var store = tx.objectStore(store_name);
  var n = ids.length;
  var msg = tx_no + ' listByIds: ' + store_name + ':' + n + ' ids';
  this.logger.finest(msg);

  var get = function(i) {

    if (!goog.isDefAndNotNull(ids[i])) {
      // should we just throw error ?
      result_count++;
      results[i] = undefined;
      if (result_count == n) {
        df(results);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
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
        if (ydn.db.crud.req.IndexedDb.DEBUG) {
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
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log([store_name, ids, i, event]);
      }
      results[i] = event.target.result;
      if (result_count == n) {
        df(results);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < n) {
          get(next);
        }
      }
    });

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log([store_name, ids, i, event]);
      }
      event.preventDefault();
      df(request.error, true);
    };

  };

  if (n > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.IndexedDb.REQ_PER_TX && i < n; i++) {
      get(i);
    }
  } else {
    df([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.listByKeys = function(tx, tx_no, df, keys) {
  var me = this;

  var results = [];
  var result_count = 0;
  var msg = tx_no + ' listByKeys: ' + keys.length + ' ids';
  this.logger.finest(msg);

  var getKey = function(i) {
    /**
     * @type {!ydn.db.Key}
     */
    var key = keys[i];
    /**
     * @type {IDBObjectStore}
     */
    var store = tx.objectStore(key.getStoreName());
    var request = store.get(key.getId());

    request.onsuccess = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log(event);
      }
      results[i] = event.target.result;
      if (result_count == keys.length) {
        df(results);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < keys.length) {
          getKey(next);
        }
      }
    };

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        window.console.log([keys, event]);
      }
      event.preventDefault();
      df(request.error, true);
    };

  };

  if (keys.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.IndexedDb.REQ_PER_TX && i < keys.length;
         i++) {
      getKey(i);
    }
  } else {
    df([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.countKeyRange = function(tx, tx_no, df,
    table, keyRange, index_name) {

  var me = this;
  var store = tx.objectStore(table);
  var msg = tx_no + ' countKeyRange: ' + table +
      (index_name ? ':' + index_name : '') +
      (keyRange ? ':' + ydn.json.stringify(keyRange) : '');
  this.logger.finest(msg);
  var request;
  if (goog.isDefAndNotNull(index_name)) {
    var index = store.index(index_name);
    if (goog.isDefAndNotNull(keyRange)) {
      request = index.count(keyRange);
    } else {
      request = index.count();
    }
  } else {
    if (goog.isDefAndNotNull(keyRange)) {
      request = store.count(keyRange);
    } else {
      request = store.count();
    }
  }

  request.onsuccess = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    df(event.target.result);
  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      window.console.log(event);
    }
    event.preventDefault();
    df(request.error, true);
  };

};

