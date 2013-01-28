/**
* @fileoverview Provide iteration query.
*
*
*/


goog.provide('ydn.db.index.DbOperator');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.core.DbOperator');
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
 * @param {!ydn.db.schema.Database} schema
 * @param {ydn.db.tr.IThread} thread
 * @implements {ydn.db.index.IStorage}
 * @constructor
 * @extends {ydn.db.core.DbOperator}
*/
ydn.db.index.DbOperator = function(storage, schema, thread) {
  goog.base(this, storage, schema, thread);
};
goog.inherits(ydn.db.index.DbOperator, ydn.db.core.DbOperator);


/**
 * @define {boolean}
 */
ydn.db.index.DbOperator.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.index.DbOperator.prototype.get = function(arg1, arg2) {

  var me = this;
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
    this.tx_thread.exec(function(tx) {
      me.getExecutor(tx).getByIterator(df, q);
    }, [q_store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getByIterator');
    return df;
  } else {
    return goog.base(this, 'get', arg1, arg2);
  }

};



/**
 * @inheritDoc
 */
ydn.db.index.DbOperator.prototype.keys = function(arg1, arg2, arg3, arg4, arg5, arg6, arg7) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();
    if (goog.isDef(arg3) || goog.isDef(arg4) || goog.isDef(arg5)) {
      throw new ydn.error.ArgumentException('too many arguments.');
    }

    /**
     * @type {number}
     */
    var limit;
    if (goog.isNumber(arg2)) {
      limit = /** @type {number} */ (arg2);
      if (limit < 1) {
        throw new ydn.error.ArgumentException('limit must be a positive value');
      }
    } else if (goog.isDef(arg2)) {
      throw new ydn.error.ArgumentException('limit');
    }
    /**
     * @type {number}
     */
    var offset;
    if (goog.isNumber(arg3)) {
      offset = /** @type {number} */ (arg3);
    } else if (goog.isDef(arg3)) {
      throw new ydn.error.ArgumentException('offset');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;

    this.tx_thread.exec(function(tx) {
      me.getExecutor(tx).keysByIterator(df, q, limit, offset);
    }, q.stores(), ydn.db.base.TransactionMode.READ_ONLY, 'listByIterator');

    return df;
  } else {
    return goog.base(this, 'keys', arg1, arg2, arg3, arg4, arg5, arg6, arg7);
  }

};


/**
 * @inheritDoc
 */
