

goog.provide('ydn.db.query.BasicTest');
goog.setTestOnly('ydn.db.query.BasicTest');

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Query');
goog.require('ydn.db.Storage');

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();

function setUp() {

}


function tearDown() {

}


function testEquiRestrictionWithOrdering() {

  var schema = {
    stores: [
      {
        name: 'assets',
        keyPath: 'id',
        type: 'NUMERIC',

        indexes: [

          {
            name: 'statusIdx',
            keyPath: 'statusIdx',
            type: 'NUMERIC'
          },
          {
            name: 'statusIdx, location.name',
            keyPath: ['statusIdx', 'location.name']
          }
        ]}]
  };
  var data = [{
    'location': {
      'name': 'c name 1'
    },
    'id': 27696,
    statusIdx: 1
  }, {
    'location': {
      'name': 'a test name 2'
    },
    'id': 52755,
    statusIdx: 2
  }, {
    'location': {
      'name': 'Jepsen test'
    },
    'id': 3014,
    statusIdx: 2
  }];

  var db_name = 'testEquiRestrictionWithOrdering';
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function(e) {
    db.put('assets', data);

    var query = db.from('assets')
        .where('statusIdx', '=', 2)
        .order('location.name', true);
    query.list()
        .addCallbacks(function(x) {
          assertArrayEquals('added data', [data[2], data[1]], x);
          asyncTestCase.continueTesting();
          ydn.db.deleteDatabase(db.getName(), db.getType());
          db.close();
        }, function(e) {
          window.console.error(e);
        });
  });

}



function testCompoundIndexQuery() {

  var schema = {
    stores: [
      {
        name: 'users',
        autoIncrement: true,
        indexes: [
          {
            name: 'name',
            keyPath: 'name'
          },
          {
            name: 'age',
            keyPath: 'age'
          },
          {
            name: 'name, age',
            keyPath: ['name', 'age']
          }
        ]
      }
    ]
  };

  var values = [
    {"name": "Lara", "age": 45, "registered": "2015-12-21T10:14:59.661Z"}
    , {"name": "Sarah", "age": 25, "registered": "2016-01-12T09:00:32.736Z"}
    , {"name": "Benny", "age": 28, "registered": "2015-12-21T09:55:17.201Z"}
    , {"name": "John", "age": 39, "registered": "2015-12-18T11:14:50.426Z"}
    , {"name": "Benny", "age": 30, "registered": "2014-12-18T11:14:50.426Z"}
  ];


  var db_name = 'testCompoundIndexQuery';
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function(e) {
    db.clear();
    db.put('users', values);

    var query = db.from('users')
        .where('name, age', '>', ['Benny'], '<', ['Benny', 30])
        .list()
        .addCallbacks(function(x) {
          assertArrayEquals('result', [values[2]], x);
          asyncTestCase.continueTesting();
          ydn.db.deleteDatabase(db.getName(), db.getType());
          db.close();
        }, function(e) {
          window.console.error(e);
        });
  });

}


function testOpen() {
  var schema = {
    stores: [
      {
        name: 'assets',
        keyPath: 'id',
        indexes: [
          {
            name: 'statusIdx',
            keyPath: 'statusIdx'
          }]
      }]};
  var data = [{
    'location': {
      'name': 'c name 1'
    },
    'id': 27696,
    statusIdx: 1
  }, {
    'location': {
      'name': 'a test name 2'
    },
    'id': 52755,
    statusIdx: 2
  }, {
    'location': {
      'name': 'Jepsen test'
    },
    'id': 3014,
    statusIdx: 2
  }];

  var db_name = 'testQueryOpen';
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function(e) {
    db.put('assets', data);
    var query = db.from('assets').where('statusIdx', '=', 1);
    query.open(function(cursor) {
      console.log(cursor.getValue());
      assertEquals(1, cursor.getKey());
      assertEquals(27696, cursor.getPrimaryKey());
      assertObjectEquals(data[0], cursor.getValue());
    }).addBoth(function() {
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
}

