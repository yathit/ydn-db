/**
 * @fileoverview Exports for core ydn-db module.
 *
 */

goog.require('ydn.db.core.Storage');
goog.require('ydn.db.core.DbOperator');
goog.require('ydn.db');
goog.require('ydn.db.events.RecordEvent');
goog.require('ydn.db.events.StoreEvent');


goog.exportSymbol('ydn.db.core.Storage', ydn.db.core.Storage);

goog.exportProperty(ydn.db.core.Storage.prototype, 'thread',
  ydn.db.core.Storage.prototype.thread);

goog.exportProperty(ydn.db.core.Storage.prototype, 'add',
    ydn.db.core.Storage.prototype.add);
goog.exportProperty(ydn.db.core.Storage.prototype, 'get',
    ydn.db.core.Storage.prototype.get);
//goog.exportProperty(ydn.db.core.Storage.prototype, 'load',
//  ydn.db.core.Storage.prototype.load);
goog.exportProperty(ydn.db.core.Storage.prototype, 'list',
  ydn.db.core.Storage.prototype.list);
goog.exportProperty(ydn.db.core.Storage.prototype, 'put',
    ydn.db.core.Storage.prototype.put);
goog.exportProperty(ydn.db.core.Storage.prototype, 'clear',
    ydn.db.core.Storage.prototype.clear);
goog.exportProperty(ydn.db.core.Storage.prototype, 'count',
  ydn.db.core.Storage.prototype.count);

goog.exportProperty(ydn.db.core.DbOperator.prototype, 'add',
    ydn.db.core.DbOperator.prototype.add);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'get',
    ydn.db.core.DbOperator.prototype.get);
//goog.exportProperty(ydn.db.core.Storage.prototype, 'load',
//  ydn.db.core.Storage.prototype.load);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'list',
  ydn.db.core.DbOperator.prototype.list);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'put',
    ydn.db.core.DbOperator.prototype.put);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'clear',
    ydn.db.core.DbOperator.prototype.clear);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'count',
  ydn.db.core.DbOperator.prototype.count);

goog.exportSymbol('ydn.db.cmp', ydn.db.cmp);

goog.exportSymbol('ydn.db.Key', ydn.db.Key );
goog.exportProperty(ydn.db.Key.prototype, 'id', ydn.db.Key.prototype.getId);
goog.exportProperty(ydn.db.Key.prototype, 'parent',
  ydn.db.Key.prototype.getParent);
goog.exportProperty(ydn.db.Key.prototype, 'storeName',
  ydn.db.Key.prototype.getStoreName);


goog.exportSymbol('ydn.db.KeyRange', ydn.db.KeyRange );
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



