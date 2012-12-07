/**
* @fileoverview Provide iteration query.
*
*
*/


goog.provide('ydn.db.index.TxStorage');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.core.TxStorage');
goog.require('ydn.db.index.req.IRequestExecutor');
goog.require('ydn.db.index.req.IndexedDb');
goog.require('ydn.db.index.req.WebSql');
goog.require('ydn.db.index.req.SimpleStore');
goog.require('ydn.db.index.IStorage');



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
 * @implements {ydn.db.index.IStorage}
 * @constructor
 * @extends {ydn.db.core.TxStorage}
*/
ydn.db.index.TxStorage = function(storage, ptx_no, scope_name, schema) {
  goog.base(this, storage, ptx_no, scope_name, schema);
};
goog.inherits(ydn.db.index.TxStorage, ydn.db.core.TxStorage);


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.index.req.IRequestExecutor} get executor.
 */
ydn.db.index.TxStorage.prototype.getExecutor = function() {
  if (!this.executor) {
    var type = this.type();
    if (type == ydn.db.con.IndexedDb.TYPE) {
      this.executor = new ydn.db.index.req.IndexedDb(this.getName(), this.schema);
    } else if (type == ydn.db.con.WebSql.TYPE) {
      this.executor = new ydn.db.index.req.WebSql(this.db_name, this.schema);
    } else if (type == ydn.db.con.SimpleStorage.TYPE ||
      type == ydn.db.con.LocalStorage.TYPE ||
      type == ydn.db.con.SessionStorage.TYPE) {
      this.executor = new ydn.db.index.req.SimpleStore(this.db_name, this.schema);
    } else {
      throw new ydn.db.InternalError('No executor for ' + type);
    }
  }
  return /** @type {ydn.db.index.req.IRequestExecutor} */ (this.executor);
};


/**
 * @throws {ydn.db.ScopeError}
 * @protected
 * @param {function(ydn.db.index.req.IRequestExecutor)} callback callback when
 * executor
 * is ready.
 * @param {!Array.<string>} store_names store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
 * @param {string} scope scope name.
 */
ydn.db.index.TxStorage.prototype.exec = function(callback, store_names, mode, scope) {
  goog.base(this, 'exec',
    /** @type {function(ydn.db.core.req.IRequestExecutor)} */ (callback),
    store_names, mode, scope);
};


/**
 * @inheritDoc
 */
