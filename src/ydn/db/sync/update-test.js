

goog.provide('ydn.db.sync.UpdateEntityTest');
goog.setTestOnly('ydn.db.sync.UpdateEntityTest');

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



function testUpdate() {
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
  var db_name = 'sync-crud-update-1';
  var data = {
    '1': {test: 'test value', name: 'name 1', id: 1 },
    '2': {test: 'test value', name: 'name 2', id: 2 },
    '3': {test: 'test value', name: 'name 3', id: 3 }
  };
  var service = new ydn.db.sync.MockEntityService(data);
  service.max_results = 2;
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function() {
    db.clear('foo');
    var fooEntity = new ydn.db.sync.Entity(service, 'foo', db);
    fooEntity.update().addBoth(function(cnt) {
      assertEquals('number of records updated', 3, cnt);
      db.values('foo').addBoth(function(arr) {
        assertEquals('number of records retrieved', 3, arr.length);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        assertEquals('list call', 2, service.countRequest('list'));
        asyncTestCase.continueTesting();
      });
    });
  });
}

