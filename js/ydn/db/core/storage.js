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
 * @fileoverview Provide iteration query.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.Storage');
goog.require('ydn.db.core.DbOperator');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.math.Expression');


/**
 * Construct storage providing atomic CRUD database operations on implemented
 * storage mechanisms.
 *
 * This class do not execute database operation, but create a non-overlapping
 * transaction queue on ydn.db.crud.DbOperator and all operations are
 * passed to it.
 *
 *
 * @param {string=} opt_dbname database name.
 * @param {(ydn.db.schema.Database|!DatabaseSchema)=} opt_schema database
 * schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * @param {!StorageOptions=} opt_options options.
 * @extends {ydn.db.crud.Storage}
 * @implements {ydn.db.core.IOperator}
 * @constructor
 */
ydn.db.core.Storage = function(opt_dbname, opt_schema, opt_options) {

  goog.base(this, opt_dbname, opt_schema, opt_options);

};
goog.inherits(ydn.db.core.Storage, ydn.db.crud.Storage);


///**
// * @override
// */
//ydn.db.core.Storage.prototype.newTxQueue = function(thread, scope_name) {
//  thread = thread || this.thread;
//  return new ydn.db.core.DbOperator(this, thread, this.ptx_no++,
//      this.schema, scope_name);
//};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.newExecutor = function() {

  var type = this.getType();
  if (type == ydn.db.base.Mechanisms.IDB) {
    return new ydn.db.core.req.IndexedDb(this.db_name, this.schema);
  } else if (type == ydn.db.base.Mechanisms.WEBSQL) {
    return new ydn.db.core.req.WebSql(this.db_name, this.schema);
  } else if (type == ydn.db.base.Mechanisms.MEMORY_STORAGE ||
      type == ydn.db.base.Mechanisms.USER_DATA ||
      type == ydn.db.base.Mechanisms.LOCAL_STORAGE ||
      type == ydn.db.base.Mechanisms.SESSION_STORAGE) {
    return new ydn.db.core.req.SimpleStore(this.db_name, this.schema);
  } else {
    throw new ydn.db.InternalError('No executor for ' + type);
  }

};


/**
 * Create a new operator.
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.newOperator = function(tx_thread, sync_thread) {
  return new ydn.db.core.DbOperator(this, this.schema, tx_thread, sync_thread);
};


/**
 * Get casted operator.
 * @return {ydn.db.core.DbOperator} casted operator.
 */
ydn.db.core.Storage.prototype.getIndexOperator = function() {
  return /** @type {ydn.db.core.DbOperator} */ (this.db_operator);
};


