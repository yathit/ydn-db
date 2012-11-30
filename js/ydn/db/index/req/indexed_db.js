
/**
 * @fileoverview Implements ydn.db.io.QueryService with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.index.req.IndexedDb');
goog.require('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.index.req.IRequestExecutor');
goog.require('ydn.db.algo.AbstractSolver');
goog.require('ydn.db.IDBCursor');
goog.require('ydn.db.IDBValueCursor');
goog.require('ydn.db.index.req.IDBCursor');
goog.require('ydn.error');
goog.require('ydn.json');


/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @extends {ydn.db.core.req.IndexedDb}
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.index.req.IRequestExecutor}
 */
ydn.db.index.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.index.req.IndexedDb, ydn.db.core.req.IndexedDb);


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.index.req.IndexedDb.DEBUG = false;



/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.index.req.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.index.req.IndexedDb');


/**
 * @inheritDoc
 */
ydn.db.index.req.IndexedDb.prototype.getByIterator = goog.abstractMethod;


/**
 * @protected
 * @return {!IDBTransaction}
 */
ydn.db.index.req.IndexedDb.prototype.getTx = function() {
  return /** @type {!IDBTransaction} */ (this.tx);
};



//
//
///**
// * @param {goog.async.Deferred} df deferred to feed result.
// * @param {!ydn.db.Iterator} q query.
// */
//ydn.db.index.req.IndexedDb.prototype.fetchCursor = function(df, q) {
//  var me = this;
//  var store = this.schema.getStore(q.store_name);
//  var is_reduce = goog.isFunction(q.reduce);
//
//  var on_complete = function(result) {
//    if (goog.isFunction(q.finalize)) {
//      df.callback(q.finalize(result));
//    } else {
//      df.callback(result);
//    }
//  };
//
//  //console.log('to open ' + q.op + ' cursor ' + value + ' of ' + column +
//  // ' in ' + table);
//  var obj_store;
//  try {
//    obj_store = this.tx.objectStore(store.name);
//  } catch (e) {
//    if (goog.DEBUG && e.name == 'NotFoundError') {
//      var msg = this.tx.db.objectStoreNames.contains(store.name) ?
//        'store: ' + store.name + ' not in transaction.' :  // ??
//        'store: ' + store.name + ' not in database: ' + this.tx.db.name;
//      throw new ydn.db.NotFoundError(msg);
//    } else {
//      throw e; // InvalidStateError: we can't do anything about it ?
//    }
//  }
//
//  /**
//   * externs file fix.
//   * @type {DOMStringList}
//   */
//  var indexNames = /** @type {DOMStringList} */ (obj_store.indexNames);
//
//  var index = null;
//
//  if (goog.isDefAndNotNull(q.index)) {
//    if (q.index != store.keyPath) {
//      try {
//        index = obj_store.index(q.index);
//      } catch (e) {
//        if (goog.DEBUG && e.name == 'NotFoundError') {
//          var msg = indexNames.contains(q.index) ?
//            'index: ' + q.index + ' of ' + obj_store.name +
//              ' not in transaction scope' :
//            'index: ' + q.index + ' not found in store: ' + obj_store.name;
//          throw new ydn.db.NotFoundError(msg);
//        } else {
//          throw e;
//        }
//      }
//    }
//  }
//
//  //console.log('opening ' + q.op + ' cursor ' + value + ' ' + value_upper +
//  // ' of ' + column + ' in ' + table);
//  var request;
//  var dir = /** @type {number} */ (q.direction); // new standard is string.
//
//  // keyRange is nullable but cannot be undefined.
//  var keyRange = q.getKeyRange();
//
//  if (index) {
//    if (goog.isDefAndNotNull(dir)) {
//      request = index.openCursor(keyRange, dir);
//    } else if (goog.isDefAndNotNull(keyRange)) {
//      request = index.openCursor(keyRange);
//    } else {
//      request = index.openCursor();
//    }
//  } else {
//    if (goog.isDefAndNotNull(dir)) {
//      request = obj_store.openCursor(keyRange, dir);
//    } else if (goog.isDefAndNotNull(keyRange)) {
//      request = obj_store.openCursor(keyRange);
//      // some browser have problem with null, even though spec said OK.
//    } else {
//      request = obj_store.openCursor();
//    }
//  }
//
//  var idx = -1; // iteration index
//  var results = [];
//  var previousResult = goog.isFunction(q.initial) ? q.initial() : undefined;
//
//  request.onsuccess = function(event) {
//
//    if (ydn.db.core.req.IndexedDb.DEBUG) {
//      window.console.log([q, idx, event]);
//    }
//    /**
//     * @type {IDBCursor}
//     */
//    var cursor = /** @type {IDBCursor} */ (event.target.result);
//    //console.log(cursor);
//    if (cursor) {
//
//      var value = /** @type {!Object} */ (cursor['value']); // should not
//      // necessary if externs are
//
//      var to_continue = !goog.isFunction(q.continued) || q.continued(value);
//
//      // do the filtering if requested.
//      if (!goog.isFunction(q.filter) || q.filter(value)) {
//        idx++;
//
//        if (goog.isFunction(q.map)) {
//          value = q.map(value);
//        }
//
//        if (is_reduce) {
//          previousResult = q.reduce(previousResult, value, idx);
//        } else {
//          results.push(value);
//        }
//
//      }
//
//      if (to_continue) {
//        //cursor.continue();
//        cursor['continue'](); // Note: Must be quoted to avoid parse error.
//      }
////      } else {
////        var result = is_reduce ? previousResult : results;
////        on_complete(result);
////      }
//    } else {
//      var result = is_reduce ? previousResult : results;
//      on_complete(result);
//    }
//  };
//
//  request.onError = function(event) {
//    if (ydn.db.core.req.IndexedDb.DEBUG) {
//      window.console.log([q, event]);
//    }
//    df.errback(event);
//  };
//
//};


