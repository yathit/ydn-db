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
 * @fileoverview Provide atomic CRUD database operations.
 *
 * The actual operation is implemented in transaction queue. This class create
 * a new transaction queue as necessary.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.crud.Storage');
goog.require('ydn.base');
goog.require('ydn.db.crud.DbOperator');
goog.require('ydn.db.crud.IOperator');
goog.require('ydn.db.tr.Storage');
goog.require('ydn.object');
if (!ydn.db.base.NO_IDB) {
  goog.require('ydn.db.crud.req.IndexedDb');
}
if (!ydn.db.base.NO_SIMPLE) {
  goog.require('ydn.db.crud.req.SimpleStore');
}
if (!ydn.db.base.NO_WEBSQL) {
  goog.require('ydn.db.crud.req.WebSql');
}
goog.require('ydn.db.events.RecordEvent');
goog.require('ydn.db.events.StoreEvent');



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
 * @extends {ydn.db.tr.Storage}
 * @implements {ydn.db.crud.IOperator}
 * @constructor
 */
ydn.db.crud.Storage = function(opt_dbname, opt_schema, opt_options) {

  goog.base(this, opt_dbname, opt_schema, opt_options);

  var schema = this.schema;

  for (var i = 0; i < schema.countFullTextIndex(); i++) {
    var ft_schema = schema.fullTextIndex(i);
    var store = schema.getStore(ft_schema.getName());
    if (store) {
      if (!store.hasIndex('k')) {
        throw new ydn.debug.error.ArgumentException('full text index store "' +
            store.getName() + '" must have "keyword" index');
      }
      if (!store.hasIndex('v')) {
        throw new ydn.debug.error.ArgumentException('full text index store "' +
            store.getName() + '" must have "keyword" index');
      }
      if (store.getKeyPath() != 'id') {
        throw new ydn.debug.error.ArgumentException('full text index store "' +
            store.getName() + '" must use "id" as key path.');
      }
    } else {
      throw new ydn.debug.error.ArgumentException('full text index store "' +
          ft_schema.getName() + '" required.');
    }
    for (var j = 0; j < ft_schema.count(); j++) {
      var index = ft_schema.index(j);
      var source_store = schema.getStore(index.getStoreName());
      if (source_store) {
        this.addFullTextIndexer(source_store, ft_schema);
      } else {
        throw new ydn.debug.error.ArgumentException('full text source store "' +
            index.getStoreName() + '" does not exist for full text index "' +
            ft_schema.getName() + '"');
      }
    }
  }

};
goog.inherits(ydn.db.crud.Storage, ydn.db.tr.Storage);


/**
 * @override
 */
ydn.db.crud.Storage.prototype.init = function() {

  goog.base(this, 'init');

};


/**
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.newOperator = function(tx_thread, sync_thread) {
  return new ydn.db.crud.DbOperator(this, this.schema, tx_thread, sync_thread);
};


/**
 * Cast operator.
 * @return {ydn.db.crud.DbOperator}
 */
ydn.db.crud.Storage.prototype.getCoreOperator = function() {
  return /** @type {ydn.db.crud.DbOperator} */ (this.db_operator);
};


/**
 * @return {ydn.db.crud.req.IRequestExecutor}
 */
ydn.db.crud.Storage.prototype.newExecutor = function() {

  var type = this.getType();
  if (!ydn.db.base.NO_IDB && type == ydn.db.base.Mechanisms.IDB) {
    return new ydn.db.crud.req.IndexedDb(this.db_name, this.schema);
  } else if (!ydn.db.base.NO_WEBSQL && type == ydn.db.base.Mechanisms.WEBSQL) {
    return new ydn.db.crud.req.WebSql(this.db_name, this.schema);
  } else if (!ydn.db.base.NO_SIMPLE && type == ydn.db.base.Mechanisms.MEMORY_STORAGE ||
      type == ydn.db.base.Mechanisms.LOCAL_STORAGE ||
      type == ydn.db.base.Mechanisms.USER_DATA ||
      type == ydn.db.base.Mechanisms.SESSION_STORAGE) {
    return new ydn.db.crud.req.SimpleStore(this.db_name, this.schema);
  } else {
    throw new ydn.db.InternalError('No executor for ' + type);
  }

};


/**
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.add = function(store, value, opt_key) {
  return this.getCoreOperator().add(store, value, opt_key);
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.count = function(store_name, key_range, index,
                                               unique) {
  return this.getCoreOperator().count(store_name, key_range, index, unique);
};


/**
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.get = function(arg1, arg2) {
  return this.getCoreOperator().get(arg1, arg2);
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.keys = function(store_name, arg2, arg3, arg4,
                                              arg5, arg6) {
  //  return ydn.db.crud.DbOperator.prototype.keys.apply(
  //    /** @type {ydn.db.crud.DbOperator} */ (this.base_tx_queue),
  //    Array.prototype.slice.call(arguments));

  // above trick is the same effect as follow
  //return this.getCoreOperator().keys(store_name, arg2, arg3,
  //  arg4, arg5, arg6, arg7);
  // but it preserve argument length

  return this.getCoreOperator().keys(store_name, arg2, arg3, arg4, arg5, arg6);
};


