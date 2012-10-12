
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, db;
var db_name = 'test_q_17';
var store_name = 'st';


var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
  goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);

  var indexSchema = new ydn.db.IndexSchema('value', ydn.db.DataType.TEXT, true);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false,
    ydn.db.DataType.INTEGER, [indexSchema]);
  schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  db = new ydn.db.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



var objs = [
  {id: -3, value: 'a0', type: 'a', remark: 'test ' + Math.random()},
  {id: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
  {id: 1, value: 'ba', type: 'b', remark: 'test ' + Math.random()},
  {id: 3, value: 'bc', type: 'b', remark: 'test ' + Math.random()},
  {id: 10, value: 'c', type: 'c', remark: 'test ' + Math.random()},
  {id: 11, value: 'c1', type: 'c', remark: 'test ' + Math.random()},
  {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
];



var test_1_query_constructor = function() {
  // test query constructor
  var lower = 1;
  var upper = 5;
  var q = new ydn.db.Cursor(store_name, 'next', 'id', lower, upper, false, true);
  assertEquals('store', store_name, q.store_name);
  assertEquals('index', 'id', q.index);
  assertEquals('direction', 'next', q.direction);
  assertNotNull(q.keyRange);
  assertEquals('lower', lower, q.keyRange.lower);
  assertEquals('upper', upper, q.keyRange.upper);
  assertFalse('lowerOpen', q.keyRange.lowerOpen);
  assertTrue('upperOpen', q.keyRange.upperOpen);

  var key_range = new ydn.db.KeyRange(lower, upper, false, true);
  q = new ydn.db.Cursor(store_name, 'next', 'id', key_range);
  assertNotNull(q.keyRange);
  assertEquals('lower', lower, q.keyRange.lower);
  assertEquals('upper', upper, q.keyRange.upper);
  assertFalse('lowerOpen', q.keyRange.lowerOpen);
  assertTrue('upperOpen', q.keyRange.upperOpen);


  q = new ydn.db.Cursor(store_name, 'next', 'id', key_range.toJSON());
  assertNotNull(q.keyRange);
  assertEquals('lower', lower, q.keyRange.lower);
  assertEquals('upper', upper, q.keyRange.upper);
  assertFalse('lowerOpen', q.keyRange.lowerOpen);
  assertTrue('upperOpen', q.keyRange.upperOpen);


  reachedFinalContinuation = true;
};


var test_2_select = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('length', objs.length, result.length);
        for (var i = 0; i < objs.length; i++) {
          assertEquals('value ' + i, objs[i].value, result[i]);
        }
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout

  var q = db.query(store_name);
  q.select('value');
  db.fetch(q).addCallback(function (q_result) {
    console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

//
//var test_3_idb_count = function() {
//
//  var db_name = 'test_3_idb_count';
//  var db = new ydn.db.Storage(db_name, basic_schema, options);
//
//  var arr = [
//    {id: 'a', value: 'A'},
//    {id: 'b', value: 'B'},
//    {id: 'c', value: 'C'}
//  ];
//
//  var hasEventFired = false;
//  var put_value;
//
//  waitForCondition(
//      // Condition
//      function() { return hasEventFired; },
//      // Continuation
//      function() {
//        assertEquals('select query', 3, put_value);
//        // Remember, the state of this boolean will be tested in tearDown().
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      2000); // maxTimeout
//
//
//  db.put(store_name, arr).addCallback(function(value) {
//    console.log('receiving value callback ' + JSON.stringify(value));
//
//    var q = db.query(store_name);
//    q.count();
//    db.fetch(q).addCallback(function(q_result) {
//      console.log('receiving query ' + JSON.stringify(q_result));
//      put_value = q_result;
//      hasEventFired = true;
//    })
//  });
//};
//
//
//var test_4_idb_sum = function() {
//
//  var db_name = 'test_4_idb_sum';
//  var db = new ydn.db.Storage(db_name, basic_schema, options);
//
//  var arr = [
//    {id: 'a', value: Math.random()},
//    {id: 'b', value: Math.random()},
//    {id: 'c', value: Math.random()}
//  ];
//
//  var total = arr[0].value + arr[1].value + arr[2].value;
//
//  var hasEventFired = false;
//  var put_value;
//
//  waitForCondition(
//      // Condition
//      function() { return hasEventFired; },
//      // Continuation
//      function() {
//        assertRoughlyEquals('sum query', total, put_value, 0.001);
//        // Remember, the state of this boolean will be tested in tearDown().
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      2000); // maxTimeout
//
//
//  db.put(store_name, arr).addCallback(function(value) {
//    console.log('receiving value callback ' + JSON.stringify(value));
//
//    var q = db.query(store_name);
//    q.sum('value');
//    db.fetch(q).addCallback(function(q_result) {
//      console.log('receiving query ' + JSON.stringify(q_result));
//      put_value = q_result;
//      hasEventFired = true;
//    })
//  });
//};
//
//
//
//var test_4_idb_avg = function() {
//
//  goog.userAgent.product.ASSUME_CHROME = true;
//
//  var db_name = 'test_4_idb_avg';
//  var db = new ydn.db.Storage(db_name, basic_schema, options);
//
//  var arr = [
//    {id: 'a', value: Math.random()},
//    {id: 'b', value: Math.random()},
//    {id: 'c', value: Math.random()}
//  ];
//
//  var avg = (arr[0].value + arr[1].value + arr[2].value) / 3;
//
//  var hasEventFired = false;
//  var put_value;
//
//  waitForCondition(
//      // Condition
//      function() { return hasEventFired; },
//      // Continuation
//      function() {
//        assertRoughlyEquals('sum query', avg, put_value, 0.001);
//        // Remember, the state of this boolean will be tested in tearDown().
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      2000); // maxTimeout
//
//
//  db.put(store_name, arr).addCallback(function(value) {
//    console.log('receiving value callback ' + JSON.stringify(value));
//
//    var q = db.query(store_name);
//    q.average('value');
//    db.fetch(q).addCallback(function(q_result) {
//      console.log('receiving query ' + JSON.stringify(q_result));
//      put_value = q_result;
//      hasEventFired = true;
//    })
//  });
//};
//
//
//var test_52_idb_where = function() {
//
//  var db_name = 'test_52_idb_when';
//  var db = new ydn.db.Storage(db_name, basic_schema, options);
//
//  var arr = [
//    {id: 'a', value: 1, text: 'A'},
//    {id: 'b', value: 2, text: 'B'},
//    {id: 'c', value: 3, text: 'C'},
//    {id: 'd', value: 4, text: 'D'}
//  ];
//
//
//  var hasEventFired = false;
//  var result;
//
//  waitForCondition(
//      // Condition
//      function() { return hasEventFired; },
//      // Continuation
//      function() {
//        assertEquals('when value = 1', 'B', result.text);
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      2000); // maxTimeout
//
//
//  db.put(store_name, arr).addCallback(function(value) {
//    console.log('receiving value callback ' + JSON.stringify(value));
//
//    var q = db.query(store_name);
//    q.where('value', '=', 2);
//    q.get().addCallback(function(q_result) {
//      console.log('receiving when query ' + JSON.stringify(q_result));
//      result = q_result;
//      hasEventFired = true;
//    })
//  });
//};
//
//
//var test_53_idb_where = function() {
//
//  var db_name = 'test_53_idb_when2';
//  var db = new ydn.db.Storage(db_name, basic_schema, options);
//
//  var arr = [
//    {id: 'a', value: 1, text: 'X'},
//    {id: 'b', value: 2, text: 'Y'},
//    {id: 'c', value: 3, text: 'X'},
//    {id: 'd', value: 4, text: 'Y'}
//  ];
//
//
//  var t1_done = false;
//  var t2_done = false;
//  var t1_result, t2_result;
//
//  waitForCondition(
//      // Condition
//      function() { return t1_done; },
//      // Continuation
//      function() {
//        assertEquals('when value > 2', 2, t1_result.length);
//        assertArrayEquals('when value > 2', arr.slice(2,4), t1_result);
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      2000); // maxTimeout
//
//  waitForCondition(
//      // Condition
//      function() { return t2_done; },
//      // Continuation
//      function() {
//        assertEquals('when value > 2 and X', 1, t2_result.length);
//        assertArrayEquals('when value > 2 and X', arr.slice(2,3), t2_result);
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      2000); // maxTimeout
//
//  db.put(store_name, arr).addCallback(function(value) {
//    console.log('receiving value callback ' + JSON.stringify(value));
//
//    var q = db.query(store_name);
//    q.where('value', '>', 2);
//    db.fetch(q).addCallback(function(q_result) {
//      console.log('receiving when query ' + JSON.stringify(q_result));
//      t1_result = q_result;
//      t1_done = true;
//    });
//
//    q = db.query(store_name);
//    q.where('value', '>', 2).where('text', '=', 'X');
//    db.fetch(q).addCallback(function(q_result) {
//      console.log('receiving when query ' + JSON.stringify(q_result));
//      t2_result = q_result;
//      t2_done = true;
//    });
//
//  });
//};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



