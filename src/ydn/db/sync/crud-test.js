

goog.provide('ydn.db.sync.CrudEntityTest');
goog.setTestOnly('ydn.db.sync.CrudEntityTest');

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

function testGet() {
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
  var db_name = 'sync-crud-get-1';
  var data_1 = { test: 'test value', name: 'name 1', id: 1 };
  var service = new ydn.db.sync.MockEntityService(data_1);
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function(e) {
    if (e) {
      window.console.error(e.error.stack);
    }
    db.clear();
    var fooEntity = new ydn.db.sync.Entity(service, 'foo', db);
    fooEntity.get(1).addCallbacks(function(x) {
      assertObjectEquals('added data', data_1, x);
      db.values('foo', 'id', ydn.db.KeyRange.only(data_1.id)).addBoth(function(x) {
        assertObjectEquals('save in store', data_1, x[0]);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        assertEquals(1, service.countRequest('get'));
        asyncTestCase.continueTesting();
      });
    }, function(e) {
      window.console.error(e);
    });
  });
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
  var db_name = 'sync-crud-add-2';
  var data_1 = { test: 'test value', name: 'name 1', id: 1 };
  var service = new ydn.db.sync.MockEntityService(data_1);
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
        assertEquals(1, service.countRequest('add'));
        asyncTestCase.continueTesting();
      });
    }, function(e) {
      window.console.error(e);
    });
  });
}


function testPut() {
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
  var db_name = 'sync-crud-put-1';
  var data_1 = { test: 'test value', name: 'name 1', id: 1 };
  var service = new ydn.db.sync.MockEntityService({1: data_1});
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function() {
    db.clear();
    var fooEntity = new ydn.db.sync.Entity(service, 'foo', db);
    fooEntity.put(data_1.id, data_1).addCallbacks(function(x) {
      assertObjectEquals('added data', x, data_1);
      db.values('foo', 'id', ydn.db.KeyRange.only(data_1.id)).addBoth(function(x) {
        assertObjectEquals('save in store', x[0], data_1);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        assertEquals(1, service.countRequest('put'));
        asyncTestCase.continueTesting();
      });
    }, function(e) {
      window.console.log(e);
    });
  });
}


function testRemove() {
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
  var db_name = 'sync-crud-remove-1';
  var data_1 = { test: 'test value', name: 'name 1', id: 1 };
  var service = new ydn.db.sync.MockEntityService({});
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function() {
    db.clear();
    var fooEntity = new ydn.db.sync.Entity(service, 'foo', db);
    fooEntity.put(data_1.id, data_1).addBoth(function() {
      fooEntity.remove(1).addBoth(function(cnt) {
        assertEquals(cnt, 1);
        db.values('foo', 'id', ydn.db.KeyRange.only(1)).addBoth(function(x) {
          assertEquals(0, x.length);
          ydn.db.deleteDatabase(db.getName(), db.getType());
          db.close();
          assertEquals(1, service.countRequest('remove'));
          asyncTestCase.continueTesting();
        });
      });
    });
  });
}