/**
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.values = function(arg1, arg2, arg3, arg4, arg5,
                                                arg6) {
  return this.getCoreOperator().values(arg1, arg2, arg3, arg4, arg5, arg6);
};


/**
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.load = function(store_name_or_schema, data,
                                              delimiter)  {
  return this.getCoreOperator().load(store_name_or_schema, data, delimiter);
};


/**
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.put = function(store, value, opt_key) {
  return this.getCoreOperator().put(store, value, opt_key);
};


/**
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.clear = function(arg1, arg2, arg3) {
  return this.getCoreOperator().clear(arg1, arg2, arg3);
};


/**
 * @inheritDoc
 */
ydn.db.crud.Storage.prototype.remove = function(arg1, arg2, arg3) {
  return this.getCoreOperator().remove(arg1, arg2, arg3);
};


if (goog.DEBUG) {
  /** @override */
  ydn.db.crud.Storage.prototype.toString = function() {
    var s = 'Storage:' + this.getName();
    if (this.isReady()) {
      s += ' [' + this.getType() + ']';
    }
    return s;
  };
}

goog.exportSymbol('ydn.db.Storage', ydn.db.crud.Storage);

goog.exportProperty(ydn.db.crud.Storage.prototype, 'branch',
    ydn.db.crud.Storage.prototype.branch);

goog.exportProperty(ydn.db.crud.Storage.prototype, 'add',
    ydn.db.crud.Storage.prototype.add);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'get',
    ydn.db.crud.Storage.prototype.get);
//goog.exportProperty(ydn.db.crud.Storage.prototype, 'load',
//  ydn.db.crud.Storage.prototype.load);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'values',
    ydn.db.crud.Storage.prototype.values);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'put',
    ydn.db.crud.Storage.prototype.put);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'clear',
    ydn.db.crud.Storage.prototype.clear);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'remove',
    ydn.db.crud.Storage.prototype.remove);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'count',
    ydn.db.crud.Storage.prototype.count);

goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'add',
    ydn.db.crud.DbOperator.prototype.add);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'get',
    ydn.db.crud.DbOperator.prototype.get);
//goog.exportProperty(ydn.db.crud.Storage.prototype, 'load',
//  ydn.db.crud.Storage.prototype.load);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'values',
    ydn.db.crud.DbOperator.prototype.values);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'put',
    ydn.db.crud.DbOperator.prototype.put);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'clear',
    ydn.db.crud.DbOperator.prototype.clear);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'remove',
    ydn.db.crud.DbOperator.prototype.remove);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'count',
    ydn.db.crud.DbOperator.prototype.count);

goog.exportSymbol('ydn.db.cmp', ydn.db.cmp);

goog.exportSymbol('ydn.db.Key', ydn.db.Key);
goog.exportProperty(ydn.db.Key.prototype, 'id', ydn.db.Key.prototype.getId);
goog.exportProperty(ydn.db.Key.prototype, 'parent',
    ydn.db.Key.prototype.getParent);
goog.exportProperty(ydn.db.Key.prototype, 'storeName',
    ydn.db.Key.prototype.getStoreName);


goog.exportSymbol('ydn.db.KeyRange', ydn.db.KeyRange);
goog.exportProperty(ydn.db.KeyRange, 'upperBound', ydn.db.KeyRange.upperBound);
goog.exportProperty(ydn.db.KeyRange, 'lowerBound', ydn.db.KeyRange.lowerBound);
goog.exportProperty(ydn.db.KeyRange, 'bound', ydn.db.KeyRange.bound);
goog.exportProperty(ydn.db.KeyRange, 'only', ydn.db.KeyRange.only);
goog.exportProperty(ydn.db.KeyRange, 'starts', ydn.db.KeyRange.starts);


goog.exportProperty(ydn.db.events.Event.prototype, 'store_name',
    ydn.db.events.Event.prototype.store_name); // this don't work, why?
goog.exportProperty(ydn.db.events.Event.prototype, 'getStoreName',
    ydn.db.events.Event.prototype.getStoreName);

goog.exportProperty(ydn.db.events.RecordEvent.prototype, 'name',
    ydn.db.events.RecordEvent.prototype.name);
goog.exportProperty(ydn.db.events.RecordEvent.prototype, 'getKey',
    ydn.db.events.RecordEvent.prototype.getKey);
goog.exportProperty(ydn.db.events.RecordEvent.prototype, 'getValue',
    ydn.db.events.RecordEvent.prototype.getValue);


goog.exportProperty(ydn.db.events.StoreEvent.prototype, 'name',
    ydn.db.events.StoreEvent.prototype.name);
goog.exportProperty(ydn.db.events.StoreEvent.prototype, 'getKeys',
    ydn.db.events.StoreEvent.prototype.getKeys);
goog.exportProperty(ydn.db.events.StoreEvent.prototype, 'getValues',
    ydn.db.events.StoreEvent.prototype.getValues);