///**
// *
// * @param {goog.async.Deferred} df deferred to feed result.
// * @param {!ydn.db.Sql} q query.
// */
//ydn.db.index.req.IndexedDb.prototype.fetchQuery = function(df, q) {
//
//  var cursor = q.toIdbQuery(this.schema);
//  this.fetchCursor(df, cursor);
//
//};




/**
 * @inheritDoc
 */
ydn.db.index.req.IndexedDb.prototype.listByIterator = function(df, q) {
  var arr = [];
  var req = this.openQuery(q, ydn.db.base.CursorMode.READ_ONLY);
  req.onError = function(e) {
    df.errback(e);
  };
  req.onNext = function(key, value) {
    if (goog.isDef(key)) {
      arr.push(value);
      req.forward(true);
    } else {
      req.onError = null;
      req.onNext = null;
      df.callback(arr);
    }
  };
};

//
//
///**
// * @param {goog.async.Deferred} df deferred to feed result.
// * @param {!ydn.db.Iterator} q query.
// * @param {?function(*): boolean} clear clear iteration function.
// * @param {?function(*): *} update update iteration function.
// * @param {?function(*): *} map map iteration function.
// * @param {?function(*, *, number): *} reduce reduce iteration function.
// * @param {*} initial initial value for reduce iteration function.
// * @param {?function(*): *} finalize finalize function.
// */
//ydn.db.index.req.IndexedDb.prototype.iterate = function(df, q, clear, update, map,
//                                                       reduce, initial, finalize) {
//  var me = this;
//  var is_reduce = goog.isFunction(reduce);
//
//  var mode = goog.isFunction(clear) || goog.isFunction(update) ?
//    ydn.db.base.CursorMode.READ_WRITE :
//    ydn.db.base.CursorMode.READ_ONLY;
//
//
//  var idx = -1; // iteration index
//  var results = [];
//  var previousResult = initial;
//
//  var request = this.open(q, function (cursor) {
//
//    var value = cursor.value();
//    idx++;
//    //console.log([idx, cursor.key(), value]);
//
//    var consumed = false;
//
//    if (goog.isFunction(clear)) {
//      var to_clear = clear(value);
//      if (to_clear === true) {
//        consumed = true;
//        cursor.clear();
//      }
//    }
//
//    if (!consumed && goog.isFunction(update)) {
//      var updated_value = update(value);
//      if (updated_value !== value) {
//        cursor.update(updated_value);
//      }
//    }
//
//    if (goog.isFunction(map)) {
//      value = map(value);
//    }
//
//    if (is_reduce) {
//      previousResult = reduce(value, previousResult, idx);
//    } else {
//      results.push(value);
//    }
//
//  }, mode);
//
//  request.addCallback(function() {
//    var result = is_reduce ? previousResult : results;
//    if (goog.isFunction(finalize)) {
//      result = finalize(result);
//    }
//    df.callback(result);
//  });
//
//  request.addErrback(function(event) {
//    if (ydn.db.core.req.IndexedDb.DEBUG) {
//      window.console.log([q, event]);
//    }
//    df.errback(event);
//  });
//
//};
//

