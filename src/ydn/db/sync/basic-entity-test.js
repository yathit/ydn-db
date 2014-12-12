

goog.provide('ydn.db.sync.BasicEntityTest');
goog.setTestOnly('ydn.db.sync.BasicEntityTest');

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Storage');
goog.require('ydn.db.sync.Entity');
goog.require('ydn.db.sync.MockEntityService');


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();

function setUp() {

}


function tearDown() {

}


function testAdd() {

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
  var db_name = 'sync-crud-add-1';
  var data_1 = { test: 'test value', name: 'name 1', id: 1 };
  var service = new ydn.db.sync.MockEntityService({});
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function(e) {
    if (e) {
      window.console.error(e.error.stack);
    }
    db.clear();
    var fooEntity = new ydn.db.sync.Entity(service, 'foo', db);

    fooEntity.add(data_1).addCallbacks(function(x) {
      assertObjectEquals('added data', data_1, x);
      db.values('foo', 'id', ydn.db.KeyRange.only(data_1.id)).addBoth(function(x) {
        assertObjectEquals('save in store', data_1, x[0]);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        asyncTestCase.continueTesting();
      });
    }, function(e) {
      window.console.error(e);
    });
  });

}

