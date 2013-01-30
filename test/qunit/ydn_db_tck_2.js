if (/log/.test(location.hash)) {
  if (/ui/.test(location.hash)) {
    var div = document.createElement('div');
    document.body.appendChild(div);
    ydn.debug.log('ydn.db', 100, div);
  } else {
    ydn.debug.log('ydn.db', 100);
  }
}

var db_name = "qunit_test_8";
var db_name_put = "qunit_test_8_rw";
var store_inline = "ts";    // in-line key store
var store_outline = "ts2"; // out-of-line key store
var store_inline_auto = "ts3"; // in-line key + auto
var store_outline_auto = "ts4"; // out-of-line key + auto
var store_nested_key = "ts5"; // nested keyPath
var store_inline_index = "ts6";    // in-line key store


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
      type: 'TEXT'},
    {
      name: store_inline_index,
      keyPath: 'id',
      type: 'NUMERIC',
      indexes: [
        {name: 'name', type: 'TEXT'},
        {name: 'value', type: 'NUMERIC'}
      ]
    }

  ]
};


//db_r.put(store_outline, [
//  {value: 'v' + Math.random()},
//  {value: 'v' + Math.random()},
//  {value: 'v' + Math.random()},
//  {value: 'v' + Math.random()}
//], [1, 2, 3, 4]);
//db_r.put(store_inline_auto, [
//  {id: 1, value: 'v' + Math.random()},
//  {value: 'v' + Math.random()},
//  {id: 5, value: 'v' + Math.random()},
//  {value: 'v' + Math.random()}
//]);
//db_r.put(store_outline_auto, [
//  {value: 'v' + Math.random()},
//  {value: 'v' + Math.random()},
//  {value: 'v' + Math.random()},
//  {value: 'v' + Math.random()}
//], [1, null, 3, undefined]);
//db_r.put(store_nested_key, [
//  {id: {$t: 'a'}, value: 'v' + Math.random()},
//  {id: {$t: 'b'}, value: 'v' + Math.random()},
//  {id: {$t: 'c'}, value: 'v' + Math.random()},
//  {id: {$t: 'd'}, value: 'v' + Math.random()}
//]);