ydn.db.index.TxStorage.prototype.get = function(arg1, arg2) {

  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();
    /**
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    var q_store_name = q.getStoreName();
    var store = this.schema.getStore(q_store_name);
    if (!store) {
      throw new ydn.error.ArgumentException('store "' +
          q_store_name + '" not found.');
    }
    var index_name = q.getIndexName();
    if (goog.isDef(index_name) && !store.hasIndex(index_name)) {
      throw new ydn.error.ArgumentException('index "' +
        index_name + '" not found in store "' + q_store_name + '".');
    }
    this.exec(function(executor) {
      executor.getByIterator(df, q);
    }, [q_store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getByIterator');
    return df;
  } else {
    return goog.base(this, 'get', arg1, arg2);
  }

};


/**
 * @inheritDoc
 */
ydn.db.index.TxStorage.prototype.list = function(arg1, arg2, arg3, arg4, arg5, arg6) {

  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();
    if (goog.isDef(arg3) || goog.isDef(arg4) || goog.isDef(arg5)) {
      throw new ydn.error.ArgumentException('too many arguments.');
    }

    var limit;
    if (goog.isNumber(arg2)) {
      limit = arg2;
      if (limit < 1) {
        throw new ydn.error.ArgumentException('limit must be a positive value');
      }
    } else if (goog.isDef(arg2)) {
      throw new ydn.error.ArgumentException('limit');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;

    this.exec(function(executor) {
      executor.listByIterator(df, q, /** @type {number|undefined} */ (limit));
    }, q.stores(), ydn.db.base.TransactionMode.READ_ONLY, 'listByIterator');

    return df;
  } else {
    return goog.base(this, 'list', arg1, arg2, arg3, arg4, arg5, arg6);
  }

};

//
///**
// * Cursor scan iteration.
// * @param {!Array.<!ydn.db.Iterator>} iterators the cursor.
// * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): !Array} solver
// * solver.
// * @param {!Array.<!ydn.db.Streamer>=} opt_streamers streamers.
// * @return {!goog.async.Deferred} promise on completed.
// */
//ydn.db.index.TxStorage.prototype.scan = function(iterators, solver, opt_streamers) {
//  var df = ydn.db.base.createDeferred();
//  if (!goog.isArray(iterators) || !(iterators[0] instanceof ydn.db.Iterator)) {
//    throw new ydn.error.ArgumentException();
//  }
//
//  var tr_mode = ydn.db.base.TransactionMode.READ_ONLY;
//
//  var scopes = [];
//  for (var i = 0; i < iterators.length; i++) {
//    var stores = iterators[i].stores();
//    for (var j = 0; j < stores.length; j++) {
//      if (!goog.array.contains(scopes, stores[j])) {
//        scopes.push(stores[j]);
//      }
//    }
//  }
//
//  var passthrough_streamers = opt_streamers || [];
//  for (var i = 0; i < passthrough_streamers.length; i++) {
//    var store = passthrough_streamers[i].getStoreName();
//    if (!goog.array.contains(scopes, store)) {
//      scopes.push(store);
//    }
//  }
//
//  var me = this;
//
//  this.exec(function(executor) {
//    //executor.scan(df, iterators, streamers, solver);
//    // do scanning
//
//    var done = false;
//
//    var total;
//    var idx2streamer = []; // convert main index to streamer index
//    var idx2iterator = []; // convert main index to iterator index
//
//    var keys = [];
//    var values = [];
//    var cursors = [];
//    var streamers = [];
//
//    var do_exit = function() {
//
//      for (var k = 0; k < iterators.length; k++) {
//        iterators[k].exit();
//      }
//      done = true;
//      goog.array.clear(cursors);
//      goog.array.clear(streamers);
//      // console.log('existing');
//      df.callback();
//    };
//
//    var result_count = 0;
//    var streamer_result_count = 0;
//    var has_key_count = 0;
//
//    /**
//     * All results collected. Now invoke solver and do advancement.
//     */
//    var on_result_ready = function() {
//      result_count = 0;
//      // all cursor has results, than sent to join algorithm callback.
//      var adv;
//      if (solver instanceof ydn.db.algo.AbstractSolver) {
//        adv = solver.adapter(keys, values);
//      } else {
//        adv = solver(keys, values);
//      }
//      goog.asserts.assertArray(adv);
//      var move_count = 0;
//      for (var i = 0; i < iterators.length; i++) {
//        if (goog.isDefAndNotNull(adv[i])) {
//          var idx = idx2iterator[i];
//          if (!goog.isDef(idx)) {
//            throw new ydn.error.InvalidOperationException(i +
//              ' is not an iterator.');
//          }
//          var iterator = iterators[idx];
//          var req = cursors[i];
//          if (adv[i] !== false && !goog.isDef(keys[i])) {
//            throw new ydn.error.InvalidOperationError('Iterator ' + i +
//              ' must not advance.');
//          }
//          keys[i] = undefined;
//          values[i] = undefined;
//          if (ydn.db.core.req.IndexedDb.DEBUG) {
//            var s = adv[i] === false ? 'restart' : adv[i] === true ? '' : adv[i];
//            window.console.log(iterator.toString() + ': forward ' + s);
//          }
//          req.forward(adv[i]);
//          move_count++;
//        } else {
//          // take non advancing iterator as already moved.
//          result_count++;
//        }
//      }
//      // console.log(['on_result_ready', move_count, keys, adv]);
//      if (move_count == 0) {
//        do_exit();
//      }
//    };
//
//    /**
//     * Receive streamer result. When all streamer results are received,
//     * this begin on_iterators_ready.
//     * @param {number} i
//     * @param {*} key
//     * @param {*} value
//     * @return {boolean}
//     */
//    var on_streamer_pop = function(i, key, value) {
//      if (done) {
//        if (ydn.db.core.req.IndexedDb.DEBUG) {
//          window.console.log(['on_streamer_next', i, key, value]);
//        }
//        throw new ydn.error.InternalError();
//      }
//      keys[i] = key;
//      values[i] = value;
//      result_count++;
//      if (result_count === total) { // receive all results
//        on_result_ready();
//      }
//      return false;
//    };
//
//    /**
//     * Received iterator result. When all iterators result are collected,
//     * begin to send request to collect streamers results.
//     * @param {number} i
//     * @param {*} primary_key
//     * @param {*} key
//     * @param {*} value
//     */
//    var on_iterator_next = function (i, primary_key, key, value) {
//      if (done) {
//        if (ydn.db.core.req.IndexedDb.DEBUG) {
//          window.console.log(['on_iterator_next', i, primary_key, key, value]);
//        }
//        throw new ydn.error.InternalError();
//      }
//      result_count++;
//      //console.log(['on_iterator_next', i, idx2iterator[i], result_count,
//      //
//      //  key, value]);
//      var idx = idx2iterator[i];
//      var iterator = iterators[idx];
//
//      keys[i] = primary_key;
//      values[i] = iterator.isKeyOnly() ? key : value;
//
//      var streamer_idx = idx2streamer[i];
//      for (var j = 0, n = iterator.degree() - 1; j < n; j++) {
//        var streamer = streamers[streamer_idx + j];
//        streamer.pull(key, value);
//      }
//
//      if (result_count === total) { // receive all results
//        on_result_ready();
//      }
//
//    };
//
//    var on_error = function (e) {
//      goog.array.clear(cursors);
//      goog.array.clear(streamers);
//      df.errback(e);
//    };
//
//    var open_iterators = function() {
//      var idx = 0;
//      for (var i = 0; i < iterators.length; i++) {
//        var iterator = iterators[i];
//        var mode = iterator.isKeyOnly() ? ydn.db.base.CursorMode.KEY_ONLY :
//          ydn.db.base.CursorMode.READ_ONLY;
//        var cursor = iterator.iterate(executor);
//        cursor.onError = on_error;
//        cursor.onNext = goog.partial(on_iterator_next, idx);
//        cursors[i] = cursor;
//        idx2iterator[idx] = i;
//        idx++;
//        for (var j = 0, n = iterator.degree() - 1; j < n; j++) {
//          var streamer = executor.getStreamer(iterator.getPeerStoreName(j),
//            iterator.getBaseIndexName(j), iterator.getPeerIndexName(j));
//          streamer.setSink(goog.partial(on_streamer_pop, idx));
//          streamers.push(streamer);
//          idx2streamer[idx] = streamers.length;
//          idx++;
//        }
//      }
//
//      total = iterators.length + streamers.length;
//    };
//
//    for (var i = 0; i < passthrough_streamers.length; i++) {
//      passthrough_streamers[i].setTx(this.getTx());
//    }
//
//    if (solver instanceof ydn.db.algo.AbstractSolver) {
//      var wait = solver.begin(iterators, function() {
//        open_iterators();
//      });
//      if (!wait) {
//        open_iterators();
//      }
//    } else {
//      open_iterators();
//    }
//
//  }, scopes, tr_mode, 'scan');
//
//  return df;
//};



/**
 * Cursor scan iteration.
 * @param {!Array.<!ydn.db.Iterator>} iterators the cursor.
 * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): !Array} solver
 * solver.
 * @param {!Array.<!ydn.db.Streamer>=} opt_streamers streamers.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.index.TxStorage.prototype.scan = function(iterators, solver, opt_streamers) {
  var df = ydn.db.base.createDeferred();
  if (!goog.isArray(iterators) || !(iterators[0] instanceof ydn.db.Iterator)) {
    throw new ydn.error.ArgumentException();
  }

  var tr_mode = ydn.db.base.TransactionMode.READ_ONLY;

  var scopes = [];
  for (var i = 0; i < iterators.length; i++) {
    var stores = iterators[i].stores();
    for (var j = 0; j < stores.length; j++) {
      if (!goog.array.contains(scopes, stores[j])) {
        scopes.push(stores[j]);
      }
    }
  }

  var passthrough_streamers = opt_streamers || [];
  for (var i = 0; i < passthrough_streamers.length; i++) {
    var store = passthrough_streamers[i].getStoreName();
    if (!goog.array.contains(scopes, store)) {
      scopes.push(store);
    }
  }

  var me = this;

  this.exec(function(executor) {
    //executor.scan(df, iterators, streamers, solver);
    // do scanning

    var done = false;

    var total;
    var idx2streamer = []; // convert main index to streamer index
    var idx2iterator = []; // convert main index to iterator index

    var keys = [];
    var values = [];
    var cursors = [];
    var streamers = [];

    var do_exit = function() {

      for (var k = 0; k < iterators.length; k++) {
        iterators[k].exit();
      }
      done = true;
      goog.array.clear(cursors);
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
      var out;
      if (solver instanceof ydn.db.algo.AbstractSolver) {
        out = solver.solver(keys, values);
      } else {
        out = solver(keys, values);
      }

      var next_primary_keys = [];
      var next_index_keys = [];
      var advance = [];
      if (goog.isArray(out)) {
        // adv vector is given
        next_primary_keys = out;
      } else if (goog.isNull(out)) {
        // all stop
        next_primary_keys = [];
      } else if (!goog.isDef(out)) {
        // all continue;
        next_primary_keys = [];
        for (var i = 0; i < iterators.length; i++) {
          if (goog.isDef(idx2iterator[i])) {
            next_primary_keys[i] = true;
          }
        }
      } else if (goog.isObject(out)) {
        if (goog.isArray(out['next_primary_keys'])) {
          next_primary_keys = out['next_primary_keys'];
        }
        if (goog.isArray(out['next_index_keys'])) {
          next_index_keys = out['next_index_keys'];
        }
        if (goog.isArray(out['advance'])) {
          advance = out['advance'];
        }
      } else {
        throw new ydn.error.InvalidOperationException('scan callback output');
      }
      var move_count = 0;
      for (var i = 0; i < iterators.length; i++) {
        if (goog.isDefAndNotNull(next_primary_keys[i])) {
          var idx = idx2iterator[i];
          if (!goog.isDef(idx)) {
            throw new ydn.error.InvalidOperationException(i +
              ' is not an iterator.');
          }
          var iterator = iterators[idx];
          var req = cursors[i];
          if (next_primary_keys[i] !== false && !goog.isDef(keys[i])) {
            throw new ydn.error.InvalidOperationError('Iterator ' + i +
              ' must not advance.');
          }
          keys[i] = undefined;
          values[i] = undefined;
          if (ydn.db.core.req.IndexedDb.DEBUG) {
            var s = next_primary_keys[i] === false ? 'restart' : next_primary_keys[i] === true ? '' : next_primary_keys[i];
            window.console.log(iterator.toString() + ': forward ' + s);
          }
          if (goog.isDef(next_primary_keys[i]) && goog.isDef(next_index_keys[i])) {
            req.forward(next_primary_keys[i], next_index_keys[i], !!advance[i]);
          } else if (goog.isDef(next_primary_keys[i])) {
            if (goog.isBoolean(next_primary_keys[i])) {
              req.forward(next_primary_keys[i]);
            } else {
              req.seek(next_primary_keys[i]);
            }
          } else if (goog.isDef(next_index_keys[i])) {
            req.forward(next_index_keys[i]);
          } else if (goog.isDef(advance[i])) {
            req.forward(!!advance[i]);
          }
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
     * @param {*} primary_key
     * @param {*} key
     * @param {*} value
     */
    var on_iterator_next = function (i, primary_key, key, value) {
      if (done) {
        if (ydn.db.core.req.IndexedDb.DEBUG) {
          window.console.log(['on_iterator_next', i, primary_key, key, value]);
        }
        throw new ydn.error.InternalError();
      }
      result_count++;
      //console.log(['on_iterator_next', i, idx2iterator[i], result_count,
      //
      //  key, value]);
      var idx = idx2iterator[i];
      var iterator = iterators[idx];

      keys[i] = primary_key;
      values[i] = iterator.isKeyOnly() ? key : value;

      var streamer_idx = idx2streamer[i];
      for (var j = 0, n = iterator.degree() - 1; j < n; j++) {
        var streamer = streamers[streamer_idx + j];
        streamer.pull(key, value);
      }

      if (result_count === total) { // receive all results
        on_result_ready();
      }

    };

    var on_error = function (e) {
      goog.array.clear(cursors);
      goog.array.clear(streamers);
      df.errback(e);
    };

    var open_iterators = function() {
      var idx = 0;
      for (var i = 0; i < iterators.length; i++) {
        var iterator = iterators[i];
        var mode = iterator.isKeyOnly() ? ydn.db.base.CursorMode.KEY_ONLY :
          ydn.db.base.CursorMode.READ_ONLY;
        var cursor = iterator.iterate(executor);
        cursor.onError = on_error;
        cursor.onNext = goog.partial(on_iterator_next, idx);
        cursors[i] = cursor;
        idx2iterator[idx] = i;
        idx++;
        for (var j = 0, n = iterator.degree() - 1; j < n; j++) {
          var streamer = executor.getStreamer(iterator.getPeerStoreName(j),
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

  }, scopes, tr_mode, 'join');

  return df;
};



/**
 *
 * @param {!ydn.db.Iterator} iterator the cursor.
 * @param {Function} callback icursor handler.
 * @param {ydn.db.base.TransactionMode=} mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.index.TxStorage.prototype.open = function(iterator, callback, mode) {
  if (!(iterator instanceof ydn.db.Iterator)) {
    throw new ydn.error.ArgumentException();
  }
  var store = this.schema.getStore(iterator.getStoreName());
  if (!store) {
    throw new ydn.error.ArgumentException('Store "' + iterator.getStoreName() +
      '" not found.');
  }
  var tr_mode = mode || ydn.db.base.TransactionMode.READ_ONLY;

  var df = ydn.db.base.createDeferred();
  this.exec(function(executor) {
    // executor.open(df, cursor, callback, /** @type {ydn.db.base.CursorMode} */ (tr_mode));

    var read_write = tr_mode == ydn.db.base.TransactionMode.READ_WRITE;

    var cursor = iterator.iterate(executor);

    cursor.onError = function(e) {
      df.errback(e);
    };
    cursor.onNext = function (cur) {
      if (goog.isDefAndNotNull(cur)) {
        var adv = callback(cursor);
        cursor.forward(true);
      }
    };

  }, iterator.stores(), tr_mode, 'open');

  return df;

};


