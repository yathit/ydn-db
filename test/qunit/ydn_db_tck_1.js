
if (/log/.test(location.hash)) {
  if (/ui/.test(location.hash)) {
    var div = document.createElement('div');
    document.body.appendChild(div);
    ydn.debug.log('ydn.db', 100, div);
  } else {
    ydn.debug.log('ydn.db', 100);
  }
}




var db;
var options = {}; // options = {Mechanisms: ['websql']};
var db_name_tck1 = "tck_test_1_1";
var dbname_auto_increase = 'tck1_auto_increment';
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

// schema without auto increment
var schema_1 = {
  stores: [
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
      name: store_nested_key,
      keyPath: 'id.$t', // gdata style key.
      type: 'NUMERIC'}
  ]
};


var schema_auto_increase = {
  stores: [
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
      indexes: [
        {name: 'value', type: 'TEXT'}
      ]
    }

  ]
};



module("Put", {
  setup: function() {
    db = new ydn.db.Storage('tck1_put', schema_1);

  },
  teardown: function() {
    db.close();
    //ydn.db.deleteDatabase(db.getName());
  }
});


asyncTest("single data", function () {
  expect(1);

  db.put(store_inline, data_1).then(function () {
    ok(true, "data inserted");
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});


asyncTest("inline-key autoincrement", function () {
  var db = new ydn.db.Storage(dbname_auto_increase, schema_auto_increase);
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

  // some browser does not support autoIncrement.
  setTimeout(function() {
    start();
  }, 1000);

});


asyncTest("offline-key autoincrement", function () {
  var db = new ydn.db.Storage(dbname_auto_increase, schema_auto_increase);
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

  setTimeout(function() {
    start();
  }, 1000);
});

asyncTest("data with off-line-key", function () {

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


asyncTest("nested key", function () {

  expect(1);

  db.put(store_nested_key, gdata_1).then(function (x) {
    equal(gdata_1.id.$t, x, 'key');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});



asyncTest("single data - array index key", function () {
  expect(2);

  db.put(store_inline, data_1a).then(function (x) {
    //console.log('got it');
    ok('length' in x, "array key");
    deepEqual(data_1a.id, x, 'same key');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});



module("Get", {
  setup: function() {
    db = new ydn.db.Storage('tck1-get-2', schema_1);
  },
  teardown: function() {
    db.close();
    //ydn.db.deleteDatabase(db_name_tck1);
  }
});


asyncTest("inline-line number key", function () {
  expect(1);

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

var data_list_inline = [];
var data_list_outline = [];
var keys_list_outline = [];

module("List", {
  setup: function() {
    db = new ydn.db.Storage('tck1-list', schema_1);
    db.clear();

    for (var i = 0; i < 5; i++) {
      data_list_inline[i] = {id: i, type: 'inline', value: 'test inline ' + Math.random()};
      data_list_outline[i] = {type: 'offline', value: 'test out of line ' + Math.random()};
      keys_list_outline[i] = i;
    }
    db.put(store_inline, data_list_inline);
    db.put(store_outline, data_list_outline, keys_list_outline);

  },
  teardown: function() {
    db.close();
    //ydn.db.deleteDatabase(db_name_tck1);
  }
});


asyncTest("Retrieve all objects from a store - inline key", function () {
  expect(1);

  db.list(store_inline).then(function (x) {
    deepEqual(data_list_inline, x, 'from 1 to 2');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});


asyncTest("Retrieve objects by key list - inline-key", function () {
  expect(1);

  db.list(store_inline, [1, 2]).then(function (x) {
    deepEqual(data_list_inline.slice(1, 3), x, '1 and 2');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("Retrieve objects by key range - inline-key", function () {
  expect(1);

  var range = new ydn.db.KeyRange(2, 5);
  db.list(store_inline, range).then(function (x) {
    deepEqual(data_list_inline.slice(2, 6), x, '2 to 5');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

  setTimeout(function() {
    start();
  }, 1000);

});

asyncTest("Retrieve objects by key range reverse - inline-key", function () {
  expect(1);

  var range = new ydn.db.KeyRange(2, 5);
  db.list(store_inline, range, true).then(function (x) {
    deepEqual(data_list_inline.slice(2, 6).reverse(), x, '2 to 5');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});


asyncTest("Retrieve objects by key range limit - inline-key", function () {
  expect(1);

  var range = new ydn.db.KeyRange(2, 5);
  db.list(store_inline, range, false, 2).then(function (x) {
    deepEqual(data_list_inline.slice(2, 4), x, '2 to 5 limit to 2');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("Retrieve objects by key range limit offset - inline-key", function () {
  expect(1);

  var range = new ydn.db.KeyRange(2, 5);
  db.list(store_inline, range, false, 2, 1).then(function (x) {
    deepEqual(data_list_inline.slice(3, 5), x, '2 to 5 limit to 2 offset 1');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

  setTimeout(function() {
    start();
  }, 1000);

});



asyncTest("Retrieve all objects from a store - offline key", function () {
  expect(1);

  db.list(store_outline).then(function (x) {
    deepEqual(data_list_outline, x, 'all records');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("Retrieve objects by keys from multiple stores", function () {
  expect(3);

  var keys = [
    new ydn.db.Key(store_inline, 2),
    new ydn.db.Key(store_inline, 3),
    new ydn.db.Key(store_outline, 2)];
  db.list(keys).then(function (x) {
    equal(3, x.length, 'length');
    deepEqual(data_list_inline.slice(2, 4), x.slice(0, 2), 'inline');
    deepEqual(data_list_outline[2], x[2], 'offline');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

var keys_inline = [1, 2, 10, 20, 100];
var keys_inline_string = ['ab1', 'ab2', 'ac1', 'ac2', 'b'];

module("Keys", {
  setup: function() {
    db = new ydn.db.Storage('tck1-keys', schema_1);
    var inline_data = keys_inline.map(function(x) {return {id: x}});
    var inline_string_data = keys_inline_string.map(function(x) {return {id: x}});
    db.put(store_inline_string, inline_string_data).fail(function(e) {
      throw e;
    });
    //console.log(inline_data);
    db.put(store_inline, inline_data).then(function(keys) {
      console.log('tck1-keys db ready.');
    }, function(e) {
      throw e;
    });

  },
  teardown: function() {
    db.close();
    //ydn.db.deleteDatabase(db_name_tck1);
  }
});

asyncTest("get integer keys from a store", function () {
  expect(1);

  db.keys(store_inline).then(function (keys) {
    deepEqual(keys_inline, keys, 'key length');
    start();
  }, function (e) {
    throw e;
  });
});


asyncTest("get keys from a store - reverse", function () {
  expect(1);

  db.keys(store_inline, true).then(function (keys) {
    keys.reverse();
    deepEqual(keys_inline, keys, 'keys');
    start();
  }, function (e) {
    throw e;
  });
});

asyncTest("get keys limit", function () {
  expect(2);

  db.keys(store_inline, false, 2).then(function (keys) {
    equal(2, keys.length, 'key length');
    deepEqual(keys_inline.slice(0,2), keys, 'keys');
    start();
  }, function (e) {
    throw e;
  });

  setTimeout(function() {
    start();
  }, 1000);


});


asyncTest("get keys limit offset", function () {
  expect(1);

  db.keys(store_inline, false, 2, 1).then(function (keys) {
    deepEqual(keys_inline.slice(1,3), keys, 'keys');
    start();
  }, function (e) {
    throw e;
  });

  setTimeout(function() {
    start();
  }, 1000);
});


var db_count = 'ydn_db_tck1_count_2';

module("Count", {
  setup: function() {
    db = new ydn.db.Storage(db_count, schema_1);
    db.clear();
    var data = [];
    var data2 = [];
    for (var i = 0; i < 5; i++) {
      data[i] = {id: i, value: 'test' + Math.random()};
    }
    var keys = [];
    for (var i = 0; i < 3; i++) {
      keys[i] = i;
      data2[i] = {type: 'offline', value: 'test' + Math.random()};
    }
    db.put(store_outline, data2, keys).fail(function(e) {
      throw e;
    });
    db.put(store_inline, data).then(function(keys) {
      console.log('count db ready.')
    }, function(e) {
      throw e;
    });

  },
  teardown: function() {
    db.close();
    //ydn.db.deleteDatabase(db_name_tck1);
  }
});


asyncTest("all records in a store", function () {
  expect(1);

  db.count(store_inline).then(function (x) {
    equal(5, x, 'number of records in store');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("all records in stores", function () {
  expect(2);

  db.count([store_inline, store_outline]).then(function (x) {
    equal(5, x[0], 'inline');
    equal(3, x[1], 'outline');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});

asyncTest("in a range", function () {
  expect(1);

  var range = new ydn.db.KeyRange(2, 4);
  db.count(store_inline, range).then(function (x) {
    equal(3, x, 'number of records in a range');
    start();
  }, function (e) {
    ok(false, e.message);
    start();
  });

});







