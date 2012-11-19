
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, debug_console, db, objs;

var db_name = 'test_crud_3';
var table_name = 'st_inline';
var table_name_offline = 'st_offline';


var setUp = function () {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    //goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  //ydn.db.con.IndexedDb.DEBUG = true;
  //ydn.db.con.WebSql.DEBUG = true;

  var stores = [new ydn.db.schema.Store(table_name, 'id'),
    new ydn.db.schema.Store(table_name_offline)];
  schema = new ydn.db.schema.Database(undefined, stores);


};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var test_11_put = function() {

  var db = new ydn.db.Storage(db_name, schema, options);

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
    //console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};



var test_12_put_array = function() {
  var db_name = 'test_13';
  var db = new ydn.db.Storage(db_name, schema, options);

  var arr = [];
  var n = ydn.db.core.req.IndexedDb.REQ_PER_TX / 2;
  for (var i = 0; i < n; i++) {
    arr.push({id: i, value: 'a' + Math.random()});
  }

  var hasEventFired = false;
  var results;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('length', arr.length, results.length);
      for (var i = 0; i < arr.length; i++) {
        assertEquals('1', arr[i].id, results[i]);
      }

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};


var test_13_put_array = function() {
  var db_name = 'test_crud_ 13_2';
  var db = new ydn.db.Storage(db_name, schema, options);

  var arr = [];
  var n = ydn.db.core.req.IndexedDb.REQ_PER_TX * 2.5;
  for (var i = 0; i < n; i++) {
    arr.push({id: i, value: 'a' + Math.random()});
  }

  var hasEventFired = false;
  var results;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('length', arr.length, results.length);
      for (var i = 0; i < arr.length; i++) {
        assertEquals('1', arr[i].id, results[i]);
      }

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};


var test_14_put_large_array = function() {
  var db_name = 'test_crud_ 13_2';
  var db = new ydn.db.Storage(db_name, schema, options);

  var arr = [];
  var n = 1500;
  for (var i = 0; i < n; i++) {
    arr.push({id: i, value: 'a' + Math.random()});
  }

  var hasEventFired = false;
  var results;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('length', arr.length, results.length);

        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  }).addErrback(function(e) {
        hasEventFired = true;
        console.log('Error: ' + e);
      });
};



var test_21_get_inline = function() {
  var db_name = 'test_crud_21_2';
  var db = new ydn.db.Storage(db_name, schema, options);

  var key = Math.ceil(Math.random()*1000);
  var value = {id: key, value: 'a' + Math.random()};

  var done = false;
  var result;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('length', value.value, result.value);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, value).addCallback(function(k) {
    console.log('key: ' + k);
  });

  db.get(table_name, key).addCallback(function(value) {
    //console.log('receiving value callback.');
    result = value;
    done = true;
  }).addErrback(function(e) {
      done = true;
      console.log('Error: ' + e);
    });
};


var test_22_get_offline = function() {
  var db_name = 'test_crud_21_2';
  var db = new ydn.db.Storage(db_name, schema, options);

  var key = Math.ceil(Math.random()*1000);
  var value = {value: 'a' + Math.random()};

  var done = false;
  var result;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('value', value.value, result.value);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name_offline, value, key);

  db.get(table_name_offline, key).addCallback(function(value) {
    //console.log('receiving value callback.');
    result = value;
    done = true;
  }).addErrback(function(e) {
      done = true;
      console.log('Error: ' + e);
    });
};



var test_23_get_array = function() {
  var db_name = 'test_crud_21_2';
  var db = new ydn.db.Storage(db_name, schema, options);

  var arr = [];
  var n = ydn.db.core.req.IndexedDb.REQ_PER_TX / 2;
  for (var i = 0; i < n; i++) {
    arr.push({id: i, value: 'a' + Math.random()});
  }
  var ids = [1, 2];


  var hasEventFired = false;
  var results;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('length', ids.length, results.length);
      assertEquals('1', arr[ids[0]].value, results[0].value);
      assertEquals('1', arr[ids[1]].value, results[1].value);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, arr);

  db.list(table_name, ids).addCallback(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};


