
/**
* @fileoverview Database operator providing index and table scan query.
*
*
*/

goog.provide('ydn.db.core.DbOperator');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.crud.DbOperator');
goog.require('ydn.db.core.IOperator');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.core.req.SimpleStore');
goog.require('ydn.db.core.req.WebSql');
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
 * @param {!ydn.db.schema.Database} schema schema.
 * @param {string} scope_name thread name.
 * @param {ydn.db.tr.IThread} thread execution thread.
 * @param {ydn.db.tr.IThread} sync_thread synchronization thread.
 * @implements {ydn.db.core.IOperator}
 * @constructor
 * @extends {ydn.db.crud.DbOperator}
*/
ydn.db.core.DbOperator = function(storage, schema, scope_name, thread,
                                  sync_thread) {
  goog.base(this, storage, schema, scope_name, thread, sync_thread);
};
goog.inherits(ydn.db.core.DbOperator, ydn.db.crud.DbOperator);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.DbOperator.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.DbOperator');


/**
 * @define {boolean} debug flag.
 */
ydn.db.core.DbOperator.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.get = function(arg1, arg2) {

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
      throw new ydn.debug.error.ArgumentException('store "' +
          q_store_name + '" not found.');
    }
    var index_name = q.getIndexName();
    if (goog.isDef(index_name) && !store.hasIndex(index_name)) {
      throw new ydn.debug.error.ArgumentException('index "' +
          index_name + '" not found in store "' + q_store_name + '".');
    }
    var list_df = new goog.async.Deferred();
    list_df.addCallbacks(function(x) {
      df.callback(x[0]); // undefined OK.
    }, function(e) {
      df.errback(e);
    });
    this.logger.finer('listByIterator:' + q);
    this.tx_thread.exec(list_df, function(tx, tx_no, cb) {
      me.getIndexExecutor().listByIterator(tx, tx_no, cb, q, 1);
    }, [q_store_name], ydn.db.base.TransactionMode.READ_ONLY, 'getByIterator');
    return df;
  } else {
    return goog.base(this, 'get', arg1, arg2);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.keys = function(arg1, arg2, arg3, arg4, arg5) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();

    /**
     * @type {number}
     */
    var limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    if (goog.isNumber(arg2)) {
      limit = /** @type {number} */ (arg2);
      if (limit < 1) {
        throw new ydn.debug.error.ArgumentException('limit must be ' +
            'a positive value, but ' + arg2);
      }
    } else if (goog.isDef(arg2)) {
      throw new ydn.debug.error.ArgumentException('limit must be a number, ' +
          ' but ' + arg2);
    }
    if (goog.isDef(arg3)) {
      throw new ydn.debug.error.ArgumentException('offset must be specified');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;

    this.logger.finer('keysByIterator:' + q);
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      me.getIndexExecutor().keysByIterator(tx, tx_no, cb, q, limit);
    }, q.stores(), ydn.db.base.TransactionMode.READ_ONLY, 'listByIterator');

    return df;
  } else {
    return goog.base(this, 'keys', arg1, arg2, arg3, arg4, arg5);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.count = function(arg1, arg2, arg3) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {
    if (goog.isDef(arg2) || goog.isDef(arg3)) {
      throw new ydn.debug.error.ArgumentException('too many arguments.');
    }
    var df = ydn.db.base.createDeferred();

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    this.logger.finer('countKeyRange:' + q);
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      me.getIndexExecutor().countKeyRange(tx, tx_no, cb, q.getStoreName(),
          q.keyRange(), q.getIndexName(), q.isUnique());
    }, q.stores(), ydn.db.base.TransactionMode.READ_ONLY, 'countByIterator');

    return df;
  } else {
    return goog.base(this, 'count', arg1, arg2, arg3);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.values = function(arg1, arg2, arg3, arg4,
                                                   arg5) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {
    var df = ydn.db.base.createDeferred();

    /**
     * @type {number}
     */
    var limit;
    if (goog.isNumber(arg2)) {
      limit = /** @type {number} */ (arg2);
      if (limit < 1) {
        throw new ydn.debug.error.ArgumentException('limit must be ' +
            'a positive value, but ' + limit);
      }
    } else if (goog.isDef(arg2)) {
      throw new ydn.debug.error.ArgumentException('limit must be a number, ' +
          'but ' + arg2);
    }
    if (goog.isDef(arg3)) {
      throw new ydn.debug.error.ArgumentException('offset must be specified');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    this.logger.finer('listByIterator:' + q);
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      me.getIndexExecutor().listByIterator(tx, tx_no, cb, q, limit);
    }, q.stores(), ydn.db.base.TransactionMode.READ_ONLY, 'listByIterator');

    return df;
  } else {
    return goog.base(this, 'values', arg1, arg2, arg3, arg4, arg5);
  }

};


