
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';

var setUp = function() {

  var store = new ydn.db.schema.Store(table_name, 'id');
	basic_schema = new ydn.db.schema.Database(1, [store]);

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test12';
var options = {mechanisms: ['localstorage']};


var test_1_put = function() {

  var db = new ydn.db.Storage(db_name, basic_schema, options);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('put a', 'a', put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, {id: 'a', value: '1', remark: 'put test'}).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_2_put_arr = function() {

  var db = new ydn.db.Storage(db_name, basic_schema, options);

  var arr = [
    {id: 'a' + Math.random(),
      value: 'a' + Math.random(), remark: 'put test'},
    {id: 'b' + Math.random(),
      value: 'b' + Math.random(), remark: 'put test'},
    {id: 'c' + Math.random(),
      value: 'c' + Math.random(), remark: 'put test'}
  ];

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertArrayEquals('put a', [arr[0].id, arr[1].id, arr[2].id], put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};

var test_3_empty_get = function() {

  var db = new ydn.db.Storage(db_name, basic_schema, options);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertUndefined('retriving non existing value', put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.get(table_name, 'no_data').addCallback(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_4_get_all = function() {
  var db_name = 'test_4';
  var db = new ydn.db.Storage(db_name, basic_schema, options);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertArrayEquals('get empty table', [], put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.values(table_name).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};



var test_5_clear = function() {
  var db = new ydn.db.Storage(db_name, basic_schema, options);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('clear one store', 1, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
      },
      100, // interval
      1000); // maxTimeout

  var dfl = db.clear(table_name);
  dfl.addCallback(function(value) {
    put_value = value;
    hasEventFired = true;
  }).addErrback(function(v) {
    fail('should not get error.');
  });

  var countValue;
  var countDone;
  waitForCondition(
      // Condition
      function() { return countDone; },
      // Continuation
      function() {
        assertEquals('count 0 after clear', 0, countValue);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db.count(table_name).addCallback(function(value) {
    countValue = value;
    countDone = true;
  });

};




/**
 */
var _test_6_no_keyPath = function () {

  var schema = new ydn.db.schema.Database(1);
  schema.addStore(new ydn.db.schema.Store(table_name));

  var db = new ydn.db.Storage(db_name, schema, options);
  var me = this;

  var key = 'x';

  var key_value = 'a' + Math.random();

  var a_done;
  var a_value;
  waitForCondition(
      // Condition
      function () {
        return a_done;
      },
      // Continuation
      function () {
        assertNotNullNorUndefined('put ok', a_value);

        var b_done;
        var b_value;
        waitForCondition(
          // Condition
          function () {
            return b_done;
          },
          // Continuation
          function () {
            assertEquals('get', key_value, b_value.value);
            reachedFinalContinuation = true;
          },
          100, // interval
          2000); // maxTimeout


        db.get(table_name, a_value).addCallback(function (value) {
          console.log('receiving get value callback ' + a_value + ' = ' + value);
          b_value = value;
          b_done = true;
        });

      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, {remark: 'testing', value:key_value}).addCallback(function (value) {
    console.log('receiving put value callback for ' + key + ' = ' + key_value);
    a_value = value;
    a_done = true;
  });


};

//
///**
//*/
//var test_7_special_keys = function() {
//
//	var db = new ydn.db.LocalStorage(db_name, basic_schema);
//	var me = this;
//
//  var test_key = function(key) {
//    console.log('testing ' + key);
//    var key_value = 'a' + Math.random();
//
//    var a_done;
//    var a_value;
//    waitForCondition(
//        // Condition
//        function() { return a_done; },
//        // Continuation
//        function() {
//          assertTrue('put', a_value);
//        },
//        100, // interval
//        2000); // maxTimeout
//
//    db.put(me.table_name, {id: key, value: key_value}).addCallback(function(value) {
//      console.log('receiving put value callback for ' + key + ' = ' + key_value);
//      a_value = value;
//      a_done = true;
//    });
//
//    var b_done;
//    var b_value;
//    waitForCondition(
//        // Condition
//        function() { return b_done; },
//        // Continuation
//        function() {
//          assertEquals('get', key_value, b_value.value);
//          reachedFinalContinuation = true;
//        },
//        100, // interval
//        2000); // maxTimeout
//
//
//    db.get(me.table_name, key).addCallback(function(value) {
//      console.log('receiving get value callback ' + key + ' = ' + value);
//      b_value = value;
//      b_done = true;
//    });
//  };
//
//  test_key('x');
//
//  test_key('t@som.com');
//
//  test_key('http://www.ok.com');
//
//};
//
//
//
//var test_8_put_nested_keyPath = function() {
//  var store_name = 'ts1';
//  var put_obj_dbname = 'putodbtest2';
//	var schema = new ydn.db.schema.Database(1);
//	schema.addStore(new ydn.db.schema.Store(store_name, 'id.$t'));
//	var db = new ydn.db.WebSql(put_obj_dbname, [schema]);
//
//  var key = 'a';
//  var put_done = false;
//  var put_value = {value: Math.random()};
//  put_value.id = {$t: key};
//  var put_value_received;
//
//  waitForCondition(
//      // Condition
//      function() { return put_done; },
//      // Continuation
//      function() {
//        assertTrue('put a 1', put_value_received);
//        // Remember, the state of this boolean will be tested in tearDown().
//      },
//      100, // interval
//      2000); // maxTimeout
//
//  db.put(store_name, put_value).addCallback(function(value) {
//    console.log('receiving value callback.');
//    put_value_received = value;
//    put_done = true;
//  });
//
//  var get_done;
//  var get_value_received;
//  waitForCondition(
//      // Condition
//      function() { return get_done; },
//      // Continuation
//      function() {
//        assertObjectEquals('get', put_value, get_value_received);
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      2000); // maxTimeout
//
//
//  db.get(store_name, key).addCallback(function(value) {
//    console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
//    get_value_received = value;
//    get_done = true;
//  });
//
//};
////
//
//var test_9_query_start_with = function() {
//  var store_name = 'ts1';
//  var put_obj_dbname = 'pos2';
//	var schema = new ydn.db.schema.Database(1);
//	schema.addStore(new ydn.db.schema.Store(store_name, 'id'));
//	var db = new ydn.db.WebSql(put_obj_dbname, [schema]);
//
//
//
//  var objs = [
//    {id: 'qs1', value: Math.random()},
//    {id: 'qs2', value: Math.random()},
//    {id: 'qt', value: Math.random()}
//  ];
//
//  var put_value_received;
//  var put_done;
//  waitForCondition(
//      // Condition
//      function() { return put_done; },
//      // Continuation
//      function() {
//        assertArrayEquals('put arr', [objs[0].id, objs[1].id, objs[2].id],
//          put_value_received);
//
//        var get_done;
//        var get_value_received;
//        waitForCondition(
//          // Condition
//          function() { return get_done; },
//          // Continuation
//          function() {
//            assertEquals('obj length', objs.length - 1, get_value_received.length);
//            assertObjectEquals('get', objs[0], get_value_received[0]);
//            assertObjectEquals('get', objs[1], get_value_received[1]);
//            reachedFinalContinuation = true;
//          },
//          100, // interval
//          2000); // maxTimeout
//
//
//        var q = ydn.db.Iterator.startWith(store_name, 'qs');
//        db.fetch(q).addCallback(function(value) {
//          get_value_received = value;
//          get_done = true;
//        });
//      },
//      100, // interval
//      2000); // maxTimeout
//
//  db.put(store_name, objs).addCallback(function(value) {
//    console.log('receiving value callback.');
//    put_value_received = value;
//    put_done = true;
//  });
//
//
//};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



