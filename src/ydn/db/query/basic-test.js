

goog.provide('ydn.db.query.BasicTest');
goog.setTestOnly('ydn.db.query.BasicTest');

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Storage');
goog.require('ydn.db.Query');

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
  var data =  [{
    "location": {
      "name": "c name 1"
    },
    "id": 27696,
    statusIdx: 1
  }, {
    "location": {
      "name": "a test name 2"
    },
    "id": 52755,
    statusIdx: 2
  }, {
    "location": {
      "name": "Jepsen test"
    },
    "id": 3014,
    statusIdx: 2
  }];

  var db_name = 'testEquiRestrictionWithOrdering';
  var db = new ydn.db.Storage(db_name, schema);
  asyncTestCase.waitForAsync('database ready');
  db.onReady(function(e) {
    if (e) {
      window.console.error(e.error.stack);
    }
    db.put('assets', data)

    var query = db.from('assets')
        .where('statusIdx', '=', 2)
        .order('location.name', true);
    query.list()
        .addCallbacks(function (x) {
          assertArrayEquals('added data', [data[2], data[1]], x);
          asyncTestCase.continueTesting();
        }, function (e) {
          window.console.error(e);
        });
  });

}

