
var options = {}; // options = {mechanisms: ['websql']};
if (/log/.test(location.hash)) {
  if (/ui/.test(location.hash)) {
    if (ydn.debug && ydn.debug.log) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      ydn.debug.log('ydn.db', 'finer', div);
    } else {
      console.log('no logging facility');
    }
  } else {
    if (ydn.debug && ydn.debug.log) {
      ydn.debug.log('ydn.db', 'finer');
    } else {
      console.log('no logging facility');
    }
  }
}
if (/websql/.test(location.hash)) {
  options['mechanisms'] = ['websql'];
}


var db;

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

var data_1 = { test: "test value", name: "name 1", id: 1 };
var data_1a = { test: "test value", name: "name 1", id: ['a', 'b']};
var data_2 = { test: "test value", name: "name 2" };
var gdata_1 = { test: "test value", name: "name 3", id: {$t: 1} };

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
      type: 'TEXT'}
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

var reporter = new ydn.testing.Reporter('ydn-db');

(function () {

  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('Put test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);

    }
  };

  module("Put", test_env);
  reporter.createTestSuite('core', 'Put', ydn.db.version);

  asyncTest("single data", function () {
    expect(1);
    var db = new ydn.db.Storage('tck1_put_1', schema_1, options);
    db.put(store_inline, data_1).always(function () {
      ok(true, "data inserted");
      start();
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    });

  });


  asyncTest("inline-key autoincrement", function () {
    var db = new ydn.db.Storage('tck1_put_2', schema_auto_increase, options);
    expect(2);

    db.put(store_inline_auto, data_1).always(function (x) {
      equal(data_1.id, x, 'key');
      db.put(store_inline_auto, data_2).always(function (x) {
        ok(x > data_1.id, 'key 2 greater than data_1 key');
        start();
        var type = db.getType();
        db.close();
        ydn.db.deleteDatabase(db.getName(), type);
      });
    });

  });


  asyncTest("data with off-line-key", function () {
    var db = new ydn.db.Storage('tck1_put_3', schema_1, options);
    expect(2);

    var key = Math.random();
    db.put(store_outline, data_2, key).always(function (x) {
      ok(true, "data inserted");
      equal(key, x, 'key');
      start();
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    });

  });


  asyncTest("offline-key autoincrement", function () {
    var db = new ydn.db.Storage('tck1_put_4', schema_auto_increase, options);
    expect(2);

    db.put(store_outline_auto, data_1).always(function (x) {
      ok(true, 'no key data insert ok');
      var key = x;
      // add same data.
      db.put(store_outline_auto, data_1).always(function (x) {
        ok(x > key, 'key 2 greater than previous key');
        start();
        var type = db.getType();
        db.close();
        ydn.db.deleteDatabase(db.getName(), type);
      });
    });

  });


  asyncTest("nested key", function () {
    var db = new ydn.db.Storage('tck1_put_5', schema_1, options);
    expect(1);

    db.put(store_nested_key, gdata_1).always(function (x) {
      equal(gdata_1.id.$t, x, 'key');
      start();
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    });

  });


  asyncTest("single data - array index key", function () {
    expect(2);
    var db = new ydn.db.Storage('tck1_put_6', schema_1, options);
    db.put(store_inline, data_1a).always(function (x) {
      //console.log('got it');
      ok('length' in x, "array key");
      deepEqual(x, data_1a.id, 'same key');
      start();
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    });

  });
})();

