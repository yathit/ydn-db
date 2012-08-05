
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');


var reachedFinalContinuation;

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.store').setLevel(goog.debug.Logger.Level.FINEST);
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'idxtest2';


var test_0_put = function() {
  var db = new ydn.db.IndexedDb(db_name);

  var testEventType = 'test-event';
  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('put a 1', true, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put('a', '1').addCallback(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};



var test_1_clear = function() {
  var db = new ydn.db.IndexedDb(db_name);

  var testEventType = 'test-event';
  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('clear', true, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
      },
      100, // interval
      1000); // maxTimeout

  var dfl = db.clear();
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

  db.getCount().addCallback(function(value) {
    countValue = value;
    countDone = true;
  });

};


/**
 */
var test_special_keys = function() {
  var db = new ydn.db.IndexedDb(db_name, {});

  var test_key = function(key) {
    console.log('testing ' + key);
    var key_value = 'a' + Math.random();

    var a_done;
    var a_value;
    waitForCondition(
        // Condition
        function() { return a_done; },
        // Continuation
        function() {
          assertTrue('put', a_value);
        },
        100, // interval
        2000); // maxTimeout

    db.put(key, key_value).addCallback(function(value) {
      console.log('receiving put value callback for ' + key + ' = ' + key_value);
      a_value = value;
      a_done = true;
    });

    var b_done;
    var b_value;
    waitForCondition(
        // Condition
        function() { return b_done; },
        // Continuation
        function() {
          assertEquals('get', key_value, b_value);
          reachedFinalContinuation = true;
        },
        100, // interval
        2000); // maxTimeout


    db.get(key).addCallback(function(value) {
      console.log('receiving get value callback ' + key + ' = ' + value);
      b_value = value;
      b_done = true;
    });
  };

  test_key('x');

  test_key('t@som.com');

  test_key('http://www.ok.com');

};


var test_3_putObject = function() {
  var store_name = 'ydn.feed.ts1';
  var put_obj_dbname = 'ydn.idb.putodbtest2';
  var schema = {};
  schema[store_name] = {keyPath: 'id'};
  var db = new ydn.db.IndexedDb(put_obj_dbname, schema);

  var key = 'a';
  var put_done = false;
  var put_value = {value: Math.random()};
  put_value.id = key;
  var put_value_received;

  waitForCondition(
      // Condition
      function() { return put_done; },
      // Continuation
      function() {
        assertTrue('put a 1', put_value_received);
        // Remember, the state of this boolean will be tested in tearDown().
      },
      100, // interval
      2000); // maxTimeout

  db.putObject(store_name, put_value).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value_received = value;
    put_done = true;
  });

  var get_done;
  var get_value_received;
  waitForCondition(
      // Condition
      function() { return get_done; },
      // Continuation
      function() {
        assertObjectEquals('get', put_value, get_value_received);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.getObject(store_name, key).addCallback(function(value) {
    console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
    get_value_received = value;
    get_done = true;
  });

};


var test_3_putObject_nested_keyPath = function() {
  var store_name = 'ts1';
  var put_obj_dbname = 'putodbtest2';
  var schema = {};
  schema[store_name] = {keyPath: 'id.$t'};
  var db = new ydn.db.IndexedDb(put_obj_dbname, schema);

  var key = 'a';
  var put_done = false;
  var put_value = {value: Math.random()};
  put_value.id = {$t: key};
  var put_value_received;

  waitForCondition(
      // Condition
      function() { return put_done; },
      // Continuation
      function() {
        assertTrue('put a 1', put_value_received);
        // Remember, the state of this boolean will be tested in tearDown().
      },
      100, // interval
      2000); // maxTimeout

  db.putObject(store_name, put_value).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value_received = value;
    put_done = true;
  });

  var get_done;
  var get_value_received;
  waitForCondition(
      // Condition
      function() { return get_done; },
      // Continuation
      function() {
        assertObjectEquals('get', put_value, get_value_received);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.getObject(store_name, key).addCallback(function(value) {
    console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
    get_value_received = value;
    get_done = true;
  });

};


var test_4_query_start_with = function() {
  var store_name = 'ts1';
  var put_obj_dbname = 'pos2';
  var schema = {};
  schema[store_name] = {keyPath: 'id'};
  var db = new ydn.db.IndexedDb(put_obj_dbname, schema);

  var objs = [
    {id: 'qs1', value: Math.random()},
    {id: 'qs2', value: Math.random()},
    {id: 'qt', value: Math.random()}
  ];

  var put_value_received;
  var put_done;
  waitForCondition(
      // Condition
      function() { return put_done; },
      // Continuation
      function() {
        assertTrue('put objs', put_value_received);
      },
      100, // interval
      2000); // maxTimeout

  db.putObject(store_name, objs).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value_received = value;
    put_done = true;
  });

  var get_done;
  var get_value_received;
  waitForCondition(
      // Condition
      function() { return get_done; },
      // Continuation
      function() {
        assertEquals('obj length', objs.length - 1, get_value_received.length);
        assertObjectEquals('get', objs[0], get_value_received[0]);
        assertObjectEquals('get', objs[1], get_value_received[1]);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  var q = ydn.db.Query.startWith(store_name, 'qs');
  db.fetch(q).addCallback(function(value) {
    get_value_received = value;
    get_done = true;
  });

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



