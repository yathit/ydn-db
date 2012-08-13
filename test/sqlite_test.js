
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Storage');
goog.require('ydn.testing');


var reachedFinalContinuation;
var table_name = 't1';
var basic_schema;

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);

  basic_schema = new ydn.db.DatabaseSchema(1);
  basic_schema.addStore(new ydn.db.StoreSchema(table_name, 'id'));

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);

};

var db_name = 'test1';

var test_0_put = function() {

  var db = new ydn.db.WebSql(db_name, basic_schema);

  var put_value, done;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertEquals('put a 1', 'a', put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db.put(table_name, {'id': 'a', 'value': '1'}).addCallback(function(value) {
    put_value = value;
    done = true;
  });

};

var test_1_get_all = function() {

  var db = new ydn.db.WebSql(db_name, basic_schema);

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

  db.get(table_name).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_1_delete = function() {

	var db = new ydn.db.WebSql(db_name, basic_schema);

	var put_value, done;

	waitForCondition(
		// Condition
		function() { return done; },
		// Continuation
		function() {
			assertTrue('deleted', put_value);
			// Remember, the state of this boolean will be tested in tearDown().
			reachedFinalContinuation = true;
		},
		100, // interval
		1000); // maxTimeout

	db.remove().addCallback(function(value) {
		put_value = value;
		done = true;
	});

};


var test_2_clear_table = function() {

	var db = new ydn.db.WebSql(db_name, basic_schema);

  var cleared_value, cleared;

  waitForCondition(
      // Condition
      function() { return cleared; },
      // Continuation
      function() {
        assertTrue('cleared', cleared_value);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  db.clear(table_name).addCallback(function(value) {
    cleared_value = value;
    cleared = true;
  }).addErrback(function(v) {
    fail('should not get error.');
  });
};


var test_2_clear = function() {

  var db = new ydn.db.WebSql(db_name, basic_schema);

  db.put(table_name, {'id': 'a', 'value': '1'});

  var cleared_value, cleared;

  waitForCondition(
      // Condition
      function() { return cleared; },
      // Continuation
      function() {
        assertTrue('cleared', cleared_value);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  db.clear(table_name, 'a').addCallback(function(value) {
    cleared_value = value;
    cleared = true;
  }).addErrback(function(v) {
        fail('should not get error.');
      });
};


//
///**
//*/
//var test_special_keys = function() {
//  var db = new ydn.db.WebSql(db_name, basic_schema);
//
//
//  var test_key = function(key) {
//    console.log('testing ' + key);
//    var key_value = 'a' + Math.random();
//
//    var a_done;
//    var a_value;
//    waitForCondition(
//        // Condition
//        function() {
//          return a_done;
//        },
//        // Continuation
//        function() {
//          assertEquals('put', key, a_value);
//
//          var b_done;
//          var b_value;
//          waitForCondition(
//              // Condition
//              function() {
//                return b_done;
//              },
//              // Continuation
//              function() {
//                assertEquals('get', key_value, b_value);
//                reachedFinalContinuation = true;
//              },
//              100, // interval
//              2000); // maxTimeout
//
//
//          db.getItem(key).addCallback(function(value) {
//            console.log('receiving get value callback ' + key + ' = ' + value);
//            b_value = value;
//            b_done = true;
//          });
//
//        },
//        100, // interval
//        2000); // maxTimeout
//
//    db.put(key, key_value).addCallback(function(value) {
//      console.log('receiving put value callback for ' + key + ' = ' + key_value + ' ' + value);
//      a_value = value;
//      a_done = true;
//    });
//
//  };
//
//  test_key('x');
//
//  test_key('t@som.com');
//
//  test_key('http://www.ok.com');
//
//  test_key('http://www.ok.com/.htere#somer?par=so');
//
//};
//
//
///**
// */
//var test_special_value = function() {
//  var db = new ydn.db.WebSql(db_name, {});
//
//  var ik = 0;
//
//  var test_value = function(value) {
//    var key = 'a' + ik++;
//    console.log('testing ' + value);
//
//    var a_done;
//    var a_value;
//    waitForCondition(
//        // Condition
//        function() {
//          return a_done;
//        },
//        // Continuation
//        function() {
//          assertTrue('put', a_value);
//
//          var b_done;
//          var b_value;
//          waitForCondition(
//              // Condition
//              function() {
//                return b_done;
//              },
//              // Continuation
//              function() {
//                assertEquals('get', value, b_value);
//                reachedFinalContinuation = true;
//              },
//              100, // interval
//              2000); // maxTimeout
//
//          db.getItem(key).addCallback(function(value) {
//            console.log('receiving get value callback ' + key + ' = ' + value);
//            b_value = value;
//            b_done = true;
//          });
//
//        },
//        100, // interval
//        2000); // maxTimeout
//
//    db.setItem(key, value).addCallback(function(value) {
//      console.log('receiving put value callback for ' + key + ' = ' + value + ' ' + value);
//      a_value = value;
//      a_done = true;
//    });
//
//  };
//
//  test_value('a string');
//
//  test_value(ydn.json.stringify({id: 'a', value: 10.2}));
//
//  test_value(ydn.json.stringify({value: Math.random(), 'name': ydn.testing.randEmail()}));
//
//};
//
//

var test_5_get = function() {
  var store_name = 'ydn.test.ts1';
  var put_obj_dbname = 'ydn.putodbtest2';
  var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));

  var db = new ydn.db.WebSql(put_obj_dbname, schema);

	var key = 'a';
  var put_done = false;
  var put_value = {value: Math.random(), 'remark': 'testing'};
  put_value.id = key;
  var put_value_received;

  waitForCondition(
      // Condition
      function() { return put_done; },
      // Continuation
      function() {
        assertEquals('put a 1', 'a', put_value_received);


      },
      100, // interval
      1000); // maxTimeout

  db.put(store_name, put_value).addCallback(function(value) {
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

  db.get(store_name, key).addCallback(function(value) {
    console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
    get_value_received = value;
    get_done = true;
  });
};


var test_6_put_nested_keyPath = function() {
  var store_name = 'ts1';
  var put_obj_dbname = 'test2';

	var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id.$t'));

	var db = new ydn.db.WebSql(put_obj_dbname, schema);

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
        assertEquals('put a 1', key, put_value_received);

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


        db.get(store_name, key).addCallback(function(value) {
          console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
          get_value_received = value;
          get_done = true;
        });
      },
      100, // interval
      2000); // maxTimeout

  db.put(store_name, put_value).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value_received = value;
    put_done = true;
  });
};


var test_7_put_get_array = function() {
  var store_name = 'ts1';
  var put_obj_dbname = 'test7';

	var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));

	var db = new ydn.db.WebSql(put_obj_dbname, schema);

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
        assertArrayEquals('put objs', [objs[0].id, objs[1].id, objs[2].id],
          put_value_received);
      },
      100, // interval
      2000); // maxTimeout

  db.put(store_name, objs).addCallback(function(value) {
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

    db.get(store_name, key).addCallback(function(value) {
      console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
      get_value_received = value;
      get_done = true;
    });
  };

  test_get(0);
  test_get(1);

};


