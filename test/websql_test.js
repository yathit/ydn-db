
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

var db_name = 'test2';
var options = {preference: ['websql']};

var test_0_put = function() {

  var db = new ydn.db.Storage(db_name, basic_schema, options);

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


var test_1_1_put_arr = function() {
  var db_name = 'test_3';
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

var test_1_get_all = function() {

  var db_name = 'get_empty_table_test_21';
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

  db.get(table_name).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_1_delete = function() {

  var db = new ydn.db.Storage(db_name, basic_schema, options);

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

	db.clear(table_name).addCallback(function(value) {
		put_value = value;
		done = true;
	});

};


var test_2_clear_table = function() {

  var db = new ydn.db.Storage(db_name, basic_schema, options);

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

  var db = new ydn.db.Storage(db_name, basic_schema, options);

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
  var db_name = 'ydn.putodbtest21';
  var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));

  var db = new ydn.db.Storage(db_name, schema, options);

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
  var db_name = 'test21';

	var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id.$t'));

  var db = new ydn.db.Storage(db_name, schema, options);

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
  var db_name = 'test71';

	var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));

  var db = new ydn.db.Storage(db_name, schema, options);

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



var test_41_keyRange = function () {
  var store_name = 'ts1';
  var db_name = 'test_41_61';

  var schema = new ydn.db.DatabaseSchema(1);
  var indexSchema = new ydn.db.IndexSchema('value', true, ydn.db.DataType.INTEGER);
  schema.addStore(new ydn.db.StoreSchema(store_name, 'id', false, [indexSchema]));
  var db = new ydn.db.Storage(db_name, schema, options);

  var objs = [
    {id:'qs0', value: 0, type: 'a'},
    {id:'qs1', value: 1, type: 'a'},
    {id:'at2', value: 2, type: 'b'},
    {id:'bs1', value: 3, type: 'b'},
    {id:'bs2', value: 4, type: 'c'},
    {id:'bs3', value: 5, type: 'c'},
    {id:'st3', value: 6, type: 'c'}
  ];


  var done;
  var result;
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertEquals('length', 2, result.length);
        assertArrayEquals([objs[3], objs[4]], result);

        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(store_name, objs).addCallback(function (value) {
    console.log(['receiving value callback.', value]);

    var key_range = ydn.db.KeyRangeImpl.bound(2, 5, true, true);
    var q = new ydn.db.Query(store_name, 'value', key_range);

    db.fetch(q).addBoth(function (value) {
      console.log('fetch value: ' + JSON.stringify(value));
      result = value;
      done = true;
    });
  }).addErrback(function(e) {
        console.log(e.stack);
        console.log(e);
        assertFalse(true, 'Error');
      });

};


var test_71_offset_limit = function () {
  var store_name = 'ts1';
  var db_name = 'test_71_51';

  var schema = new ydn.db.DatabaseSchema(1);
  var indexSchema = new ydn.db.IndexSchema('id', true, ydn.db.DataType.INTEGER);
  schema.addStore(new ydn.db.StoreSchema(store_name, 'id', false, [indexSchema]));
  var db = new ydn.db.Storage(db_name, schema, options);

   var objs = [
    {value:'qs0', id: 0, type: 'a'},
    {value:'qs1', id: 1, type: 'a'},
    {value:'at2', id: 2, type: 'b'},
    {value:'bs1', id: 3, type: 'b'},
    {value:'bs2', id: 4, type: 'c'},
    {value:'bs3', id: 5, type: 'c'},
    {value:'st3', id: 6, type: 'c'}
  ];

  var offset = 2;
  var limit = 2;
  var target = objs.slice(offset, offset + limit);

  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      console.log('result: ' + JSON.stringify(result));
      console.log('target: ' + JSON.stringify(target));
      assertEquals('length', target.length, result.length);
      assertArrayEquals(target, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.put(store_name, objs).addBoth(function (value) {
    console.log(['receiving value callback.', value]);

    var q = new ydn.db.Query(store_name, 'id');

    db.fetch(q, limit, offset).addBoth(function (value) {
      console.log('fetch value: ' + JSON.stringify(value));
      result = value;
      done = true;
    });
  });

};


var test_74_where = function () {
  var store_name = 'ts1';
  var db_name = 'test_74_where1';

  var schema = new ydn.db.DatabaseSchema(1);
  schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));
  var db = new ydn.db.Storage(db_name, schema, options);

  var objs = [
    {id:'qs0', value: 0, type: 'a'},
    {id:'qs1', value: 1, type: 'a'},
    {id:'at2', value: 2, type: 'b'},
    {id:'bs1', value: 3, type: 'b'},
    {id:'bs2', value: 4, type: 'c'},
    {id:'bs3', value: 5, type: 'c'},
    {id:'st3', value: 6, type: 'c'}
  ];


  var done;
  var result;
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertEquals('length', 2, result.length);
        assertArrayEquals([objs[3], objs[4]], result);

        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(store_name, objs).addBoth(function (value) {
    console.log(['receiving value callback.', value]);

    var q = new ydn.db.Query(store_name).where('value', '<', 5, '>', 2);

    db.fetch(q).addBoth(function (value) {
      console.log('fetch value: ' + JSON.stringify(value));
      result = value;
      done = true;
    });
  });

};


var test_8_query_start_with = function() {
  var store_name = 'ts1';
	var db_name = 'test81';
	var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));
  var db = new ydn.db.Storage(db_name, schema, options);


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


  var q = new ydn.db.Query(store_name, 'id').startsWith('as');

  db.fetch(q).addCallback(function(value) {
		console.log(['Receiving ', value])
    get2_value_received = value;
    get2_done = true;
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