/**
 *
 * @param {!goog.async.Deferred} df on completed.
 * @param {!ydn.db.Iterator} cursor the cursor.
 * @param {Function} callback icursor handler.
 * @param {ydn.db.base.CursorMode?=} mode mode.
 */
ydn.db.index.req.IndexedDb.prototype.open = function(df, cursor, callback, mode) {

  var me = this;
  mode = mode || ydn.db.base.CursorMode.READ_ONLY;


  var req = this.openQuery(cursor, mode);
  req.onError = function(e) {
    df.errback(e);
  };
  req.onNext = function (cur) {
    var i_cursor = new ydn.db.IDBValueCursor(cur, [], mode == 'readonly');
    var adv = callback(i_cursor);
    i_cursor.dispose();
    req.forward(adv);
  };

};




/**
 * @inheritDoc
 */
ydn.db.index.req.IndexedDb.prototype.scan = function(df, iterators,
                                                    passthrough_streamers, solver) {

  var me = this;

  var done = false;

  var total;
  var idx2streamer = []; // convert main index to streamer index
  var idx2iterator = []; // convert main index to iterator index

  var keys = [];
  var values = [];
  var iterator_requests = [];
  var streamers = [];

  var do_exit = function() {

    for (var k = 0; k < iterators.length; k++) {
      if (!goog.isDef(iterators[k].has_done)) {
        // change iterators busy state to resting state.
        // FIXME: this dirty job should be in iterator class.
        iterators[k].has_done = false;
      }
    }
    done = true;
    goog.array.clear(iterator_requests);
    goog.array.clear(streamers);
    // console.log('existing');
    df.callback();
  };

  var result_count = 0;
  var streamer_result_count = 0;
  var has_key_count = 0;

  /**
   * All results collected. Now invoke solver and do advancement.
   */
  var on_result_ready = function() {
    result_count = 0;
    // all cursor has results, than sent to join algorithm callback.
    var adv;
    if (solver instanceof ydn.db.algo.AbstractSolver) {
      adv = solver.adapter(keys, values);
    } else {
      adv = solver(keys, values);
    }
    goog.asserts.assertArray(adv);
    var move_count = 0;
    for (var i = 0; i < iterators.length; i++) {
      if (goog.isDefAndNotNull(adv[i])) {
        var idx = idx2iterator[i];
        if (!goog.isDef(idx)) {
          throw new ydn.error.InvalidOperationException(i +
            ' is not an iterator.');
        }
        var iterator = iterators[idx];
        var req = iterator_requests[i];
        if (adv[i] !== false && !goog.isDef(keys[i])) {
          throw new ydn.error.InvalidOperationError('Iterator ' + i +
            ' must not advance.');
        }
        keys[i] = undefined;
        values[i] = undefined;
        if (ydn.db.core.req.IndexedDb.DEBUG) {
          var s = adv[i] === false ? 'restart' : adv[i] === true ? '' : adv[i];
          window.console.log(iterator.toString() + ': forward ' + s);
        }
        req.forward(adv[i]);
        move_count++;
      } else {
        // take non advancing iterator as already moved.
        result_count++;
      }
    }
    // console.log(['on_result_ready', move_count, keys, adv]);
    if (move_count == 0) {
      do_exit();
    }
  };

  /**
   * Receive streamer result. When all streamer results are received,
   * this begin on_iterators_ready.
   * @param {number} i
   * @param {*} key
   * @param {*} value
   * @return {boolean}
   */
  var on_streamer_pop = function(i, key, value) {
    if (done) {
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log(['on_streamer_next', i, key, value]);
      }
      throw new ydn.error.InternalError();
    }
    keys[i] = key;
    values[i] = value;
    result_count++;
    if (result_count === total) { // receive all results
      on_result_ready();
    }
    return false;
  };

  /**
   * Received iterator result. When all iterators result are collected,
   * begin to send request to collect streamers results.
   * @param {number} i
   * @param {*} key
   * @param {*} value
   */
  var on_iterator_next = function (i, key, value) {
    if (done) {
      if (ydn.db.core.req.IndexedDb.DEBUG) {
        window.console.log(['on_iterator_next', i, key, value]);
      }
      throw new ydn.error.InternalError();
    }
    result_count++;
    //console.log(['on_iterator_next', i, idx2iterator[i], result_count,
    //
    //  key, value]);
    keys[i] = key;
    values[i] = value;
    if (goog.isDef(idx2iterator[i])) {
      var idx = idx2iterator[i];
      var iterator = iterators[idx];
      var streamer_idx = idx2streamer[i];
      for (var j = 0, n = iterator.degree() - 1; j < n; j++) {
        var streamer = streamers[streamer_idx + j];
        streamer.pull(key, value);
      }
    }

    if (result_count === total) { // receive all results
      on_result_ready();
    }

  };

  var on_error = function (e) {
    goog.array.clear(iterator_requests);
    goog.array.clear(streamers);
    df.errback(e);
  };

  var open_iterators = function() {
    var idx = 0;
    for (var i = 0; i < iterators.length; i++) {
      var iterator = iterators[i];
      var mode = iterator.isKeyOnly() ? ydn.db.base.CursorMode.KEY_ONLY :
        ydn.db.base.CursorMode.READ_ONLY;
      var req = me.openQuery(iterator, mode);
      req.onError = on_error;
      req.onNext = goog.partial(on_iterator_next, idx);
      iterator_requests[i] = req;
      idx2iterator[idx] = i;
      idx++;
      for (var j = 0, n = iterator.degree() - 1; j < n; j++) {
        var streamer = new ydn.db.Streamer(me.getTx(),
          iterator.getPeerStoreName(j),
          iterator.getBaseIndexName(j), iterator.getPeerIndexName(j));
        streamer.setSink(goog.partial(on_streamer_pop, idx));
        streamers.push(streamer);
        idx2streamer[idx] = streamers.length;
        idx++;
      }
    }

    total = iterators.length + streamers.length;
  };


  for (var i = 0; i < passthrough_streamers.length; i++) {
    passthrough_streamers[i].setTx(this.getTx());
  }

  if (solver instanceof ydn.db.algo.AbstractSolver) {
    var wait = solver.begin(iterators, function() {
      open_iterators();
    });
    if (!wait) {
      open_iterators();
    }
  } else {
    open_iterators();
  }
};


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {!ydn.db.Iterator} iterator The cursor.
 * @param {ydn.db.base.CursorMode} mode mode.
 * @return {ydn.db.index.req.IDBCursor}
 */
