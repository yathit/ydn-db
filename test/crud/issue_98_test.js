
goog.require('goog.debug.Console');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.debug');

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var to_del = [];


var setUp = function() {
  ydn.json.POLY_FILL = true;
};

var tearDown = function() {

};

function composite_index_test(type) {
  var db_name = 'issue98';
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
      }]};
  var option = {mechanisms: [type]};
  var db1 = new ydn.db.crud.Storage(db_name, schema, option);
  asyncTestCase.waitForAsync('put in db1');
  var data = {id: 1, first: 'First', last: 'Last'};
  db1.put('test', data).addCallback(function() {
    var db2 = new ydn.db.crud.Storage(db_name, schema, option);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    db1.close();
    db2.values('test').addCallback(function(arr) {
      assertObjectEquals(data, arr[0]);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, db2.getType());
      db2.close();
    });
  });
  to_del.push(db_name);
}

function test_composite_index_idb() {
  composite_index_test('indexeddb');
}

function test_composite_index_websql() {
  composite_index_test('websql');
}

