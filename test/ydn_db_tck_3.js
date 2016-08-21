
//ydn.db.log('ydn.db', 100);

var db_name_put = "qunit_test_7";
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

var initionalizeDB = function(callback, opt_put_schema) {
  ydn.db.deleteDatabase(db_name_put);
  setTimeout(function() {
    opt_put_schema = opt_put_schema || schema_1;
    var db = new ydn.db.Storage(db_name_put, opt_put_schema);
    callback(db);
  }, 100);
};




var db_index = "qunit_idx_3";
// copy previous schema and add index schema
var schema_index = JSON.parse(JSON.stringify(schema_1));
var index_name = 'tag';
for (var i = 0; i < 4; i++) {
  // add index for the field 'tag'
  schema_index.store[i].indexes = [
    {name: index_name,
    type: 'TEXT'}
  ];
}
schema_index.store[4].indexes = [
  {name: 'tag.$t'}
];
var st_m_1 = 'multi_index_store';
schema_index.store[5] = {
  name: st_m_1,
  autoIncrement: true,
  indexes: [
    {
      name: index_name,
      multiEntry: true
    }
  ]
};


module("Index", {
  setUp: function() {
    //var db = new ydn.db.Storage(db_name_get);
  },
  tearDown: function() {
    ydn.db.deleteDatabase(db_index);
  }
});
//
//
//asyncTest("Get index", function () {
//  expect(4);
//
//  var db = new ydn.db.Storage(db_name_put, schema_index);
//  console.log(db.getSchema());
//  var value_1 = 'test ' + Math.random();
//  var value_2 = 'test ' + Math.random();
//  db.put(store_inline, {id: 1, value: value_1, tag: 'a'});
//  db.put(store_inline, {id: 2, value: value_2, tag: 'b'});
//  db.put(store_inline, {id: 3, value: value_2, tag: 'c'});
//  var keyRange = ydn.db.KeyRange.only('a');
//  var dir = 'next';
//  var q = db.query().from(store_inline, index_name, dir, keyRange);
//  db.fetch(q).then(function (x) {
//    console.log(db.getSchema());
//    equal(1, x.length, 'result length');
//    equal('a', x[0].id, 'a value');
//    var keyRange = ydn.db.KeyRange.only('c');
//    var q = db.query().from(store_inline, index_name, dir, keyRange);
//    db.fetch(q).then(function (x) {
//      equal(1, x.length, 'result length');
//      equal('c', x[0].id, 'c value');
//      start();
//    }, function (e) {
//      ok(false, e.message);
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  });
//
//});


var db_query = "qunit_query_1";
module("Query", {
  setUp: function() {
    //var db = new ydn.db.Storage(db_name_get);
  },
  tearDown: function() {
    ydn.db.deleteDatabase(db_query);
  }
});


asyncTest("Select in index", function () {

  var arr = [
    {id: 1, value: 'A'},
    {id: 2, value: 'B'},
    {id: 3, value: 'B'}
  ];
  expect(5);

  var db = new ydn.db.Storage(db_query, schema_1);
  db.put(store_inline, arr);

  var q = db.query().from(store_inline);
  q.where('id', '==', 1);
  db.fetch(q).done(function (x) {
    equal(x.length, 1, 'A length');
    equal(arr[0].id, x[0].id);

    q = db.query().from(store_inline);
    q.where('id', '>=', 2);
    db.fetch(q).done(function (x) {
      equal(x.length, 2, 'A length');
      equal(x[0].id, arr[1].id);

      q = db.query().from(store_inline);
      q.where('id', '==', 4);
      db.fetch(q).done(function (x) {
        equal(0, x.length, 'A length');
        start();
      });
    });
  });

});

asyncTest("Select", function () {

  var arr = [
    {id: 1, value: 'A'},
    {id: 2, value: 'B'},
    {id: 3, value: 'B'}
  ];
  expect(5);

  var db = new ydn.db.Storage(db_query, schema_1);
  db.put(store_inline, arr);

  var q = db.query().from(store_inline);
  q.where('value', '==', 'A');
  db.fetch(q).done(function (x) {
    equal(x.length, 1, 'A length');
    equal(arr[0].id, x[0].id);

    q = db.query().from(store_inline);
    q.where('value', '==', 'B');
    db.fetch(q).done(function (x) {
      equal(x.length, 2, 'A length');
      equal(x[0].id, arr[1].id);

      q = db.query().from(store_inline);
      q.where('value', '==', 'C');
      db.fetch(q).done(function (x) {
        equal(0, x.length, 'A length');
        start();
      });
    });
  });

});

var db_key_range = "qunit_keyrange_2";
module("Cursor", {
  setUp: function() {
    //var db = new ydn.db.Storage(db_key_range);
  },
  tearDown: function() {
    ydn.db.deleteDatabase(db_key_range);
  }
});

var objs = [
  {value:'a0', id: 0, type: 'a'},
  {value:'a1', id: 1, type: 'a'},
  {value:'b2', id: 2, type: 'b'},
  {value:'c1', id: 3, type: 'b'},
  {value:'c2', id: 4, type: 'c'},
  {value:'c3', id: 5, type: 'c'},
  {value:'c4', id: 6, type: 'c'}
];
//var options = {Mechanisms: ['websql']};