ydn.db.index.req.IndexedDb.prototype.openQuery = function(iterator, mode) {

  var me = this;
  var store = this.schema.getStore(iterator.getStoreName());

  /**
   * @type {IDBObjectStore}
   */
  var obj_store = this.getTx().objectStore(store.name);

  var resume = iterator.has_done === false;
  if (resume) {
    // continue the iteration
    goog.asserts.assert(iterator.getPrimaryKey());
  } else { // start a new iteration
    iterator.counter = 0;
  }
  iterator.has_done = undefined; // switching to working state.

  var index = null;
  if (goog.isDefAndNotNull(iterator.index) && iterator.index != store.keyPath) {
    index = obj_store.index(iterator.index);
  }

  var dir = /** @type {number} */ (iterator.direction); // new standard is string.

  // keyRange is nullable but cannot be undefined.
  var keyRange = goog.isDef(iterator.keyRange) ? iterator.keyRange() : null;

  var key_only = mode === ydn.db.base.CursorMode.KEY_ONLY;

  var cur = null;

  var cursor = new ydn.db.index.req.IDBCursor(obj_store, iterator.getStoreName(), iterator.getIndexName(),
    store.getKeyPath(), keyRange, iterator.getDirection(), key_only);


  return cursor;
};


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {!ydn.db.Iterator} iterator The cursor.
 * @param {ydn.db.base.CursorMode} mode mode.
 * @return {{
 *    onNext: Function,
 *    onError: Function,
 *    forward: Function
 *    }}
 */
