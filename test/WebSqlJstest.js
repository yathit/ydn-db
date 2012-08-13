/**
 * @fileoverview JsTestDriver test unit for ydn.store.Storage.
 */

goog.provide('ydn.store.WebSqlJstest');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.WebSql');
goog.require('ydn.db.test');


ydn.store.WebSqlJstest = AsyncTestCase('WebSqlJstest');

ydn.store.WebSqlJstest.prototype.setUp = function() {
  //console.log('running test for IndexedDbJstest');

  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);

  this.dbname = 'test_1';

};


ydn.store.WebSqlJstest.prototype.test_special_key = function(queue) {
  var db = new ydn.db.WebSql(this.dbname, ydn.db.test.getSchema());
  ydn.db.test.special_keys_test(queue, db);
};

ydn.store.WebSqlJstest.prototype.test_clear = function(queue) {
  var db = new ydn.db.WebSql(this.dbname, ydn.db.test.getSchema());
  ydn.db.test.clear_tests(queue, db);
};


ydn.store.WebSqlJstest.prototype.test_put_get_object = function(queue) {
  var db = new ydn.db.WebSql(this.dbname, ydn.db.test.getSchema());
  ydn.db.test.run_put_get_tests(queue, db);
};


ydn.store.WebSqlJstest.prototype.test_empty_store_get = function(queue) {
  var db = new ydn.db.WebSql(this.dbname, ydn.db.test.getSchema());
  ydn.db.test.empty_store_get_test(queue, db);
};

ydn.store.WebSqlJstest.prototype.test_nested_key_path = function(queue) {
  var db = new ydn.db.WebSql('nested_key_path', ydn.db.test.get_nested_key_path_schema());
  ydn.db.test.nested_key_path(queue, db);
};