/**
 * Cursor scan iteration.
 * @param {!Array.<!ydn.db.Iterator>} iterators the cursor.
 * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): !Array} solver
 * solver.
 * @param {!Array.<!ydn.db.Streamer>=} opt_streamers streamers.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.core.DbOperator.prototype.scan = function(iterators, solver,
                                                 opt_streamers) {

  var df = ydn.db.base.createDeferred();
  if (goog.DEBUG) {
    if (!goog.isArray(iterators)) {
      throw new TypeError('First argument must be array.');
    }
    for (var i = 0; i < iterators.length; i++) {
      var is_iter = iterators[i] instanceof ydn.db.Iterator;
      var is_streamer = iterators[i] instanceof ydn.db.Streamer;
      if (!is_iter && !is_streamer) {
        throw new TypeError('Iterator at ' + i +
            ' must be cursor range iterator or streamer.');
      }
    }
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

  this.logger.finest(this + ': scan for ' + iterators.length +
      ' iterators on ' + scopes);

  var passthrough_streamers = opt_streamers || [];
  for (var i = 0; i < passthrough_streamers.length; i++) {
    var store = passthrough_streamers[i].getStoreName();
    if (!goog.array.contains(scopes, store)) {
      scopes.push(store);
    }
  }

  var me = this;

  this.tx_thread.exec(df, function(tx, tx_no, cb) {

    var lbl = tx_no + ' ' + me + ' scanning';
    me.logger.finest(lbl);
    var done = false;

    var total;
    var idx2streamer = []; // convert main index to streamer index
    var idx2iterator = []; // convert main index to iterator index

    var keys = [];
    var values = [];
    /**
     *
     * @type {Array.<!ydn.db.Cursor>}
     */
    var cursors = [];
    var streamers = [];

    var do_exit = function() {

      for (var k = 0; k < cursors.length; k++) {
        cursors[k].exit();
      }
      done = true;
      goog.array.clear(cursors);
      goog.array.clear(streamers);
      // console.log('existing');
      me.logger.finer('success ' + lbl);
      cb(undefined);
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
      if (ydn.db.core.DbOperator.DEBUG) {
        window.console.log(me + ' ready and received result from solver ' +
            ydn.json.stringify(out));
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
            if (ydn.db.core.DbOperator.DEBUG) {
              window.console.log(iterator + ': restarting.');
            }
            goog.asserts.assert(restart[i] === true, i +
                ' restart must be true');
            req.restart();
          } else if (goog.isDefAndNotNull(next_effective_keys[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              window.console.log(iterator + ': continuing to ' +
                  next_effective_keys[i]);
            }
            req.continueEffectiveKey(next_effective_keys[i]);
          } else if (goog.isDefAndNotNull(next_primary_keys[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              window.console.log(iterator + ': continuing to primary key ' +
                  next_primary_keys[i]);
            }
            req.continuePrimaryKey(next_primary_keys[i]);
          } else if (goog.isDefAndNotNull(advance[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              window.console.log(iterator + ': advancing ' + advance[i] +
                  ' steps.');
            }
            goog.asserts.assert(advance[i] === 1, i +
                ' advance value must be 1');
            req.advance(1);
          } else {
            throw new ydn.error.InternalError(iterator + ': has no action');
          }
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
     * @param {number} i index.
     * @param {*} key key.
     * @param {*} value value.
     * @return {boolean}
     */
    var on_streamer_pop = function(i, key, value) {
      if (done) {
        if (ydn.db.core.DbOperator.DEBUG) {
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
     * @param {number} i index.
     * @param {IDBKey=} opt_key effective key.
     */
    var on_iterator_next = function(i, opt_key) {
      if (done) {
        if (ydn.db.core.DbOperator.DEBUG) {
          window.console.log('iterator ' + i + ' done');
        }
        // calling next to a terminated iterator
        throw new ydn.error.InternalError();
      }
      result_count++;
      var idx = idx2iterator[i];
      /**
       * @type {!ydn.db.Iterator}
       */
      var iterator = iterators[idx];
      /**
       * @type {!ydn.db.Cursor}
       */
      var cursor = cursors[idx];
      var primary_key = cursor.getPrimaryKey();
      var value = cursor.getValue();
      if (ydn.db.core.DbOperator.DEBUG) {
        window.console.log(['on_iterator_next', i, primary_key, opt_key, value,
          idx2iterator[i], result_count]);
      }

      if (iterator.isIndexIterator()) {
        keys[i] = opt_key;
        if (iterator.isKeyOnly()) {
          values[i] = primary_key;
        } else {
          values[i] = value;
        }
      } else {
        keys[i] = opt_key;
        if (iterator.isKeyOnly()) {
          values[i] = opt_key;
        } else {
          values[i] = value;
        }
      }

      var streamer_idx = idx2streamer[i];
      for (var j = 0, n = iterator.degree() - 1; j < n; j++) {
        var streamer = streamers[streamer_idx + j];
        streamer.pull(opt_key, value);
      }

      if (result_count === total) { // receive all results
        on_result_ready();
      }

    };

    var on_error = function(e) {
      for (var k = 0; k < cursors.length; k++) {
        cursors[k].exit();
      }
      goog.array.clear(cursors);
      goog.array.clear(streamers);
      me.logger.finer(lbl + ' error');
      cb(e, true);
    };

    var open_iterators = function() {
      var idx = 0;
      for (var i = 0; i < iterators.length; i++) {
        var iterator = iterators[i];
        var cursor = iterator.iterate(tx, tx_no, me.getIndexExecutor());
        cursor.onFail = on_error;
        cursor.onNext = goog.partial(on_iterator_next, idx);
        cursors[i] = cursor;
        idx2iterator[idx] = i;
        idx++;
        for (var j = 0, n = iterator.degree() - 1; j < n; j++) {
          var streamer = me.getIndexExecutor().getStreamer(tx, tx_no,
              iterator.getPeerStoreName(j), iterator.getBaseIndexName(j));
          streamer.setSink(goog.partial(on_streamer_pop, idx));
          streamers.push(streamer);
          idx2streamer[idx] = streamers.length;
          idx++;
        }
      }

      total = iterators.length + streamers.length;
    };

    for (var i = 0; i < passthrough_streamers.length; i++) {
      passthrough_streamers[i].setTx(tx);
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
 * @return {ydn.db.core.req.IRequestExecutor} executor.
 */
ydn.db.core.DbOperator.prototype.getIndexExecutor = function() {
  return /** @type {ydn.db.core.req.IRequestExecutor} */ (this.getExecutor());
};


/**
 *
 * @param {!ydn.db.Iterator} iter the cursor.
 * @param {Function} callback icursor handler.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.core.DbOperator.prototype.open = function(iter, callback, opt_mode) {
  if (!(iter instanceof ydn.db.Iterator)) {
    throw new ydn.debug.error.ArgumentException(
        'First argument must be cursor range iterator.');
  }
  var store = this.schema.getStore(iter.getStoreName());
  if (!store) {
    throw new ydn.debug.error.ArgumentException('Store "' +
        iter.getStoreName() + '" not found.');
  }
  var tr_mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;
  var df = ydn.db.base.createDeferred();
  this.logger.finer('open:' + tr_mode + ' ' + iter);
  this.tx_thread.exec(df, function(tx, tx_no, cb) {
    var lbl = tx_no + ' iterating ' + iter;
    me.logger.finest(lbl);
    var cursor = iter.iterate(tx, tx_no, me.getIndexExecutor());

    cursor.onFail = function(e) {
      cb(e, true);
    };
    /**
     * callback.
     * @param {IDBKey=} opt_key effective key.
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDefAndNotNull(opt_key)) {
        var adv = callback(cursor);
        if (adv === true) {
          cursor.restart();
        } else if (goog.isObject(adv)) {
          if (adv['restart'] === true) {
            cursor.restart(adv['continue'], adv['continuePrimary']);
          } else if (goog.isDefAndNotNull(adv['continue'])) {
            cursor.continueEffectiveKey(adv['continue']);
          } else if (goog.isDefAndNotNull(adv['continuePrimary'])) {
            cursor.continuePrimaryKey(adv['continuePrimary']);
          } else {
            cursor.exit();
            cb(undefined); // break the loop
          }
        } else {
          cursor.advance(1);
        }
      } else {
        cursor.exit();
        cb(undefined);
      }
    };

  }, iter.stores(), tr_mode, 'open');

  return df;

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.map = function(iterator, callback) {

  var me = this;
  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.debug.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = ydn.db.base.createDeferred();
  this.logger.finest('map:' + iterator);
  this.tx_thread.exec(df, function(tx, tx_no, cb) {

    var lbl = tx_no + ' iterating ' + iterator;
    me.logger.finest(lbl);
    var cursor = iterator.iterate(tx, tx_no, me.getIndexExecutor());

    cursor.onFail = function(e) {
      cb(e, false);
    };
    /**
     *
     * @param {IDBKey=} key
     */
    cursor.onNext = function (key) {
      if (goog.isDefAndNotNull(key)) {
        var ref;
        if (iterator.isIndexIterator()) {
          if (iterator.isKeyOnly()) {
            ref = key;
          } else {
            ref = cursor.getPrimaryKey();
          }
        } else {
          if (iterator.isKeyOnly()) {
            ref = key;
          } else {
            ref = cursor.getValue();
          }
        }
        callback(ref);
        //console.log(['onNext', key, primaryKey, value, ref, adv]);
        cursor.advance(1);

      } else {
        cb(undefined);
        callback = null;
      }
    };

  }, stores, ydn.db.base.TransactionMode.READ_ONLY, 'map');

  return df;
};


/**
 *
 * @param {!ydn.db.Iterator} iterator iterator.
 * @param {function(*, *, number): *} callback callback.
 * @param {*=} opt_initial initial value.
 */
ydn.db.core.DbOperator.prototype.reduce = function(iterator, callback,
                                                   opt_initial) {

  var me = this;
  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.debug.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = ydn.db.base.createDeferred();

  var previous = goog.isObject(opt_initial) ?
      ydn.object.clone(opt_initial) : opt_initial;
  this.logger.finer('reduce:' + iterator);
  this.tx_thread.exec(df, function(tx, tx_no, cb) {

    var cursor = iterator.iterate(tx, tx_no, me.getIndexExecutor());

    /**
     *
     * @param {!Error} e error.
     */
    cursor.onError = function(e) {
      cb(e, true);
    };
    var index = 0;
    /**
     *
     * @param {IDBKey=} opt_key effective key.
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDefAndNotNull(opt_key)) {
        var current_value;
        if (iterator.isIndexIterator()) {
          if (iterator.isKeyOnly()) {
            current_value = opt_key;
          } else {
            current_value = cursor.getPrimaryKey();
          }
        } else {
          if (iterator.isKeyOnly()) {
            current_value = opt_key;
          } else {
            current_value = cursor.getValue();
          }
        }

        //console.log([previous, current_value, index]);
        previous = callback(previous, current_value, index++);
        cursor.advance(1);
      } else {
        cb(previous);
      }
    };

  }, stores, ydn.db.base.TransactionMode.READ_ONLY, 'map');

  return df;
};




