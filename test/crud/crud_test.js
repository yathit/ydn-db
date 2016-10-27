
goog.require('goog.debug.Console');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.debug');

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var debug_console, db, objs;

var table_name = 'st_inline';
var table_name_offline = 'st_offline';
var store_name_inline_number = 'st_inline_n';
var load_store_name = 'st_load';


function setUp () {

  ydn.json.POLY_FILL = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.crud.req.WebSql.DEBUG = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.tr.Serial.DEBUG = true;
  //ydn.db.crud.req.IndexedDb.DEBUG = true;
  // ydn.db.con.IndexedDb.DEBUG = true;



}


function tearDown() {

}


function getSchema() {
  var indexes = [new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT)];
  var stores = [new ydn.db.schema.Store(table_name, 'id'),
    new ydn.db.schema.Store(store_name_inline_number, 'id', false, ydn.db.schema.DataType.NUMERIC, undefined, true),
    new ydn.db.schema.Store(table_name_offline, undefined, false, ydn.db.schema.DataType.NUMERIC),
    new ydn.db.schema.Store(load_store_name, 'id', false, ydn.db.schema.DataType.NUMERIC, indexes)
  ];
  return new ydn.db.schema.Database(undefined, stores);
}


function test_add_inline() {
  var db_name = 'test_add' + goog.now();
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  }
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var keys = ['a', 2];


  asyncTestCase.waitForAsync('add 1');
  db.add('st', {id: keys[0], value: '1', remark: 'put test'}).addBoth(function(value) {
    assertEquals('add 0', keys[0], value);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('add 2');

    db.add('st', {id: keys[1], value: '1', remark: 'put test'}).addBoth(function(value) {
      assertEquals('add 1', keys[1], value);

      asyncTestCase.continueTesting();
      asyncTestCase.waitForAsync('add 3');

      db.add('st', {id: keys[0], value: '1', remark: 'put test'}).addCallbacks(function(value) {
        asyncTestCase.continueTesting();
      }, function(value) {
        assertTrue('add 2: Error object', goog.isObject(value));
        assertEquals('add 2: Error', 'ConstraintError', value.name);
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
        asyncTestCase.continueTesting();
      });
    });
  });

}


function test_put() {
  var db_name = 'test_11_put';
  var db = new ydn.db.crud.Storage(db_name, getSchema(), options);

  asyncTestCase.waitForAsync('put 1');
  db.put(table_name, {id: 'a', value: '1', remark: 'put test'}).addBoth(function(value) {
    assertEquals('put a', 'a', value);
    ydn.db.deleteDatabase(db_name, db.getType());
    db.close();
    asyncTestCase.continueTesting();
  });
}


function test_put_key() {
  var db_name = 'test_13_put_key';
  var db = new ydn.db.crud.Storage(db_name, getSchema(), options);

  var key = new ydn.db.Key(store_name_inline_number, 1);
  var value =
    {id: 1, msg: Math.random()};

  asyncTestCase.waitForAsync('put 1');
  db.put(key, value).addBoth(function(x) {
    keys = x;
    db.get(key).addBoth(function(results) {
      assertEquals('key', 1, keys);
      assertObjectEquals('value', value, results);
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      asyncTestCase.continueTesting();
    });
  });
}


function test_count_store() {

  var db_name = 'test_31_count_store_2';

  var n = Math.ceil(Math.random() * 10 + 1);
  var arr = [];
  for (var i = 0; i < n; i++) {
    arr[i] = {id: i};
  }

  var store_1 = 'st1';
  var stores = [new ydn.db.schema.Store(store_1, 'id', false,
    ydn.db.schema.DataType.INTEGER)];
  var schema = new ydn.db.schema.Database(1, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  db.clear(store_1);
  db.put(store_1, arr).addCallback(function(keys) {
    // console.log(keys);
  });


  asyncTestCase.waitForAsync('count');
  db.count(store_1).addBoth(function(value) {
    assertEquals('number of record', n, value);
    ydn.db.deleteDatabase(db_name, db.getType());
    db.close();
    asyncTestCase.continueTesting();
  });
}


function test_remove_by_id() {
  var db_name = 'test_41_remove_by_key';
  var db = new ydn.db.crud.Storage(db_name, getSchema(), options);
  db.clear(table_name);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
  );

  asyncTestCase.waitForAsync('remove');
  db.remove(table_name, 1).addBoth(function(delCount) {
    assertEquals('remove result', 1, delCount);
    db.count(table_name).addBoth(function(count) {
      assertEquals('count', 3, count);
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      asyncTestCase.continueTesting();
    });
  });

}


function test_serial() {
  var db_name = 'test_serial';
  var schema = {
    stores: [{
      name: 'st1'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  asyncTestCase.waitForAsync('get');
  var get1 = false;
  var get21 = false;
  var get22 = false;
  db.get('st1', 1).addCallback(function(x1) {
    get1 = true;
  });
  var obj = {a: 1};
  db.put('st1', obj, 2).addCallback(function(x1) {
    get21 = true;
  });
  db.get('st1', 2).addCallback(function(x1) {
    assertObjectEquals(obj, x1);
    get22 = true;
  });
  db.get('st1', 3).addBoth(function(x3) {
    assertTrue(get1);
    assertTrue(get21);
    assertTrue(get22);
    ydn.db.deleteDatabase(db_name, db.getType());
    db.close();
    asyncTestCase.continueTesting();
  });
}







