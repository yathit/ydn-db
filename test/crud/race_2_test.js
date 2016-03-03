
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
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.crud.req.WebSql.DEBUG = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.tr.Serial.DEBUG = true;
  //ydn.db.crud.req.IndexedDb.DEBUG = true;
  // ydn.db.con.IndexedDb.DEBUG = true;

};

var tearDown = function() {
  var name;
  while (name = to_del.pop()) {
    ydn.db.deleteDatabase(name, options.mechanisms[0]);
  }
};


function test_racy() {
  var db_name = 'test_racy_1';
  var schema = {
    stores: [{
      name: 'store1',
      keyPath: 'id'
    }]
  };
  var data = [{id: 1}];
  var db1 = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put in db1');
  db1.put('store1', data).addCallback(function() {
    var db2 = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    db1.close();
    db2.values('store1').addCallback(function(arr) {
      assertArrayEquals(data, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, db2.getType());
      db2.close();
    });
  });
  to_del.push(to_del);
}