(function () {

  var db_r = new ydn.db.Storage(db_name, schema_1);

  module("Count", {
    setup: function () {

    },
    teardown: function () {

    }
  });


  asyncTest("by iterator", function () {
    expect(2);

    var iter = ydn.db.KeyIterator.where(store_inline, '>', 1, '<=', 3);

    db_r.clear(store_inline);
    db_r.put(store_inline, [
        {id: 1, value: 'v' + Math.random()},
        {id: 2, value: 'v' + Math.random()},
        {id: 3, value: 'v' + Math.random()},
        {id: 4, value: 'v' + Math.random()}
      ]).then(function (keys) {
        equal(keys.length, 4, 'in store');
        db_r.count(iter).then(function (x) {
          equal(x, 2, 'number of records in the range');
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

  asyncTest("by index iterator", function () {
    expect(3);
    var name_iter = ydn.db.KeyIndexIterator.where(store_inline_index, 'name', 'LIKE%', 'b');
    var value_iter = ydn.db.KeyIndexIterator.where(store_inline_index, 'value', '>', 1, '<=', 3);
    db_r.clear(store_inline_index);
    db_r.put(store_inline_index, [
        {id: 1, value: 2, name: 'a' + Math.random()},
        {id: 2, value: 4, name: 'b' + Math.random()},
        {id: 3, value: 6, name: 'b' + Math.random()},
        {id: 4, value: 8, name: 'c' + Math.random()}
      ]).then(function (keys) {
        equal(keys.length, 4, 'in store');
        db_r.count(value_iter).then(function (x) {
          equal(x, 1, 'number of value in the range');

          db_r.count(name_iter).then(function (x) {
            equal(x, 2, 'number of name in the range');
            start();
          }, function (e) {
            ok(false, e.message);
            start();
          });

        }, function (e) {
          ok(false, e.message);
          start();
        });
      }, function (e) {
        ok(false, e.message);
        start();
      });

  });

})();


(function () {

  var db_r = new ydn.db.Storage(db_name, schema_1);

  var objs = [
    {id: 1, value: 2, name: 'a' + Math.random()},
    {id: 2, value: 4, name: 'b' + Math.random()},
    {id: 3, value: 6, name: 'b' + Math.random()},
    {id: 4, value: 8, name: 'c' + Math.random()}
  ];


  module("Get", {
    setup: function () {
      db_r.clear(store_inline_index);
      db_r.put(store_inline_index, objs);
    },
    teardown: function () {

    }
  });

  asyncTest("effective key by an iterator", function () {
    expect(1);
    var iter = ydn.db.KeyIterator.where(store_inline_index, '>', 1, '<=', 3);
    db_r.get(iter).then(function (x) {
      equal(x, objs[1].id, 'get item 2 key');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  });

  asyncTest("ref value by an iterator", function () {
    expect(1);
    var iter = ydn.db.ValueIterator.where(store_inline_index, '>', 1, '<=', 3);
    db_r.get(iter).then(function (x) {
      deepEqual(x, objs[1], 'get item 2 value');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  });


  asyncTest("effective key by an index iterator", function () {
    expect(1);
    var iter = ydn.db.KeyIndexIterator.where(store_inline_index, 'name', 'LIKE%', 'c');
    db_r.get(iter).then(function (x) {
      equal(x, objs[3].name, 'get item 3 key');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  });

  asyncTest("ref value by an iterator", function () {
    expect(1);
    var iter = ydn.db.ValueIndexIterator.where(store_inline_index, 'name', 'LIKE%', 'c');
    db_r.get(iter).then(function (x) {
      deepEqual(x, objs[3], 'get item 3 value');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  });

})();

//
//
//var db_key_range = "qunit_keyrange_2";
//module("Cursor", {
//  setup: function () {
//    //var db = new ydn.db.Storage(db_key_range);
//  },
//  teardown: function () {
//    //ydn.db.deleteDatabase(db_key_range);
//  }
//});
//
//var objs = [
//  {value: 'a0', id: 0, type: 'a'},
//  {value: 'a1', id: 1, type: 'a'},
//  {value: 'b2', id: 2, type: 'b'},
//  {value: 'c1', id: 3, type: 'b'},
//  {value: 'c2', id: 4, type: 'c'},
//  {value: 'c3', id: 5, type: 'c'},
//  {value: 'c4', id: 6, type: 'c'}
//];
////var options = {Mechanisms: ['websql']};
//
//
//asyncTest("Key range", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(2);
//  db.put(store_inline_index, objs).then(function (value) {
//    var key_range = ydn.db.KeyRange.bound(1, 3);
//    var q = new ydn.db.ValueIterator(store_inline_index, key_range);
//    db.list(q).then(function (x) {
//      //console.log(q)
//      equal(x.length, 3, '3 results');
//      equal('a1', 'a1', 'correct result');
//      start();
//    }, function (e) {
//      ok(false, e.message);
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});
//
//asyncTest("Key range lowerBound open", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(2);
//  db.put(store_inline_index, objs).done(function (value) {
//    var key_range = ydn.db.KeyRange.bound(1, 3, true);
//    var q = new ydn.db.ValueIterator(store_inline_index, key_range);
//    db.list(q).then(function (x) {
//      equal(2, x.length, '2 results');
//      equal('b2', x[0].value, 'correct result');
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});
//
//asyncTest("Key range upperBound open", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(3);
//  db.put(store_inline_index, objs).done(function (value) {
//    var key_range = ydn.db.KeyRange.bound(1, 3, false, true);
//    var q = new ydn.db.ValueIterator(store_inline_index, undefined, undefined, key_range);
//    db.list(q).then(function (x) {
//      equal(2, x.length, '2 results');
//      equal('a1', x[0].value, 'correct result');
//      equal('b2', x[1].value, 'correct result');
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});
//
//asyncTest("Key range both side open", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(2);
//  db.put(store_inline_index, objs).done(function (value) {
//    var key_range = ydn.db.KeyRange.bound(1, 3, true, true);
//    var q = new ydn.db.ValueIterator(store_inline_index, key_range);
//    db.list(q).then(function (x) {
//      equal(1, x.length, '1 results');
//      equal('b2', x[0].value, 'correct result');
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});
//
//asyncTest("Key range - index string", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(2);
//  db.put(store_inline_index, objs).done(function (value) {
//    var key_range = ydn.db.KeyRange.bound('c1', 'c3');
//    var q = new ydn.db.ValueIterator(store_inline_index, undefined, 'value', key_range);
//    db.list(q).then(function (x) {
//      equal(3, x.length, '2 results');
//      equal('c1', x[0].value, 'correct result');
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});
//
//asyncTest("Key range - index string - lowerBound open", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(2);
//  db.put(store_inline_index, objs).done(function (value) {
//    var key_range = ydn.db.KeyRange.bound('c1', 'c3', true);
//    var q = new ydn.db.ValueIterator(store_inline_index, undefined, 'value', key_range);
//    db.list(q).then(function (x) {
//      equal(2, x.length, '2 results');
//      equal('c2', x[0].value, 'correct result');
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});
//
//asyncTest("Key range - index string - upperBound open", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(2);
//  db.put(store_inline_index, objs).done(function (value) {
//    var key_range = ydn.db.KeyRange.bound('c1', 'c3', false, true);
//    var q = new ydn.db.ValueIterator(store_inline_index, undefined, 'value', key_range);
//    db.list(q).then(function (x) {
//      equal(2, x.length, '2 results');
//      equal('c1', x[0].value, 'correct result');
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});
//
//
//asyncTest("Key range - index string - both sides open", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(2);
//  db.put(store_inline_index, objs).done(function (value) {
//    var key_range = ydn.db.KeyRange.bound('c1', 'c3', true, true);
//    var q = new ydn.db.ValueIterator(store_inline_index, undefined, 'value', key_range);
//    db.list(q).then(function (x) {
//      equal(1, x.length, '1 results');
//      equal('c2', x[0].value, 'correct result');
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});
//
//
//asyncTest("Key range - index string - starts with", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(2);
//  db.put(store_inline_index, objs).done(function (value) {
//    var key_range = ydn.db.KeyRange.starts('c');
//    var q = new ydn.db.ValueIterator(store_inline_index, undefined, 'value', key_range);
//    db.list(q).then(function (x) {
//      equal(4, x.length, '2 results');
//      equal('c1', x[0].value, 'correct result');
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});
//
//asyncTest("Key range - index string - starts with of no result", function () {
//  var db = new ydn.db.Storage(db_key_range, schema_1);
//  expect(1);
//  db.put(store_inline_index, objs).done(function (value) {
//    var key_range = ydn.db.KeyRange.starts('d');
//    var q = new ydn.db.ValueIterator(store_inline_index, undefined, 'value', key_range);
//    db.list(q).then(function (x) {
//      equal(0, x.length, '2 results');
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  })
//});

