

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var to_del = [];
// var options = {mechanisms: ['indexeddb']};
var options = {mechanisms: ['websql']};

function setUp() {
  ydn.json.POLY_FILL = true;
  ydn.debug.log('ydn.db', 'finest');

}


function tearDown() {
  var name;
  while (name = to_del.pop()) {
    ydn.db.deleteDatabase(name, options.mechanisms[0]);
  }
}


function test_compoundindex() {
  var db_name = 'test_issue_98_5';
  var schema = {
    stores: [
      {
        name: 'test',
        keyPath: 'id',
        indexes: [
          {
            keyPath: ['first', 'last']
          },
          {
            keyPath: 'first'
          },
          {
            keyPath: 'last'
          }
        ]
      }]
  };
  var db = new ydn.db.Storage('test_issue_98', schema, options);

  var data = [{id: 1, first: 'First', last: 'Last'}, {
    id: 2,
    first: 'First',
    last: 'Last'
  }];
  asyncTestCase.waitForAsync('ready');
  db.onReady(function() {
    asyncTestCase.continueTesting();
    db.put('test', data[0]);
    db.put('test', data[1]);

    asyncTestCase.waitForAsync('first');
    db.from('test').where('first', '=', 'First').order('last').list(20).addCallbacks(function(x) {
      assertArrayEquals(data, x);
      asyncTestCase.continueTesting();
      asyncTestCase.waitForAsync('second');
      db.close();
      var db2 = new ydn.db.Storage('test_issue_98', schema, options);
      db2.from('test').where('first', '=', 'First').order('last').list(20).addCallbacks(function(x) {
        assertArrayEquals(data, x);
        asyncTestCase.continueTesting();
        db2.close();
      }, function(e) {
        fail(e);
      });
    }, function(e) {
      fail(e);
    });
  });

  to_del.push(to_del);
}