/**
 *
 * @param {!ydn.db.Iterator} iterator
 * @param {function(*, *, (*|undefined)): (*|undefined)} callback
 */
ydn.db.index.TxStorage.prototype.map = function (iterator, callback) {

  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = ydn.db.base.createDeferred();

  this.exec(function (executor) {

    var cursor = iterator.iterate(executor);

    cursor.onError = function(e) {
      df.errback(e);
    };
    cursor.onNext = function (primaryKey, key, value) {
      if (goog.isDef(key)) {
        var adv = callback(primaryKey, key, value);
        //console.log(['onNext', key, primaryKey, value, adv]);
        if (!goog.isDef(adv)) {
          cursor.forward(true);
        } else if (goog.isBoolean(adv)) {
          throw new ydn.error.InvalidOperationException(adv);
        } else if (goog.isNull(adv)) {
          cursor.forward(null);
        } else {
          cursor.forward(adv);
        }
      } else {
        df.callback(undefined);
      }
    };

  }, stores, ydn.db.base.TransactionMode.READ_ONLY, 'map');

  return df;
};


/**
 *
 * @param {!ydn.db.Iterator} iterator
 * @param {function(*, *, number): *} callback
 * @param {*=} initial
 */
ydn.db.index.TxStorage.prototype.reduce = function(iterator, callback, initial) {

  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = ydn.db.base.createDeferred();

  var previous = goog.isObject(initial) ? ydn.object.clone(initial) : initial;

  this.exec(function (executor) {

    var cursor = iterator.iterate(executor);

    cursor.onError = function(e) {
      df.errback(e);
    };
    var key_only = iterator.isKeyOnly();
    var index = 0;
    cursor.onNext = function (primaryKey, key, value) {
      if (goog.isDefAndNotNull(primaryKey)) {
        var current_value = key_only ? key : value;
        //console.log([previous, current_value, index]);
        previous = callback(previous, current_value, index++);
        cursor.forward(true);
      } else {
        df.callback(previous);
      }
    };

  }, stores, ydn.db.base.TransactionMode.READ_ONLY, 'map');

  return df;
};




