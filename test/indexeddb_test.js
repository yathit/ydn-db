
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);


	basic_schema = new ydn.db.DatabaseSchema(1);
	basic_schema.addStore(new ydn.db.StoreSchema(table_name, 'id'));
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test123';



var test_1_put = function() {

  var db = new ydn.db.IndexedDb(db_name, basic_schema);

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
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};


var test_2_put_arr = function() {
  var db_name = 'test_2';
  var db = new ydn.db.IndexedDb(db_name, basic_schema);

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
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};



var _test_3_empty_get = function() {

  var db = new ydn.db.IndexedDb(db_name, basic_schema);

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
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};


var test_4_get_all = function() {

  var db_name = 'test_get_all';
  var table_name = 'no_data_table';
  var basic_schema = new ydn.db.DatabaseSchema(1);
  basic_schema.addStore(new ydn.db.StoreSchema(table_name, 'id'));
  var db = new ydn.db.IndexedDb(db_name, basic_schema);

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



var test_25_clear = function() {
	var db = new ydn.db.IndexedDb(db_name, basic_schema);

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
var test_31_special_keys = function() {
  var db_name = 'test_6';
	var db = new ydn.db.IndexedDb(db_name, basic_schema);

  var key_test = function(key) {
    console.log('testing ' + key);
    var key_value = 'a' + Math.random();

    var a_done;
    var a_value;
    waitForCondition(
        // Condition
        function() { return a_done; },
        // Continuation
        function() {
          assertEquals('put a', key, a_value);
        },
        100, // interval
        2000); // maxTimeout

    db.put(table_name, {id: key, value: key_value}).addCallback(function(value) {
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
          assertEquals('get', key_value, b_value.value);
          reachedFinalContinuation = true;
        },
        100, // interval
        2000); // maxTimeout


    db.get(table_name, key).addCallback(function(value) {
      console.log('receiving get value callback ' + key + ' = ' + value);
      b_value = value;
      b_done = true;
    });
  };

  key_test('x');

  key_test('t@som.com');

  key_test('http://www.ok.com');

};


var test_41_keyRange = function () {
  var store_name = 'st';
  var dbname = 'test_41';
  var indexSchema = new ydn.db.IndexSchema('value', true, ydn.db.DataType.INTEGER);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false, [indexSchema]);
  var schema = new ydn.db.DatabaseSchema(1, undefined, [store_schema]);
  var db = new ydn.db.IndexedDb(dbname, schema);

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

    var key_range = ydn.db.Query.KeyRangeImpl.bound(2, 5, true, true);
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


var test_42_autoincreasement = function () {
  var store_name = 'demoOS';
  var dbname = 'test_42_3';
  var idx_schema = new ydn.db.IndexSchema('value', true, ydn.db.DataType.INTEGER);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', true, [idx_schema]);
  var schema = new ydn.db.DatabaseSchema(2, undefined, [store_schema]);
  var db = new ydn.db.IndexedDb(dbname, schema);

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

    var key_range = ydn.db.Query.KeyRangeImpl.bound(2, 5, true, true);
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

var test_7_put_nested_keyPath = function() {
  var store_name = 'ts1';
  var put_obj_dbname = 'putodbtest2';
	var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id.$t'));
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
        assertEquals('put a 1', key, put_value_received);
        // Remember, the state of this boolean will be tested in tearDown().
      },
      100, // interval
      2000); // maxTimeout

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

};


var test_71_offset_limit = function () {
  var store_name = 'st';
  var dbname = 'test_71_3';
  var indexSchema = new ydn.db.IndexSchema('id', true);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false, [indexSchema]);
  var schema = new ydn.db.DatabaseSchema(1, undefined, [store_schema]);
  var db = new ydn.db.IndexedDb(dbname, schema);

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
  var store_name = 'st';
  var dbname = 'test_74';
  var indexSchema = new ydn.db.IndexSchema('id', true);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false, [indexSchema]);
  var schema = new ydn.db.DatabaseSchema(1, undefined, [store_schema]);
  var db = new ydn.db.IndexedDb(dbname, schema);

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


var test_81_fetch_keys = function () {
  var store_name = 'st';
  var dbname = 'test81';
  var indexSchema = new ydn.db.IndexSchema('id', true);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false, [indexSchema]);
  var schema = new ydn.db.DatabaseSchema(1, undefined, [store_schema]);
  var db = new ydn.db.IndexedDb(dbname, schema);

  var objs = [
    {id:'qs1', value:Math.random()},
    {id:'at2', value:Math.random()},
    {id:'bs2', value:Math.random()},
    {id:'st', value:Math.random()}
  ];

  var put_value_received;
  var put_done;
  waitForCondition(
      // Condition
      function () {
        return put_done;
      },
      // Continuation
      function () {

        var get_done;
        var get_value_received;
        waitForCondition(
            // Condition
            function () {
              return get_done;
            },
            // Continuation
            function () {
              assertEquals('obj length', keys.length, put_value_received.length);
              assertObjectEquals('get', objs[1], put_value_received[0]);
              assertObjectEquals('get', objs[2], put_value_received[1]);

              reachedFinalContinuation = true;
            },
            100, // interval
            2000); // maxTimeout

        var keys = [
          new ydn.db.Key(store_name, objs[1].id),
          new ydn.db.Key(store_name, objs[2].id)];
        db.fetch(keys).addCallback(function (value) {
          console.log('fetch value: ' + JSON.stringify(value));
          put_value_received = value;

          get_done = true;
        });

      },
      100, // interval
      2000); // maxTimeout


  db.put(store_name, objs).addCallback(function (value) {
    console.log(['receiving value callback.', value]);
    put_value_received = value;
    put_done = true;
  });

};


var test_85_query_start_with = function () {
  var store_name = 'ts1';
  var dbname = 'test_8';
  var schema = new ydn.db.DatabaseSchema(1);
  // NOTE: key also need to be indexed.
  var indexSchema = new ydn.db.IndexSchema('id', true);
  schema.addStore(new ydn.db.StoreSchema(store_name, 'id', false, [indexSchema]));
  //schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));
  var db = new ydn.db.IndexedDb(dbname, schema);

  var objs = [
    {id:'qs1', value:Math.random()},
    {id:'qs2', value:Math.random()},
    {id:'qt', value:Math.random()}
  ];

  var put_value_received;
  var put_done;
  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertArrayEquals('put objs', [objs[0].id, objs[1].id, objs[2].id],
        put_value_received);

      var get_done;
      var get_value_received;
      waitForCondition(
        // Condition
        function () {
          return get_done;
        },
        // Continuation
        function () {
          reachedFinalContinuation = true;
        },
        100, // interval
        2000); // maxTimeout


      var q = new ydn.db.Query(store_name, 'id').startsWith('qs');
      db.fetch(q).addCallback(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        assertEquals('obj length', objs.length - 1, value.length);
        assertObjectEquals('get', objs[0], value[0]);
        assertObjectEquals('get', objs[1], value[1]);

        get_done = true;
      });

    },
    100, // interval
    2000); // maxTimeout

  db.put(store_name, objs).addCallback(function (value) {
    console.log(['receiving value callback.', value]);
    put_value_received = value;
    put_done = true;
  });

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