var test_24_get_array = function() {
  var db_name = 'test_crud_23 _2';
  var db = new ydn.db.Storage(db_name, schema, options);

  var arr = [];
  var n = ydn.db.core.req.IndexedDb.REQ_PER_TX * 2.5;
  for (var i = 0; i < n; i++) {
    arr.push({id: i, value: 'a' + Math.random()});
  }
  var ids = [2,
    ydn.db.core.req.IndexedDb.REQ_PER_TX,
    ydn.db.core.req.IndexedDb.REQ_PER_TX+1,
    2*ydn.db.core.req.IndexedDb.REQ_PER_TX+1];


  var hasEventFired = false;
  var results;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('length', ids.length, results.length);
      for (var i = 0; i < ids.length; i++) {
        assertEquals('of ' + i, arr[ids[i]].value, results[i].value);
      }

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, arr);

  db.list(table_name, ids).addCallback(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};


var test_25_get_large_array = function() {
  var db_name = 'test_crud_23 _2';
  var db = new ydn.db.Storage(db_name, schema, options);

  var arr = [];
  var ids = [];
  var n = 1500;
  for (var i = 0; i < n; i++) {
    ids[i] = i;
    arr[i] = {id: i, value: 'a' + Math.random()};
  }

  var hasEventFired = false;
  var results;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('length', ids.length, results.length);
        var cids = [0, 500, 1000, 1450];
        for (var i = 0; i < cids.length; i++) {
          var id = cids[i];
          assertEquals('of ' + id, arr[id].value, results[id].value);
        }

        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, arr);

  db.list(table_name, ids).addCallback(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  }).addErrback(function(e) {
        hasEventFired = true;
        console.log('Error: ' + e);
      });
};


