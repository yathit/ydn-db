
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Storage');
goog.require('ydn.testing');


var reachedFinalContinuation;

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'stest3';

var test_0_put = function() {
  var db = new ydn.db.Sqlite(db_name);

  var testEventType = 'test-event';
  var eventTarget = new goog.events.EventTarget();
  var hasEventFired = false;
  var put_value, done;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertEquals('put a 1', true, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db.put('a', '1').addCallback(function(value) {
    put_value = value;
    done = true;
  });
};

var test_0_put_2 = function() {
  var db = new ydn.db.Sqlite(db_name);

  var testEventType = 'test-event';
  var eventTarget = new goog.events.EventTarget();
  var hasEventFired = false;
  var put_value, done;
  var key = 'a' + Math.random();
  var value = 'v' + Math.random();

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertEquals('put a 1', true, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db.put(key, value).addCallback(function(value) {
    put_value = value;
    done = true;
  });
};


var test_1_clear = function() {
  var db = new ydn.db.Sqlite(db_name);

  var hasEventFired = false;
  var cleared_value;
  var cleared;

  waitForCondition(
      // Condition
      function() { return cleared; },
      // Continuation
      function() {
        assertEquals('cleared', true, cleared_value);
      },
      100, // interval
      1000); // maxTimeout


  db.clear().addCallback(function(value) {
    cleared_value = value;
    cleared = true;
  }).addErrback(function(v) {
    fail('should not get error.');
  });


  var counted, count;
  waitForCondition(
      // Condition
      function() { return counted; },
      // Continuation
      function() {
        assertEquals('count after count', 0, count);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  db.getCount().addCallback(function(value) {
    count = value;
    counted = true;
  }).addErrback(function(v) {
    fail('should not get error.');
  });

};


/**
 */
var test_special_keys = function() {
  var db = new ydn.db.Sqlite(db_name, {});

  var test_key = function(key) {
    console.log('testing ' + key);
    var key_value = 'a' + Math.random();

    var a_done;
    var a_value;
    waitForCondition(
        // Condition
        function() {
          return a_done;
        },
        // Continuation
        function() {
          assertTrue('put', a_value);

          var b_done;
          var b_value;
          waitForCondition(
              // Condition
              function() {
                return b_done;
              },
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

        },
        100, // interval
        2000); // maxTimeout

    db.put(key, key_value).addCallback(function(value) {
      console.log('receiving put value callback for ' + key + ' = ' + key_value + ' ' + value);
      a_value = value;
      a_done = true;
    });

  };

  test_key('x');

  test_key('t@som.com');

  test_key('http://www.ok.com');

  test_key('http://www.ok.com/.htere#somer?par=so');

};


/**
 */
var test_special_value = function() {
  var db = new ydn.db.Sqlite(db_name, {});

  var ik = 0;

  var test_value = function(value) {
    var key = 'a' + ik++;
    console.log('testing ' + value);

    var a_done;
    var a_value;
    waitForCondition(
        // Condition
        function() {
          return a_done;
        },
        // Continuation
        function() {
          assertTrue('put', a_value);

          var b_done;
          var b_value;
          waitForCondition(
              // Condition
              function() {
                return b_done;
              },
              // Continuation
              function() {
                assertEquals('get', value, b_value);
                reachedFinalContinuation = true;
              },
              100, // interval
              2000); // maxTimeout


          db.get(key).addCallback(function(value) {
            console.log('receiving get value callback ' + key + ' = ' + value);
            b_value = value;
            b_done = true;
          });

        },
        100, // interval
        2000); // maxTimeout

    db.put(key, value).addCallback(function(value) {
      console.log('receiving put value callback for ' + key + ' = ' + value + ' ' + value);
      a_value = value;
      a_done = true;
    });

  };

  test_value('a string');

  test_value(ydn.json.stringify({id: 'a', value: 10.2}));

  test_value(ydn.json.stringify({value: Math.random(), 'name': ydn.testing.randEmail()}));

};



var test_3_putObject = function() {
  var store_name = 'ydn.test.ts1';
  var put_obj_dbname = 'ydn.putodbtest1';
  var schema = {};
  schema[store_name] = {keyPath: 'id'};
  var db = new ydn.db.Sqlite(put_obj_dbname, schema);

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


      },
      100, // interval
      1000); // maxTimeout

  db.putObject(store_name, put_value, key).addCallback(function(value) {
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
        assertObjectEquals('get ', put_value, get_value_received);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db.getObject(store_name, key).addCallback(function(value) {
    console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
    get_value_received = value;
    get_done = true;
  });

};


var test_3_putObject_nested_keyPath = function() {
  var store_name = 'ts1';
  var put_obj_dbname = 'putsqltest5';
  var schema = {};
  schema[store_name] = {keyPath: 'id.$t'};
  var db = new ydn.db.Sqlite(put_obj_dbname, schema);

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
      },
      100, // interval
      2000); // maxTimeout

  db.putObject(store_name, put_value).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value_received = value;
    put_done = true;
  });
};


var test_4_getObjects = function() {
  var store_name = 'ts1';
  var put_obj_dbname = 'gobs3';
  var schema = {};
  schema[store_name] = {keyPath: 'id'};
  var db = new ydn.db.Sqlite(put_obj_dbname, schema);

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


  var test_get = function(idx) {
    var key = objs[idx].id;
    var get_done = false;
    var get_value_received = undefined;
    waitForCondition(
        // Condition
        function() { return get_done; },
        // Continuation
        function() {
          assertObjectEquals('get ' + key, objs[idx], get_value_received);
          reachedFinalContinuation = true;
        },
        100, // interval
        1000); // maxTimeout

    db.getObject(store_name, key).addCallback(function(value) {
      console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
      get_value_received = value;
      get_done = true;
    });
  };

  test_get(0);
  test_get(1);

};


var test_4_query_start_with = function() {
  var store_name = 'ts1';
  var put_obj_dbname = 'pos3';
  var schema = {};
  schema[store_name] = {keyPath: 'id'};
  var db = new ydn.db.Sqlite(put_obj_dbname, schema);

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

  var key = 'qs1';
  var get_done;
  var get_value_received;
  waitForCondition(
      // Condition
      function() { return get_done; },
      // Continuation
      function() {
        assertObjectEquals('get ' + key, objs[0], get_value_received);
      },
      100, // interval
      1000); // maxTimeout

  db.getObject(store_name, key).addCallback(function(value) {
    console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
    get_value_received = value;
    get_done = true;
  });

  var get2_done;
  var get2_value_received;
  waitForCondition(
      // Condition
      function() { return get2_done; },
      // Continuation
      function() {
        assertEquals('obj length', objs.length - 1, get2_value_received.length);
        assertObjectEquals('get ' + objs[0].id, objs[0], get2_value_received[0]);
        assertObjectEquals('get ' + objs[1].id, objs[1], get2_value_received[1]);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  var q = ydn.db.Query.startWith(store_name, 'qs');
  db.fetch(q).addCallback(function(value) {
    get2_value_received = value;
    get2_done = true;
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



