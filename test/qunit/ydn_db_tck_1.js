
//ydn.debug.log('ydn.db', 100);

var options = {}; // options = {Mechanisms: ['websql']};
var db_name_put = "qunit_test_8";
var store_inline = "ts";    // in-line key store
var store_outline = "ts2"; // out-of-line key store
var store_inline_auto = "ts3"; // in-line key + auto
var store_outline_auto = "ts4"; // out-of-line key + auto
var store_nested_key = "ts5"; // nested keyPath
var store_inline_index = "ts6";    // in-line key store

var data_1 = { test:"test value", name:"name 1", id:1 };
var data_1a = { test:"test value", name:"name 1", id: ['a', 'b']};
var data_2 = { test:"test value", name:"name 2" };
var gdata_1 = { test:"test value", name:"name 3", id: {$t: 1} };

var schema_1 = {
  version: 1,
  Stores: [
    {
      name: store_inline,
      keyPath: 'id',
    type: 'NUMERIC'},
    {
      name: store_outline,
      type: 'NUMERIC'},
    {
      name: store_inline_auto,
      keyPath: 'id',
      autoIncrement: true,
      type: 'INTEGER'},
    {
      name: store_outline_auto,
      autoIncrement: true},
    {
      name: store_nested_key,
      keyPath: 'id.$t', // gdata style key.
      type: 'NUMERIC'},
    {
      name: store_inline_index,
      keyPath: 'id',
      type: 'NUMERIC',
      Indexes: [
        {name: 'value', type: 'TEXT'}
      ]
    }
  ]
};

var initionalizeDB = function(callback, opt_put_schema) {
  ydn.db.deleteDatabase(db_name_put);
  setTimeout(function() {
    opt_put_schema = opt_put_schema || schema_1;
    var db = new ydn.db.Storage(db_name_put, opt_put_schema);
    callback(db);
  }, 100);
};


module("Put", {
  tearDown: function() {
    ydn.db.deleteDatabase(db_name_put);
  }
});


asyncTest("Put data", function () {
  expect(1);

  var db = new ydn.db.Storage(db_name_put, schema_1);

  db.put(store_inline, data_1).then(function () {
    ok(true, "data inserted");
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});


asyncTest("Put data of array key", function () {
  expect(2);

  var db = new ydn.db.Storage(db_name_put, schema_1);

  db.put(store_inline, data_1a).then(function (x) {
    ok('length' in x, "array key");
    deepEqual(data_1a.id, x, 'same key');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});


asyncTest("Put data with off-line-key", function () {
  var db = new ydn.db.Storage(db_name_put, schema_1);
  expect(2);

  var key = Math.random();
  db.put(store_outline, data_2, key).then(function (x) {
    ok(true, "data inserted");
    equal(key, x, 'key');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("Put data - inline-key autoincrement", function () {
  var db = new ydn.db.Storage(db_name_put, schema_1);
  expect(2);

  db.put(store_inline_auto, data_1).then(function (x) {
    equal(data_1.id, x, 'key');
    db.put(store_inline_auto, data_2).then(function (x) {
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

asyncTest("Put data - offline-key autoincrement", function () {
  var db = new ydn.db.Storage(db_name_put, schema_1);
  expect(2);

  db.put(store_outline_auto, data_1).then(function (x) {
    ok(true, 'no key data insert ok');
    var key = x;
    // add same data.
    db.put(store_outline_auto, data_1).then(function (x) {
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


asyncTest("Put data with nested", function () {
  var db = new ydn.db.Storage(db_name_put, schema_1);
  expect(1);

  db.put(store_nested_key, gdata_1).then(function (x) {
    equal(gdata_1.id.$t, x, 'key');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});


var db_name_get = "qunit_test_get_1";


module("Get", {
  setUp: function() {
    //var db = new ydn.db.Storage(db_name_get);
  },
  tearDown: function() {
    ydn.db.deleteDatabase(db_name_put);
  }
});


asyncTest("Get 1 inline-line key object", function () {
  expect(1);

  var db = new ydn.db.Storage(db_name_put, schema_1);
  var value_1 = 'test ' + Math.random();
  db.put(store_inline, {id: 1, value: value_1});
  db.get(store_inline, 1).then(function (x) {
    equal(value_1, x.value, 'value');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});


asyncTest("Get array inline-line key object", function () {
  expect(3);

  var db = new ydn.db.Storage(db_name_put, schema_1);
  var value_1 = 'test ' + Math.random();
  var value_2 = 'test ' + Math.random();
  db.put(store_inline, {id: 1, value: value_1});
  db.put(store_inline, {id: 2, value: value_2});
  db.get(store_inline, [1, 2]).then(function (x) {
    equal(2, x.length, 'length');
    equal(value_1, x[0].value, 'value 1');
    equal(value_2, x[1].value, 'value 2');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("Get 1 outoff-line key object", function () {
  expect(2);

  var db = new ydn.db.Storage(db_name_put, schema_1);
  var value_1 = 'test ' + Math.random();
  var key_in = 'id' + Math.random();
  db.put(store_outline, {abc: value_1}, key_in).then(function(key) {
    equal(key_in, key, 'got same key');
    db.get(store_outline, key).then(function (x) {
      equal(value_1, x.abc, 'value');
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


asyncTest("Get array out-of-line key object", function () {
  expect(4);

  var db = new ydn.db.Storage(db_name_put, schema_1);
  var value_1 = 'get test ' + Math.random();
  var value_2 = 'get test ' + Math.random();
  db.put(store_outline, [{d: value_1}, {e: value_2}], ['a', 'b']).then(function(keys) {
    equal(2, keys.length, 'key length');
    db.get(store_outline, keys).then(function (x) {
      equal(2, x.length, 'value length');
      equal(value_1, x[0].d, 'value 1');
      equal(value_2, x[1].e, 'value 2');
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


var db_index = "qunit_idx_3";
// copy previous schema and add index schema
var schema_index = JSON.parse(JSON.stringify(schema_1));
var index_name = 'tag';
for (var i = 0; i < 4; i++) {
  // add index for the field 'tag'
  schema_index.Stores[i].Indexes = [
    {name: index_name,
    type: 'TEXT'}
  ];
}
schema_index.Stores[4].Indexes = [
  {name: 'tag.$t'}
];
var st_m_1 = 'multi_index_store';
schema_index.Stores[5] = {
  name: st_m_1,
  autoIncrement: true,
  Indexes: [
    {
      name: index_name,
      multiEntry: true
    }
  ]
};

