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
  goog.debug.Logger.getLogger('ydn.store').setLevel(goog.debug.Logger.Level.FINEST);

  this.dbname = 'test_1';
  this.table = 'test';
  this.schema = {};
  this.schema[this.table] = {'keyPath': 'id'};

};