ydn.db.index.req.IndexedDb.prototype.openQuery_old = function(iterator, mode) {

  var result = {
    onNext: null,
    onError: null,
    forward: null
  };

  var me = this;
  var store = this.schema.getStore(iterator.store_name);

  /**
   * @type {IDBObjectStore}
   */
  var obj_store = this.getTx().objectStore(store.name);

  var resume = iterator.has_done === false;
  if (resume) {
    // continue the iteration
    goog.asserts.assert(iterator.getPrimaryKey());
  } else { // start a new iteration
    iterator.counter = 0;
  }
  iterator.has_done = undefined; // switching to working state.

  var index = null;
  if (goog.isDefAndNotNull(iterator.index) && iterator.index != store.keyPath) {
    index = obj_store.index(iterator.index);
  }

  var dir = /** @type {number} */ (iterator.direction); // new standard is string.

  // keyRange is nullable but cannot be undefined.
  var keyRange = goog.isDef(iterator.keyRange) ? iterator.keyRange() : null;

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
        //throw new ydn.error.InvalidOperationException(
        //    'object store cannot open for key cursor');
        // IDB v1 spec do not have openKeyCursor, hopefully next version does
        // http://lists.w3.org/Archives/Public/public-webapps/2012OctDec/0466.html
        // however, lazy serailization used at least in FF.
        if (goog.isDefAndNotNull(dir)) {
          request = obj_store.openCursor(keyRange, dir);
        } else if (goog.isDefAndNotNull(keyRange)) {
          request = obj_store.openCursor(keyRange);
          // some browser have problem with null, even though spec said OK.
        } else {
          request = obj_store.openCursor();
        }

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
      //console.log(['onsuccess', cur]);
      if (cur) {
        if (resume) {
          // cue to correct position
          if (cur.key != iterator.key) {
            if (cue) {
              me.logger.warning('Resume corrupt on ' + iterator.store_name + ':' +
                iterator.getPrimaryKey() + ':' + iterator.getIndexKey());
              result.onError(new ydn.db.InvalidStateError());
              return;
            }
            cue = true;
            cur['continue'](iterator.key);
            return;
          } else {
            if (cur.getPrimaryKey == iterator.getIndexKey()) {
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
        var value = key_only ? cur.key : cur['value'];

        result.onNext(cur.primaryKey, value);

      } else {
        iterator.has_done = true;
        me.logger.finest('Iterator: ' + iterator + ' completed.');
        result.onNext(); // notify that cursor iteration is finished.
      }

    };

    request.onError = function (event) {
      result.onError(event);
    };

  };

  open_request();

  result.forward = function (next_position) {
    //console.log(['next_position', cur, next_position]);

    if (next_position === false) {
      // restart the iterator
      me.logger.finest('Iterator: ' + iterator + ' restarting.');
      iterator.has_done = undefined;
      iterator.counter = 0;
      iterator.store_key = undefined;
      iterator.index_key = undefined;
      cur = null;
      open_request();
    } else if (cur) {
      if (next_position === true) {
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
 * @inheritDoc
 */
ydn.db.index.req.IndexedDb.prototype.getCursor = function(store_name,
     index_name, keyPath, keyRange, direction, key_only) {
  /**
   * @type {IDBObjectStore}
   */
  var obj_store = this.getTx().objectStore(store_name);
   return new ydn.db.index.req.IDBCursor(obj_store, store_name, index_name,
     keyPath, keyRange, direction, key_only)
};