var test_8_query_start_with = function() {
  var store_name = 'ts1';
	var dbname = 'test8';
	var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));
	var db = new ydn.db.WebSql(dbname, schema);


  var objs = [
    {id: 'as1', value: Math.random()},
    {id: 'as2', value: Math.random()},
    {id: 'at', value: Math.random()}
  ];

  var put_value_received;
  var put_done;
  waitForCondition(
      // Condition
      function() { return put_done; },
      // Continuation
      function() {
        assertArrayEquals('put objs', [objs[0].id, objs[1].id, objs[2].id],
          put_value_received);
      },
      100, // interval
      2000); // maxTimeout

  db.put(store_name, objs).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value_received = value;
    put_done = true;
  });

  var key = 'as1';
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

  db.get(store_name, key).addCallback(function(value) {
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
				assertEquals('id ' + objs[0].id, objs[0].id, get2_value_received[0].id);
				assertEquals('id ' + objs[1].id, objs[1].id, get2_value_received[1].id);
				assertObjectEquals('get ' + objs[0].id, objs[0], get2_value_received[0]);
        assertObjectEquals('get ' + objs[1].id, objs[1], get2_value_received[1]);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  var q = ydn.db.Query.startWith(store_name, 'as');
  db.fetch(q).addCallback(function(value) {
		console.log(['Receiving ', value])
    get2_value_received = value;
    get2_done = true;
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