(function () {

  var db;
  var db_name = 'tck1-get-1';
  var data_store_inline = {id: 1, value: 'value ' + Math.random()};
  var data_store_inline_string = {id: 'a', value: 'value ' + Math.random()};
  var value_store_outline = 'value ' + Math.random();
  var key_store_outline = Math.random();
  var value_store_outline_string = 'value ' + Math.random();
  var key_store_outline_string = 'id' + Math.random();
  var data_nested_key = { test: "test value", name: "name 3", id: {$t: 'id' + Math.random()} };

  var ready = $.Deferred();

  // persist store data.
  // we don't want to share this database connection and test database connection.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1);
    _db.put(store_inline, data_store_inline);
    _db.put(store_outline, {abc: value_store_outline}, key_store_outline);
    _db.put(store_outline_string, {abc: value_store_outline_string}, key_store_outline_string);
    _db.put(store_nested_key, data_nested_key);
    _db.put(store_inline_string, data_store_inline_string).always(function() {
      ready.resolve();
    });
    _db.close();
  })();

  var test_env = {
    setup: function () {
      db = new ydn.db.Storage(db_name, schema_1);
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('Get test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
      db.close();
      //ydn.db.deleteDatabase(db.getName());
    }
  };

  module("Get", test_env);
  reporter.createTestSuite('core', 'Get', ydn.db.version);

  asyncTest("inline-key number", function () {

    ready.always(function () {
      expect(1);

      db.get(store_inline, 1).then(function (x) {
        equal(data_store_inline.value, x.value, 'value');
        start();
      }, function (e) {
        ok(false, e.message);
        start();
      });
    });

  });

  asyncTest("inline-line string key", function () {
    expect(1);
    db.get(store_inline_string, 'a').then(function (x) {
      equal(data_store_inline_string.value, x.value, 'value');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });

  });

  asyncTest("out-off-line number key", function () {
    expect(1);
    db.get(store_outline, key_store_outline).then(function (x) {
      equal(value_store_outline, x && x.abc, 'value');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });

  });

  asyncTest("out-off-line string key", function () {
    expect(1);

    db.get(store_outline_string, key_store_outline_string).then(function (x) {
      equal(value_store_outline_string, x && x.abc, 'value');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });

  });


  asyncTest("nested key path", function () {
    expect(1);

    db.get(store_nested_key, data_nested_key.id.$t).then(function (x) {
      deepEqual(data_nested_key, x, 'same object ');
      start();
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    }, function (e) {
      ok(false, e.message);
      start();
    });

  });

})();

