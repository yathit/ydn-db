
ydn.debug.log('ydn.db', 100);

var options = {}; // options = {Mechanisms: ['websql']};
var db_name_tck1 = "qunit_test_10";
var store_inline = "ts";    // in-line key store
var store_inline_string = "tss";    // in-line key store
var store_outline = "ts2"; // out-of-line key store
var store_outline_string = "ts2s"; // out-of-line key store
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
      name: store_inline_string,
      keyPath: 'id',
      type: 'TEXT'},
    {
      name: store_outline,
      type: 'NUMERIC'},
    {
      name: store_outline_string,
      type: 'TEXT'},
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
      type: 'NUMERIC'}

  ]
};

var initionalizeDB = function(callback, opt_put_schema) {
  ydn.db.deleteDatabase(db_name_tck1);
  setTimeout(function() {
    opt_put_schema = opt_put_schema || schema_1;
    var db = new ydn.db.Storage(db_name_tck1, opt_put_schema);
    callback(db);
  }, 100);
};


module("Put", {
  tearDown: function() {
    ydn.db.deleteDatabase(db_name_tck1);
  }
});


asyncTest("data", function () {
  expect(1);

  var db = new ydn.db.Storage(db_name_tck1, schema_1);

  db.put(store_inline, data_1).then(function () {
    ok(true, "data inserted");
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});


asyncTest("array data", function () {
  expect(2);

  var db = new ydn.db.Storage(db_name_tck1, schema_1);

  db.put(store_inline, data_1a).then(function (x) {
    ok('length' in x, "array key");
    deepEqual(data_1a.id, x, 'same key');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});


asyncTest("data with off-line-key", function () {
  var db = new ydn.db.Storage(db_name_tck1, schema_1);
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

asyncTest("inline-key autoincrement", function () {
  var db = new ydn.db.Storage(db_name_tck1, schema_1);
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

asyncTest("offline-key autoincrement", function () {
  var db = new ydn.db.Storage(db_name_tck1, schema_1);
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


asyncTest("nested key", function () {
  var db = new ydn.db.Storage(db_name_tck1, schema_1);
  expect(1);

  db.put(store_nested_key, gdata_1).then(function (x) {
    equal(gdata_1.id.$t, x, 'key');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});



module("Get", {
  setUp: function() {
    //var db = new ydn.db.Storage(db_name_get);
  },
  tearDown: function() {
    ydn.db.deleteDatabase(db_name_tck1);
  }
});


asyncTest("inline-line number key", function () {
  expect(1);

  var db = new ydn.db.Storage(db_name_tck1, schema_1);
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

asyncTest("inline-line string key", function () {
  expect(1);

  var db = new ydn.db.Storage(db_name_tck1, schema_1);
  var value_1 = Math.random();
  db.put(store_inline_string, {id: 'a', value: value_1});
  db.get(store_inline_string, 'a').then(function (x) {
    equal(value_1, x.value, 'value');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("outoff-line number key", function () {
  expect(2);

  var db = new ydn.db.Storage(db_name_tck1, schema_1);
  var value_1 = 'test ' + Math.random();
  var key_in = Math.random();
  db.put(store_outline, {abc: value_1}, key_in).then(function(key) {
    equal(key_in, key, 'got same key');
    db.get(store_outline, key_in).then(function (x) {
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

asyncTest("outoff-line string key", function () {
  expect(2);

  var db = new ydn.db.Storage(db_name_tck1, schema_1);
  var value_1 = 'test ' + Math.random();
  var key_in = 'id' + Math.random();
  db.put(store_outline_string, {abc: value_1}, key_in).then(function(key) {
    equal(key_in, key, 'got same key');
    db.get(store_outline_string, key_in).then(function (x) {
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




asyncTest("nested key", function () {
  var db = new ydn.db.Storage(db_name_tck1, schema_1);
  expect(1);

  db.put(store_nested_key, gdata_1);
  db.get(store_nested_key, gdata_1.id.$t).then(function (x) {
    deepEqual(gdata_1, x, 'same object ' + JSON.stringify(x));
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

module("List", {
  setUp: function() {
    //var db = new ydn.db.Storage(db_name_get);
  },
  tearDown: function() {
    ydn.db.deleteDatabase(db_name_tck1);
  }
});


asyncTest("inline-line key objects", function () {
  expect(3);

  var db = new ydn.db.Storage(db_name_tck1, schema_1);
  var value_1 = 'test ' + Math.random();
  var value_2 = 'test ' + Math.random();
  db.put(store_inline, {id: 1, value: value_1});
  db.put(store_inline, {id: 2, value: value_2});
  db.list(store_inline, [1, 2]).then(function (x) {
    equal(2, x.length, 'length');
    equal(value_1, x[0].value, 'value 1');
    equal(value_2, x[1].value, 'value 2');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});




asyncTest("out-of-line key objects", function () {
  expect(4);

  var db = new ydn.db.Storage(db_name_tck1, schema_1);
  var value_1 = 'get test ' + Math.random();
  var value_2 = 'get test ' + Math.random();
  db.put(store_outline, [{d: value_1}, {e: value_2}], ['a', 'b']).then(function(keys) {
    equal(2, keys.length, 'key length');
    db.list(store_outline, keys).then(function (x) {
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


module("Count", {
  setUp: function() {
    //var db = new ydn.db.Storage(db_name_get);
  },
  tearDown: function() {
    ydn.db.deleteDatabase(db_name_tck1);
  }
});

var db_count = 'ydn_db_tck1_count_1';

asyncTest("store", function () {
  expect(2);

  var db = new ydn.db.Storage(db_count, schema_1);
  db.clear(store_outline);
  var value_1 = 'get test ' + Math.random();
  var value_2 = 'get test ' + Math.random();
  db.put(store_outline, [{d: value_1}, {e: value_2}, {e: value_2}], ['a1', 'a2', 'b']).then(function(keys) {
    equal(3, keys.length, 'key length');
    db.count(store_outline).then(function (x) {
      equal(3, x, 'number of records');
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


asyncTest("database", function () {
  expect(2);

  var db = new ydn.db.Storage(db_count, schema_1);
  db.clear();
  var value_1 = 'get test ' + Math.random();
  var value_2 = 'get test ' + Math.random();
  db.put(store_inline, [{id: 1, d: value_1}, {id: 2, e: value_2}, {id: 3, e: value_2}]);
  db.put(store_outline,
    [{d: value_1}, {e: value_2}, {e: value_2}],
    ['a1', 'a2', 'b']).then(function(keys) {
    equal(3, keys.length, 'key length');
    db.count().then(function (x) {
      equal(6, x, 'number of records');
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