var test_24_get_all_no_data = function() {

  var db_name = 'test_get_all_2';
  var table_name = 'no_data_table';

  var stores = [new ydn.db.schema.Store(table_name, 'id')];
  var schema = new ydn.db.schema.Database(1, stores);
  var db = new ydn.db.Storage(db_name, schema, options);

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

  db.list(table_name).addCallback(function(value) {
    //console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_25_get_none_exist = function() {

  var db = new ydn.db.Storage(db_name, schema, options);

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
    //console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};


var test_31_count_store = function() {

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
  var db = new ydn.db.Storage(db_name, schema, options);

  db.clear(store_1);
  db.put(store_1, arr).addCallback(function(keys) {
    console.log(keys);
  });

  var done = false;
  var count;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('number of record', n, count);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.count(store_1).addCallback(function(value) {
    //console.log('receiving value callback.');
    count = value;
    done = true;
  });
};

var test_33_count_database = function() {

  var db_name = 'test_33_count_database_1';


  var n1 = Math.ceil(Math.random() * 10 + 1);
  var n2 = Math.ceil(Math.random() * 10 + 1);
  var arr1 = [];
  var arr2 = [];
  for (var i = 0; i < n1; i++) {
    arr1.push({id: i});
  }
  for (var i = 0; i < n2; i++) {
    arr2.push({id: i});
  }

  var store_1 = 'st1';
  var store_2 = 'st2';
  var stores = [
    new ydn.db.schema.Store(store_1, 'id', false, ydn.db.schema.DataType.INTEGER),
    new ydn.db.schema.Store(store_2, 'id', false, ydn.db.schema.DataType.INTEGER)];

  var schema = new ydn.db.schema.Database(1, stores);
  var db = new ydn.db.Storage(db_name, schema, options);

  db.clear(store_1);
  db.clear(store_2);
  db.put(store_1, arr1);
  db.put(store_2, arr2);

  var done = false;
  var count;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('number of record', n1+n2, count);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.count().addCallback(function(value) {
    //console.log('receiving value callback.');
    count = value;
    done = true;
  });
};


var test_41_clear_store = function() {
  var db = new ydn.db.Storage(db_name, schema, options);
  db.put(table_name, {id: 1});

  var hasEventFired = false;
  var put_value;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      // clear success do not return any result and hence 'undefined'.
      //console.log('cleared');
      assertEquals('clear result', true, put_value);
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


var test_51_array_key = function() {
  var db_name = 'test_crud_41_2';

  var stores = [new ydn.db.schema.Store(table_name, 'id', false, ydn.db.schema.DataType.ARRAY)];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.Storage(db_name, schema, options);

  var key_test = function(key) {
    //console.log('testing ' + key);
    var key_value = 'a' + Math.random();

    var a_done;
    var a_value;
    waitForCondition(
      // Condition
      function() { return a_done; },
      // Continuation
      function() {
        assertArrayEquals('put a', key, a_value);

        var b_done;
        var b_value;
        waitForCondition(
          // Condition
          function() { return b_done; },
          // Continuation
          function() {
            assertEquals('get ' + JSON.stringify(key), key_value, b_value.value);
            reachedFinalContinuation = true;
          },
          100, // interval
          2000); // maxTimeout


        db.get(table_name, key).addCallback(function(value) {
          console.log(db + ' receiving get value callback ' + key + ' = ' + value);
          b_value = value;
          b_done = true;
        });
      },
      100, // interval
      2000); // maxTimeout

    db.put(table_name, {id: key, value: key_value}).addCallback(function(value) {
      //console.log(db + ' receiving put value callback for ' + key + ' = ' + key_value);
      a_value = value;
      a_done = true;
    });


  };

  key_test(['x']);

  key_test(['a', 'b']);

  key_test(['a', 'b', 'c']);

};



var test_52_fetch_keys = function () {
  var store_name = 'st';
  var db_name = 'test_crud_52_3';
  var indexSchema = new ydn.db.schema.Index('value', undefined, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.TEXT, [indexSchema]);
  var schema = new ydn.db.schema.Database(1, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);

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
      db.list(keys).addCallback(function (value) {
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




var test_53_fetch_keys = function () {
  var store_name1 = 'st1';
  var store_name2 = 'st2';
  var db_name = 'test_crud_53_8';
  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.NUMERIC, true);
  var store_schema1 = new ydn.db.schema.Store(store_name1, 'id', false, ydn.db.schema.DataType.TEXT, [indexSchema]);
  var store_schema2 = new ydn.db.schema.Store(store_name2, 'id', false, ydn.db.schema.DataType.TEXT);
  var schema = new ydn.db.schema.Database(1, [store_schema1, store_schema2]);
  var db = new ydn.db.Storage(db_name, schema, options);


  var objs1 = [];
  var n = ydn.db.core.req.IndexedDb.REQ_PER_TX * 2.5;
  for (var i = 0; i < n; i++) {
    objs1.push({id: 'a' + i, value: Math.random()});
  }

  var objs2 = [];
  for (var i = 0; i < n; i++) {
    objs2.push({id: 'b' + i, value: Math.random()});
  }
  var ids = [2,
    ydn.db.core.req.IndexedDb.REQ_PER_TX,
    ydn.db.core.req.IndexedDb.REQ_PER_TX+1,
    2*ydn.db.core.req.IndexedDb.REQ_PER_TX+1];
  var keys = [];
  for (var i = 0; i < ids.length; i++) {
    keys.push(new ydn.db.Key(store_name1, objs1[ids[i]].id));
  }
  for (var i = 0; i < ids.length; i++) {
    keys.push(new ydn.db.Key(store_name2, objs2[ids[i]].id));
  }

  var put1_done, put2_done;

  waitForCondition(
    // Condition
    function () {
      return put1_done && put2_done;
    },
    // Continuation
    function () {

      var get_done, results;
      waitForCondition(
        // Condition
        function () {
          return get_done;
        },
        // Continuation
        function () {
          assertEquals('length', ids.length * 2, results.length);
          for (var i = 0; i < ids.length; i++) {
            assertEquals(i + '. ' + store_name1 + ': ' + keys[i].id,
              objs1[ids[i]].value, results[i].value);
          }
          for (var i = 0; i < ids.length; i++) {
            assertEquals(i + '. ' + store_name2 + ': ' + keys[i+ids.length].id,
              objs2[ids[i]].value, results[i+ids.length].value);
          }

          reachedFinalContinuation = true;
        },
        100, // interval
        2000); // maxTimeout

      db.list(keys).addCallback(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        results = value;
        get_done = true;
      });

    },
    100, // interval
    2000); // maxTimeout

  db.put(store_name1, objs1).addCallback(function (value) {
    console.log(['receiving value callback.', value]);
    put1_done = true;
  });
  db.put(store_name2, objs2).addCallback(function (value) {
    console.log(['receiving value callback.', value]);
    put2_done = true;
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