(function () {

  var db;
  var db_name = 'tck1-list-1';

  // schema without auto increment
  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id',
        type: 'NUMERIC'},
      {
        name: store_outline,
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

  var data_list_inline = [];
  var data_list_outline = [];
  var data_list_index = [];
  var keys_list_outline = [];
  for (var i = 0; i < 5; i++) {
    data_list_inline[i] = {id: i, type: 'inline', msg: 'test inline ' + Math.random()};
    data_list_index[i] = {id: i, type: 'index',
      value: (i%2) == 0 ? 'a' : 'b', msg: 'test inline ' + Math.random()};
    data_list_outline[i] = {type: 'offline', value: 'test out of line ' + Math.random()};
    keys_list_outline[i] = i;
  }

  var ready = $.Deferred();

  // persist store data.
  // we don't want to share this database connection and test database connection.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1, options);
    _db.clear();
    _db.put(store_inline, data_list_inline);
    _db.put(store_inline_index, data_list_index);
    _db.put(store_outline, data_list_outline, keys_list_outline);
    _db.count(store_outline).always(function() {
      ready.resolve();
    });
    _db.close();
  })();

  var test_env = {
    setup: function () {
      db = new ydn.db.Storage(db_name, schema_1, options);
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('List test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
      db.close();
      //ydn.db.deleteDatabase(db.getName());
    }
  };

  module("Values", test_env);
  reporter.createTestSuite('core', 'Values', ydn.db.version);

  asyncTest("Retrieve all objects from a store - inline key", function () {

    ready.always(function() {
      expect(7);
      db.values(store_inline).always(function (x) {
        deepEqual(x, data_list_inline, 'all');
      });

      var range = ydn.db.KeyRange.bound(1, 3);
      db.values(store_inline, range).always(function (x) {
        deepEqual(x, data_list_inline.slice(1, 4), 'range between 1 and 3');
      });

      db.values(store_inline, {lower: 3}).always(function (x) {
        deepEqual(x, data_list_inline.slice(3), 'range lower 3');
      });

      db.values(store_inline, {upper: 3}).always(function (x) {
        deepEqual(x, data_list_inline.slice(0, 4), 'range upper 3');
      });

      db.values(store_inline, null, 2).always(function (x) {
        deepEqual(x, data_list_inline.slice(0, 2), 'limit');
      });

      db.values(store_inline, null, 2, 2).always(function (x) {
        deepEqual(x, data_list_inline.slice(2, 4), 'limit offset');
      });

      db.values(store_inline, null, undefined, 2).always(function (x) {
        deepEqual(x, data_list_inline.slice(2), 'offset');
        start();
      });

    });

  });

  asyncTest("Retrieve objects by index key", function () {
    ready.always(function () {
      expect(3);

      db.values(store_inline_index, 'value', null, 10, 0).always(function (x) {
        deepEqual(x.length, data_list_index.length, 'number of record');
      });

      db.values(store_inline_index, 'value', ydn.db.KeyRange.only('b'), 10, 0).always(function (x) {
        deepEqual(x, [data_list_index[1], data_list_index[3]], 'only b');
      });

      db.values(store_inline_index, 'value', ydn.db.KeyRange.only('a'), 1, 1).always(function (x) {
        deepEqual(x, [data_list_index[2]], 'with limit and offset');
        start();
      });
    });
  });

  asyncTest("Retrieve objects by key list - inline-key", function () {
    ready.always(function () {
      expect(3);

      db.values(store_inline, [1, 2]).always(function (x) {
        deepEqual(x, data_list_inline.slice(1, 3), '1 and 2');
      });

      db.values(store_inline, []).always(function (x) {
        deepEqual(x, [], 'empty array');
      });

      db.values(store_inline, [1, 100]).always(function (x) {
        deepEqual(x, [data_list_inline[1], undefined], 'invalid key');
        start();
      });
    });
  });

  asyncTest("Retrieve objects from a store - out-of-line key", function () {
    ready.always(function () {
      expect(4);

      db.values(store_outline).then(function (x) {
        deepEqual(x, data_list_outline, 'all records');
      }, function (e) {
        ok(false, e.message);
      });

      db.values(store_outline, null, 2).always(function (x) {
        deepEqual(x, data_list_outline.slice(0, 2), 'limit');
      });

      db.values(store_outline, null, 2, 1).always(function (x) {
        deepEqual(x, data_list_outline.slice(1, 3), 'limit offset');
      });

      db.values(store_outline, null, undefined, 2).always(function (x) {
        deepEqual(x, data_list_outline.slice(2), 'offset');
        start();
      });
    });
  });

  asyncTest("Retrieve objects by keys from multiple stores", function () {
    ready.always(function () {
      expect(3);

      var keys = [
        new ydn.db.Key(store_inline, 2),
        new ydn.db.Key(store_inline, 3),
        new ydn.db.Key(store_outline, 2)];
      db.values(keys).always(function (x) {
        // console.log(x);
        equal(x.length, 3, 'number of result');
        deepEqual(data_list_inline.slice(2, 4), x.slice(0, 2), 'inline');
        deepEqual(data_list_outline[2], x[2], 'offline');
        start();
        var type = db.getType();
        db.close();
        ydn.db.deleteDatabase(db.getName(), type);
      });
    });
  });

})();

