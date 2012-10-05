var db_name = "qunit_test_5";
var store_name = "ts";    // in-line key store
var store_name_2 = "ts2"; // out-of-line key store
var store_name_3 = "ts3"; // in-line key + auto
var store_name_4 = "ts4"; // out-of-line key + auto
var index_name = "ix1";
var data_1 = { test:"test value", name:"name 1", id:1 };
var data_2 = { test:"test value", name:"name 2" };
var msg_fail = "Creating initial situation failed";

var schema = {
  version: 1,
  Stores: [
    {
      name: store_name,
      keyPath: 'id',
    type: 'NUMERIC'},
    {
      name: store_name_2,
      type: 'NUMERIC'},
    {
      name: store_name_3,
      keyPath: 'id',
      autoIncrement: true,
      type: 'NUMERIC'},
    {
      name: store_name_4,
      autoIncrement: true,
      type: 'NUMERIC'}
  ]
};

var initionalizeDB = function(callback, opt_schema) {
  ydn.db.deleteDatabase(db_name);
  setTimeout(function() {
    opt_schema = opt_schema || schema;
    var db = new ydn.db.Storage(db_name, opt_schema);
    callback(db);
  }, 100);
};

ydn.db.log('ydn.db', 300);


module("Put", {
  tearDown: function() {
    ydn.db.deleteDatabase(db_name);
  }
});



asyncTest("Inserting data", function () {
  expect(1);

  var db = new ydn.db.Storage(db_name + '1', schema);

  db.put(store_name, data_1).then(function () {
    ok(true, "data inserted");
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("Inserting data with off-line-key", function () {
  var db = new ydn.db.Storage(db_name + '2', schema);
  expect(2);

  var key = Math.random();
  db.put(store_name_2, data_2, key).then(function (x) {
    ok(true, "data inserted");
    equal(key, x, 'key');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("Inserting data - inline-key autoincrement", function () {
  var db = new ydn.db.Storage(db_name + '3', schema);
  expect(2);


  db.put(store_name_3, data_1).then(function (x) {
    equal(data_1.id, x, 'key');
    db.put(store_name_3, data_2).then(function (x) {
      ok(x > data_1.id, 'key 2 greater than data_1 key');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("Inserting data - offline-key autoincrement", function () {
  var db = new ydn.db.Storage(db_name + '4', schema);
  expect(2);


  db.put(store_name_4, data_1).then(function (x) {
    ok(true, 'no key data insert ok');
    var key = x;
    // add same data.
    db.put(store_name_4, data_1).then(function (x) {
      ok(x > key, 'key 2 greater than previous key');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  }, function (e) {
    ok(false, e.message);
    start();
  });

});