ydn.db.index.DbOperator.prototype.list = function(arg1, arg2, arg3, arg4, arg5, arg6, arg7) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();
    if (goog.isDef(arg4) || goog.isDef(arg5)) {
      throw new ydn.error.ArgumentException('too many arguments.');
    }

    /**
     * @type {number}
     */
    var limit;
    if (goog.isNumber(arg2)) {
      limit = /** @type {number} */ (arg2);
      if (limit < 1) {
        throw new ydn.error.ArgumentException('limit must be a positive value');
      }
    } else if (goog.isDef(arg2)) {
      throw new ydn.error.ArgumentException('limit');
    }
    /**
     * @type {number}
     */
    var offset;
    if (goog.isNumber(arg3)) {
      offset = /** @type {number} */ (arg3);
    } else if (goog.isDef(arg3)) {
      throw new ydn.error.ArgumentException('offset');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;

    this.tx_thread.exec(function(tx) {
      me.getExecutor(tx).listByIterator(df, q, limit, offset);
    }, q.stores(), ydn.db.base.TransactionMode.READ_ONLY, 'listByIterator');

    return df;
  } else {
    return goog.base(this, 'list', arg1, arg2, arg3, arg4, arg5, arg6, arg7);
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
//ydn.db.index.DbOperator.prototype.scan = function(iterators, solver, opt_streamers) {
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
//  this.tx_thread.exec(function(executor) {
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
//          if (ydn.db.index.DbOperator.DEBUG) {
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
//        if (ydn.db.index.DbOperator.DEBUG) {
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
//        if (ydn.db.index.DbOperator.DEBUG) {
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
ydn.db.index.DbOperator.prototype.scan = function(iterators, solver, opt_streamers) {
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

  this.tx_thread.exec(function(tx) {
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

      // all cursor has results, than sent to join algorithm callback.

      var out;
      if (solver instanceof ydn.db.algo.AbstractSolver) {
        out = solver.solver(keys, values);
      } else {
        out = solver(keys, values);
      }
      if (ydn.db.index.DbOperator.DEBUG) {
        window.console.log(me + ' ready and received result from solver ' + ydn.json.stringify(out));
      }
      var next_primary_keys = [];
      var next_effective_keys = [];
      var advance = [];
      var restart = [];
      if (goog.isArray(out)) {
        // adv vector is given
        for (var i = 0; i < out.length; i++) {
          if (out[i] === true) {
            advance[i] = 1;
          } else if (out[i] === false) {
            restart[i] = true;
          } else {
            next_effective_keys[i] = out[i];
          }
        }
      } else if (goog.isNull(out)) {
        // all stop
        next_primary_keys = [];
      } else if (!goog.isDef(out)) {
        // all continue;
        next_primary_keys = [];
        for (var i = 0; i < iterators.length; i++) {
          if (goog.isDef(idx2iterator[i])) {
            advance[i] = 1;
          }
        }
      } else if (goog.isObject(out)) {
        next_primary_keys = out['continuePrimary'] || [];
        next_effective_keys = out['continue'] || [];
        advance = out['advance'] || [];
        restart = out['restart'] || [];
      } else {
        throw new ydn.error.InvalidOperationException('scan callback output');
      }
      var move_count = 0;
      result_count = 0;
      for (var i = 0; i < iterators.length; i++) {
        if (goog.isDefAndNotNull(next_primary_keys[i]) ||
          goog.isDefAndNotNull(next_effective_keys[i]) ||
          goog.isDefAndNotNull(restart[i]) ||
          goog.isDefAndNotNull(advance[i])) {
          // by marking non moving iterator first, both async and sync callback
          // work.
        } else {
          // take non advancing iterator as already moved.
          result_count++;
        }
      }
      for (var i = 0; i < iterators.length; i++) {
        if (goog.isDefAndNotNull(next_primary_keys[i]) ||
            goog.isDefAndNotNull(next_effective_keys[i]) ||
            goog.isDefAndNotNull(restart[i]) ||
            goog.isDefAndNotNull(advance[i])) {
          var idx = idx2iterator[i];
          if (!goog.isDef(idx)) {
            throw new ydn.error.InvalidOperationException(i +
              ' is not an iterator.');
          }
          var iterator = iterators[idx];
          var req = cursors[i];
//          if (next_primary_keys[i] !== false && !goog.isDef(keys[i])) {
//            throw new ydn.error.InvalidOperationError('Iterator ' + i +
//              ' must not advance.');
//          }
          if (!goog.isDefAndNotNull(keys[i]) &&
              (advance[i] === true ||
                  goog.isDefAndNotNull(next_effective_keys[i]) ||
                  goog.isDefAndNotNull(next_primary_keys[i]))) {
            throw new ydn.error.InvalidOperationError(iterator + ' at ' + i +
                ' must not advance.');
          }
          keys[i] = undefined;
          values[i] = undefined;

          if (goog.isDefAndNotNull(restart[i])) {
            if (ydn.db.index.DbOperator.DEBUG) {
              window.console.log(iterator + ': restarting.');
            }
            goog.asserts.assert(restart[i] === true, i + ' restart must be true');
            req.restart();
          } else if (goog.isDefAndNotNull(next_effective_keys[i])) {
            if (ydn.db.index.DbOperator.DEBUG) {
              window.console.log(iterator + ': continuing to ' + next_effective_keys[i]);
            }
            req.continueEffectiveKey(next_effective_keys[i]);
          } else if (goog.isDefAndNotNull(next_primary_keys[i])) {
            if (ydn.db.index.DbOperator.DEBUG) {
              window.console.log(iterator + ': continuing to primary key ' + next_primary_keys[i]);
            }
            req.continuePrimaryKey(next_primary_keys[i]);
          } else if (goog.isDefAndNotNull(advance[i])) {
            if (ydn.db.index.DbOperator.DEBUG) {
              window.console.log(iterator + ': advancing ' + advance[i] + ' steps.');
            }
            goog.asserts.assert(advance[i] === 1, i + ' advance value must be 1');
            req.advance(1);
          } else {
            throw new ydn.error.InternalError(iterator + ': has no action');
          }

          //if (goog.isDef(next_primary_keys[i]) && goog.isDef(next_index_keys[i])) {
//            req.seek(next_primary_keys[i], next_effective_keys[i], advance[i]);
//          } else if (goog.isDef(next_primary_keys[i])) {
//            if (goog.isBoolean(next_primary_keys[i])) {
//              req.forward(next_primary_keys[i]);
//            } else {
//              req.seek(next_primary_keys[i]);
//            }
//          } else if (goog.isDef(next_index_keys[i])) {
//            req.forward(next_index_keys[i]);
//          } else if (goog.isDef(advance[i])) {
//            req.forward(!!advance[i]);
//          }
          move_count++;
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
        if (ydn.db.index.DbOperator.DEBUG) {
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
        if (ydn.db.index.DbOperator.DEBUG) {
          window.console.log(['on_iterator_next', i, primary_key, key, value]);
        }
        // calling next to a terminated iterator
        throw new ydn.error.InternalError();
      }
      result_count++;
      if (ydn.db.index.DbOperator.DEBUG) {
        window.console.log(['on_iterator_next', i, idx2iterator[i], result_count, key, value]);
      }
      var idx = idx2iterator[i];
      var iterator = iterators[idx];

      if (iterator.isIndexIterator()) {
        if (iterator.isKeyOnly()) {
          keys[i] = key;
          values[i] = primary_key;
        } else {
          keys[i] = key;
          values[i] = value;
        }
      } else {
        if (iterator.isKeyOnly()) {
          keys[i] = primary_key;
          values[i] = primary_key;
        } else {
          keys[i] = primary_key;
          values[i] = value;
        }
      }

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
        var cursor = iterator.iterate(me.getIndexExecutor(tx));
        cursor.onError = on_error;
        cursor.onNext = goog.partial(on_iterator_next, idx);
        cursors[i] = cursor;
        idx2iterator[idx] = i;
        idx++;
        for (var j = 0, n = iterator.degree() - 1; j < n; j++) {
          var streamer = me.getExecutor(tx).getStreamer(iterator.getPeerStoreName(j),
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
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @return {ydn.db.index.req.IRequestExecutor}
 */
ydn.db.index.DbOperator.prototype.getIndexExecutor = function(tx) {
  return /** @type {ydn.db.index.req.IRequestExecutor} */ (this.getExecutor(tx));
};


/**
 *
 * @param {!ydn.db.Iterator} iterator the cursor.
 * @param {Function} callback icursor handler.
 * @param {ydn.db.base.TransactionMode=} mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.index.DbOperator.prototype.open = function(iterator, callback, mode) {
  if (!(iterator instanceof ydn.db.Iterator)) {
    throw new ydn.error.ArgumentException();
  }
  var store = this.schema.getStore(iterator.getStoreName());
  if (!store) {
    throw new ydn.error.ArgumentException('Store "' + iterator.getStoreName() +
      '" not found.');
  }
  var tr_mode = mode || ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;
  var df = ydn.db.base.createDeferred();
  this.tx_thread.exec(function(tx) {
    // executor.open(df, cursor, callback, /** @type {ydn.db.base.CursorMode} */ (tr_mode));

    var read_write = tr_mode == ydn.db.base.TransactionMode.READ_WRITE;

    var cursor = iterator.iterate(me.getIndexExecutor(tx));

    cursor.onError = function(e) {
      df.errback(e);
    };
    cursor.onNext = function (primaryKey, key, value) {
      if (goog.isDefAndNotNull(primaryKey)) {
        var adv = callback(cursor);
        cursor.forward(true);
      } else {
        df.callback();
      }
    };

  }, iterator.stores(), tr_mode, 'open');

  return df;

};


/**
 *
 * @param {!ydn.db.Iterator} iterator
 * @param {function(*): (*|undefined)} callback
 */
ydn.db.index.DbOperator.prototype.map = function (iterator, callback) {

  var me = this;
  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = ydn.db.base.createDeferred();

  this.tx_thread.exec(function (tx) {

    var cursor = iterator.iterate(me.getIndexExecutor(tx));

    cursor.onError = function(e) {
      df.errback(e);
    };
    cursor.onNext = function (primaryKey, key, value) {
      if (goog.isDefAndNotNull(primaryKey)) {
        var ref;
        if (iterator.isKeyOnly()) {
          if (iterator.isIndexIterator()) {
            ref = key;
          } else {
            ref = primaryKey;
          }
        } else {
          if (iterator.isIndexIterator()) {
            ref = primaryKey;
          } else {
            ref = value;
          }
        }
        var adv = callback(ref);
        //console.log(['onNext', key, primaryKey, value, ref, adv]);
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
ydn.db.index.DbOperator.prototype.reduce = function(iterator, callback, initial) {

  var me = this;
  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = ydn.db.base.createDeferred();

  var previous = goog.isObject(initial) ? ydn.object.clone(initial) : initial;

  this.tx_thread.exec(function (tx) {

    var cursor = iterator.iterate(me.getIndexExecutor(tx));

    cursor.onError = function(e) {
      df.errback(e);
    };
    var key_only = iterator.isKeyOnly();
    var index = 0;
    cursor.onNext = function (primaryKey, key, value) {
      if (goog.isDefAndNotNull(primaryKey)) {
        var current_value;
        if (iterator.isKeyOnly()) {
          if (iterator.isIndexIterator()) {
            current_value = key;
          } else {
            current_value = primaryKey;
          }
        } else {
          if (iterator.isIndexIterator()) {
            current_value = primaryKey;
          } else {
            current_value = value;
          }
        }

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




