
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';
var stubs;

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);

  goog.userAgent.product.ASSUME_SAFARI = true;

  basic_schema = new ydn.db.DatabaseSchema(1);
  var index = new ydn.db.IndexSchema('id');
  var index2 = new ydn.db.IndexSchema('value', false, ydn.db.DataType.FLOAT);
  var store = new ydn.db.StoreSchema(table_name, 'id', false, [index, index2]);
	basic_schema.addStore(store);
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test12';


var test_2_idb_select = function() {

  var db_name = 'test_2_sql_select4';
  var db = new ydn.db.Storage(db_name, basic_schema);

  var arr = [
    {id: 'a', value: 1},
    {id: 'b', value: 2},
    {id: 'c', value: 3}
  ];

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertArrayEquals('select query', [arr[0].value, arr[1].value, arr[2].value],
            put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    console.log('receiving value callback ' + JSON.stringify(value));

    var q = db.query(table_name);
    q.select('value');
    db.fetch(q).addCallback(function(q_result) {
      console.log('receiving query ' + JSON.stringify(q_result));
      put_value = q_result;
      hasEventFired = true;
    })
  });
};


var test_3_idb_count = function() {

  var db_name = 'test_3_sql_count4';
  var db = new ydn.db.Storage(db_name, basic_schema);

  var arr = [
    {id: 'a', value: 1},
    {id: 'b', value: 2},
    {id: 'c', value: 3}
  ];

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('select query', 3, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    console.log('receiving value callback ' + JSON.stringify(value));

    var q = db.query(table_name);
    q.count();
    db.fetch(q).addCallback(function(q_result) {
      console.log('receiving query ' + JSON.stringify(q_result));
      put_value = q_result;
      hasEventFired = true;
    })
  });
};


var test_4_idb_sum = function() {

  var db_name = 'test_4_sql_sum3';
  var db = new ydn.db.Storage(db_name, basic_schema);

  var arr = [
    {id: 'a', value: Math.random()},
    {id: 'b', value: Math.random()},
    {id: 'c', value: Math.random()}
  ];

  var total = arr[0].value + arr[1].value + arr[2].value;

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertRoughlyEquals('sum query', total, put_value, 0.001);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    console.log('receiving value callback ' + JSON.stringify(value));

    var q = db.query(table_name);
    q.sum('value');
    db.fetch(q).addCallback(function(q_result) {
      console.log('receiving query ' + JSON.stringify(q_result));
      put_value = q_result;
      hasEventFired = true;
    })
  });
};



var test_4_idb_avg = function() {



  var db_name = 'test_4_sql_avg4';
  var db = new ydn.db.Storage(db_name, basic_schema);

  var arr = [
    {id: 'a', value: Math.random()},
    {id: 'b', value: Math.random()},
    {id: 'c', value: Math.random()}
  ];

  var avg = (arr[0].value + arr[1].value + arr[2].value) / 3;

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertRoughlyEquals('sum query', avg, put_value, 0.001);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    console.log('receiving value callback ' + JSON.stringify(value));

    var q = db.query(table_name);
    q.average('value');
    db.fetch(q).addCallback(function(q_result) {
      console.log('receiving query ' + JSON.stringify(q_result));
      put_value = q_result;
      hasEventFired = true;
    })
  });
};


var test_52_idb_when = function() {



  var db_name = 'test_52_sql_when4';
  var db = new ydn.db.Storage(db_name, basic_schema);

  var arr = [
    {id: 'a', value: 1, text: 'A'},
    {id: 'b', value: 2, text: 'B'},
    {id: 'c', value: 3, text: 'C'},
    {id: 'd', value: 4, text: 'D'}
  ];


  var hasEventFired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('when value = 1', 'B', result.text);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    console.log('receiving value callback ' + JSON.stringify(value));

    var q = db.query(table_name);
    q.when('value', '=', 2);
    db.get(q).addCallback(function(q_result) {
      console.log('receiving when query ' + JSON.stringify(q_result));
      result = q_result;
      hasEventFired = true;
    })
  });
};


var test_53_idb_when = function() {

  var db_name = 'test_53_sql_when4';
  var db = new ydn.db.Storage(db_name, basic_schema);

  var arr = [
    {id: 'a', value: 1, text: 'X'},
    {id: 'b', value: 2, text: 'Y'},
    {id: 'c', value: 3, text: 'X'},
    {id: 'd', value: 4, text: 'Y'}
  ];


  var t1_done = false;
  var t2_done = false;
  var t1_result, t2_result;

  waitForCondition(
      // Condition
      function() { return t1_done; },
      // Continuation
      function() {
        assertEquals('when value > 2', 2, t1_result.length);
        assertArrayEquals('when value > 2', arr.slice(2,4), t1_result);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout

  waitForCondition(
      // Condition
      function() { return t2_done; },
      // Continuation
      function() {
        assertEquals('when value > 2 and X', 1, t2_result.length);
        assertArrayEquals('when value > 2 and X', arr.slice(2,3), t2_result);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, arr).addCallback(function(value) {
    console.log('receiving value callback ' + JSON.stringify(value));

    var q = db.query(table_name);
    q.when('value', '>', 2);
    db.fetch(q).addCallback(function(q_result) {
      console.log('receiving when query ' + JSON.stringify(q_result));
      t1_result = q_result;
      t1_done = true;
    });

    q = db.query(table_name);
    q.when('value', '>', 2).when('text', '=', 'X');
    db.fetch(q).addCallback(function(q_result) {
      console.log('receiving when query ' + JSON.stringify(q_result));
      t2_result = q_result;
      t2_done = true;
    });

  });
};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



