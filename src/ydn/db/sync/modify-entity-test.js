

goog.provide('ydn.db.sync.ModifyEntityTest');
goog.setTestOnly('ydn.db.sync.ModifyEntityTest');

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Storage');
goog.require('ydn.db.sync.Entity');
goog.require('ydn.db.sync.MockEntityService');
goog.require('ydn.debug');


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();

function setUp() {
  // ydn.debug.log('ydn.db', 'finer');
}


function tearDown() {

}


function testUpdating() {
  var schema = {
    stores: [
      ydn.db.base.entitySchema,
      {
        name: 'foo',
        autoIncrement: true,
        indexes: [{
          name: 'id'
        }]
      }
    ]
  };
  var db_name = 'sync-crud-modify-1';
  var data_1 = { test: 'test value', id: 1 };
  var service = new ydn.db.sync.MockEntityService({1: data_1});
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function() {
    db.clear();
    var fooEntity = new ydn.db.sync.Entity(service, 'foo', db);
    fooEntity.put(data_1.id, data_1).addCallbacks(function(x) {
      assertObjectEquals('added data', x, data_1);
      db.values('foo').addBoth(function(x) {
        assertEquals('number of records', x.length, 1);
        assertObjectEquals('save in store', x[0], data_1);
        var data_2 = { test: 'new value', id: 1 };
        fooEntity.put(data_2.id, data_2).addBoth(function(obj) {
          assertObjectEquals('modified data', obj, data_2);
          db.values('foo').addBoth(function(x) {
            assertEquals('number of records after modified', x.length, 1);
            assertObjectEquals('save in store after modified', x[0], data_2);
            ydn.db.deleteDatabase(db.getName(), db.getType());
            db.close();
            asyncTestCase.continueTesting();
          });
        });
      });
    }, function(e) {
      window.console.log(e);
    });
  });
}