(function () {

  var db;
  var db_name = 'tck1-keys-1';

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
        name: store_inline_index,
        keyPath: 'id',
        type: 'NUMERIC',
        indexes: [
          {name: 'value', type: 'TEXT'}
        ]
      }
    ]
  };

  var data_list_index = [{id: 1, value: 'a'}, {id: 2, value: 'b'}, {id: 3, value: 'a'}];
  var keys_inline = [1, 2, 10, 20, 100];
  var keys_inline_string = ['ab1', 'ab2', 'ac1', 'ac2', 'b'];
  var inline_data = keys_inline.map(function (x) {
    return {id: x, value: Math.random()};
  });
  var inline_string_data = keys_inline_string.map(function (x) {
    return {id: x, value: Math.random()};
  });

  var ready = $.Deferred();

  // persist store data.
  // we don't want to share this database connection and test database connection.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1);
    _db.clear();

    _db.put(store_inline_string, inline_string_data).fail(function (e) {
      throw e;
    });
    //console.log(inline_data);
    _db.put(store_inline, inline_data);
    _db.put(store_inline_index, data_list_index).always(function() {
      _db.count().always(function() {
        ready.resolve();
      });
    });

    _db.close();
  })();

  var test_env = {
    setup: function () {
      db = new ydn.db.Storage(db_name, schema_1);
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('Keys test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
      db.close();
      //ydn.db.deleteDatabase(db.getName());
    }
  };

  module("Keys", test_env);
  reporter.createTestSuite('core', 'Keys', ydn.db.version);

  asyncTest("from a store", function () {

    ready.always(function() {
      expect(3);

      db.keys(store_inline).always(function (keys) {
        deepEqual(keys_inline, keys, 'all keys');
      });

      db.keys(store_inline, null, 2).always(function (keys) {
        deepEqual(keys_inline.slice(0, 2), keys, 'limit');
      });

      db.keys(store_inline, null, 2, 2).always(function (keys) {
        deepEqual(keys_inline.slice(2, 4), keys, 'limit offset');
        start();

      });
    });

  });

  asyncTest("Retrieve primary key by index key", function () {
    ready.always(function () {
      expect(2);

      db.keys(store_inline_index, 'value', null, 10, 0).always(function (x) {
        // answer will be ['a', 'a', 'b']
        deepEqual(x, [1, 3, 2], 'number of record');
      });

      db.keys(store_inline_index, 'value', ydn.db.KeyRange.only('a'), 10, 0).always(function (x) {
        deepEqual(x, [1, 3], 'only a');
        start();
        var type = db.getType();
        db.close();
        ydn.db.deleteDatabase(db.getName(), type);
      });

    });
  });

})();

(function () {


  var db;
  var db_name ='ydn_db_tck1_count_2';

  var ready = $.Deferred();

  // persist store data.
  // we don't want to share this database connection and test database connection.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1);
    _db.clear();
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
    _db.put(store_outline, data2, keys).fail(function (e) {
      throw e;
    });
    _db.put(store_inline, data);
    _db.count(store_inline).always(function() {
      ready.resolve();
    });
    _db.close();
  })();

  var test_env = {
    setup: function () {
      db = new ydn.db.Storage(db_name, schema_1);
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('Count test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
      db.close();
      //ydn.db.deleteDatabase(db.getName());
    }
  };

  module("Count", test_env);
  reporter.createTestSuite('core', 'Count', ydn.db.version);

  asyncTest("all records in a store", function () {

    ready.always(function() {

      expect(1);
      db.count(store_inline).then(function (x) {
        equal(x, 5, 'number of records in store');
        start();
      }, function (e) {
        ok(false, e.message);
        start();
      });
    })

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

  asyncTest("in a key range", function () {
    expect(1);

    var range = new ydn.db.KeyRange(2, 4);
    db.count(store_inline, range).then(function (x) {
      equal(3, x, 'number of records in a range');
      start();
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    }, function (e) {
      ok(false, e.message);
      start();
    });

  });

})();

QUnit.testDone(function(result) {
  reporter.addResult('core', result.module,
    result.name, result.failed, result.passed, result.duration);
});

QUnit.moduleDone(function(result) {
  reporter.endTestSuite('core', result.name,
    {passed: result.passed, failed: result.failed});
});

QUnit.done(function(results) {
  reporter.report();
});