/**
 *
 * @param {Function} callback icursor handler.
 * @param {!ydn.db.Iterator} iterator the cursor.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.core.Storage.prototype.open = function(callback, iterator, opt_mode) {
  return this.getIndexOperator().open(callback, iterator, opt_mode);
};


/**
 * Cursor scan iteration.
 * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): !Array} solver
 * solver.
 * @param {!Array.<!ydn.db.Iterator>} iterators the cursor.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.core.Storage.prototype.scan = function(solver, iterators) {
  return this.getIndexOperator().scan(solver, iterators);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.map = function(iterator, callback) {
  return this.getIndexOperator().map(iterator, callback);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.reduce = function(iterator, callback,
                                                opt_initial) {
  return this.getIndexOperator().reduce(iterator, callback, opt_initial);
};

//goog.exportSymbol('ydn.db.Storage', ydn.db.core.Storage);

goog.exportProperty(ydn.db.core.Storage.prototype, 'scan',
    ydn.db.core.Storage.prototype.scan);
goog.exportProperty(ydn.db.core.Storage.prototype, 'map',
    ydn.db.core.Storage.prototype.map);
goog.exportProperty(ydn.db.core.Storage.prototype, 'reduce',
    ydn.db.core.Storage.prototype.reduce);
goog.exportProperty(ydn.db.core.Storage.prototype, 'open',
    ydn.db.core.Storage.prototype.open);

goog.exportProperty(ydn.db.core.DbOperator.prototype, 'scan',
    ydn.db.core.DbOperator.prototype.scan);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'map',
    ydn.db.core.DbOperator.prototype.map);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'reduce',
    ydn.db.core.DbOperator.prototype.reduce);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'open',
    ydn.db.core.DbOperator.prototype.open);

goog.exportProperty(ydn.db.Cursor.prototype, 'getKey',
    ydn.db.Cursor.prototype.getKey);
goog.exportProperty(ydn.db.Cursor.prototype, 'getPrimaryKey',
    ydn.db.Cursor.prototype.getPrimaryKey);
goog.exportProperty(ydn.db.Cursor.prototype, 'getValue',
    ydn.db.Cursor.prototype.getValue);
goog.exportProperty(ydn.db.Cursor.prototype, 'update',
    ydn.db.Cursor.prototype.update);
goog.exportProperty(ydn.db.Cursor.prototype, 'clear',
    ydn.db.Cursor.prototype.clear);

goog.exportSymbol('ydn.math.Expression', ydn.math.Expression);
goog.exportProperty(ydn.math.Expression.prototype, 'evaluate',
    ydn.math.Expression.prototype.evaluate);
goog.exportProperty(ydn.math.Expression.prototype, 'compile',
    ydn.math.Expression.prototype.compile);
goog.exportProperty(ydn.math.Expression, 'parseRpn',
    ydn.math.Expression.parseRpn);
goog.exportProperty(ydn.math.Expression, 'parseInfix',
    ydn.math.Expression.parseInfix);


goog.exportSymbol('ydn.db.Iterator', ydn.db.Iterator);
goog.exportSymbol('ydn.db.KeyCursors', ydn.db.KeyCursors);
goog.exportSymbol('ydn.db.ValueCursors', ydn.db.ValueCursors);
goog.exportSymbol('ydn.db.Cursors', ydn.db.Cursors);
goog.exportSymbol('ydn.db.IndexValueCursors', ydn.db.IndexValueCursors);

goog.exportProperty(ydn.db.Iterator.prototype, 'count',
    ydn.db.Iterator.prototype.count);
goog.exportProperty(ydn.db.Iterator.prototype, 'getState',
    ydn.db.Iterator.prototype.getState);
goog.exportProperty(ydn.db.Iterator.prototype, 'getKeyRange',
    ydn.db.Iterator.prototype.getKeyRange);
goog.exportProperty(ydn.db.Iterator.prototype, 'getIndexName',
    ydn.db.Iterator.prototype.getIndexName);
goog.exportProperty(ydn.db.Iterator.prototype, 'getStoreName',
    ydn.db.Iterator.prototype.getStoreName);
goog.exportProperty(ydn.db.Iterator.prototype, 'isReversed',
    ydn.db.Iterator.prototype.isReversed);
goog.exportProperty(ydn.db.Iterator.prototype, 'isUnique',
    ydn.db.Iterator.prototype.isUnique);
goog.exportProperty(ydn.db.Iterator.prototype, 'isKeyIterator',
    ydn.db.Iterator.prototype.isKeyIterator);
goog.exportProperty(ydn.db.Iterator.prototype, 'isIndexIterator',
    ydn.db.Iterator.prototype.isIndexIterator);
goog.exportProperty(ydn.db.Iterator.prototype, 'getPrimaryKey',
    ydn.db.Iterator.prototype.getPrimaryKey);
goog.exportProperty(ydn.db.Iterator.prototype, 'getKey',
    ydn.db.Iterator.prototype.getKey);
goog.exportProperty(ydn.db.Iterator.prototype, 'resume',
    ydn.db.Iterator.prototype.resume);
goog.exportProperty(ydn.db.Iterator.prototype, 'reset',
    ydn.db.Iterator.prototype.reset);
goog.exportProperty(ydn.db.Iterator.prototype, 'reverse',
    ydn.db.Iterator.prototype.reverse);

goog.exportProperty(ydn.db.KeyCursors, 'where', ydn.db.KeyCursors.where);
goog.exportProperty(ydn.db.ValueCursors, 'where', ydn.db.ValueCursors.where);
goog.exportProperty(ydn.db.Cursors, 'where', ydn.db.Cursors.where);
goog.exportProperty(ydn.db.IndexValueCursors, 'where',
    ydn.db.IndexValueCursors.where);

goog.exportSymbol('ydn.db.Streamer', ydn.db.Streamer);
goog.exportProperty(ydn.db.Streamer.prototype, 'push',
    ydn.db.Streamer.prototype.push);
goog.exportProperty(ydn.db.Streamer.prototype, 'collect',
    ydn.db.Streamer.prototype.collect);
goog.exportProperty(ydn.db.Streamer.prototype, 'setSink',
    ydn.db.Streamer.prototype.setSink);
