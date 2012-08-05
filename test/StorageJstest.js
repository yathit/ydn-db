/**
 * @fileoverview JsTestDriver test unit for ydn.store.Storage.
 */

goog.provide('ydn.store.StorageJstest');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.Storage');
goog.require('ydn.db.test');


ydn.store.StorageJstest = AsyncTestCase('StorageJstest');

ydn.store.StorageJstest.prototype.setUp = function() {
  //console.log('running test for PageJstest');

  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.Storage').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);

  this.dbname = 'storage_test';
  this.table = 'test';
  this.schema = {};
  this.schema[this.table] = {'keyPath': 'id'};
};


ydn.store.StorageJstest.prototype.test_put = function(queue) {
  var db = new ydn.db.Storage(this.dbname + '1', {}, '1');

  queue.call('put a', function(callbacks) {
    db.setItem('a', '1').addCallback(callbacks.add(function(value) {
      assertTrue('put a OK', value);
    }));
  });
};

ydn.store.StorageJstest.prototype._test_put = function(queue) {
  var db = new ydn.db.Storage(this.dbname + '2', {}, '1');

  var v = 'a' + Math.random();
  queue.call('put a', function(callbacks) {
    db.setItem('a', v).addCallback(callbacks.add(function(value) {
      assertTrue('put a OK', value);
    }));
  });

  queue.call('get a', function(callbacks) {
    db.getItem('a').addCallback(callbacks.add(function(value) {
      assertEquals('put a OK', v, value);
    }));
  });
};




