
goog.require('goog.debug.Console');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.debug');


var reachedFinalContinuation, schema, debug_console, db, objs;

var table_name = 'st_inline';
var table_name_offline = 'st_offline';
var store_name_inline_number = 'st_inline_n';
var load_store_name = 'st_load';


var setUp = function() {

  ydn.json.POLY_FILL = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.crud.req.WebSql.DEBUG = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.tr.Serial.DEBUG = true;
  //ydn.db.crud.req.IndexedDb.DEBUG = true;
  // ydn.db.con.IndexedDb.DEBUG = true;

  var indexes = [new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT)];
  var stores = [new ydn.db.schema.Store(table_name, 'id'),
    new ydn.db.schema.Store(store_name_inline_number, 'id', false, ydn.db.schema.DataType.NUMERIC, undefined, true),
    new ydn.db.schema.Store(table_name_offline, undefined, false, ydn.db.schema.DataType.NUMERIC),
    new ydn.db.schema.Store(load_store_name, 'id', false, ydn.db.schema.DataType.NUMERIC, indexes)
  ];
  schema = new ydn.db.schema.Database(undefined, stores);

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_add_inline = function() {
  var db_name = 'test_add' + goog.now();
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  }
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var fired = [];
  var results = [];
  var keys = ['a', 2];

  waitForCondition(
    // Condition
    function() { return fired[0] && fired[1] && fired[2]; },
    // Continuation
    function() {
      assertEquals('add 0', keys[0], results[0]);
      assertEquals('add 1', keys[1], results[1]);
      assertTrue('add 2: Error object', goog.isObject(results[2]));
      assertEquals('add 2: Error', 'ConstraintError', results[2].name);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.add('st', {id: keys[0], value: '1', remark: 'put test'}).addBoth(function(value) {
    //console.log('receiving value callback.');
    results[0] = value;
    fired[0] = true;

  });

  db.add('st', {id: keys[1], value: '1', remark: 'put test'}).addBoth(function(value) {
    //console.log('receiving value callback.');
    results[1] = value;
    fired[1] = true;
  });

  db.add('st', {id: keys[0], value: '1', remark: 'put test'}).addCallbacks(function(value) {
    fired[2] = true;
  }, function(value) {
    results[2] = value;
    fired[2] = true;
  });
};


var test_add_outofline = function() {
  var db_name = 'test_add' + goog.now();
  var schema = {
    stores: [{
      name: 'st'
    }]
  }
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var fired = [];
  var results = [];
  var keys = ['a', 2];

  waitForCondition(
    // Condition
    function() { return fired[0] && fired[1] && fired[2]; },
    function() {
      assertEquals('add 1', keys[0], results[0]);
      assertEquals('add 1', keys[1], results[1]);
      assertTrue('add 2: Error object', goog.isObject(results[2]));
      assertEquals('add 2: Error', 'ConstraintError', results[2].name);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.add('st', {value: '1', remark: 'put test'}, keys[0]).addBoth(function(value) {
    //console.log('receiving value callback.');
    results[0] = value;
    fired[0] = true;
  });

  db.add('st', {value: '1', remark: 'put test'}, keys[1]).addBoth(function(value) {
    //console.log('receiving value callback.');
    results[1] = value;
    fired[1] = true;
  });

  db.add('st', {value: '1', remark: 'put test'}, keys[0]).addCallbacks(function(value) {
    fired[2] = true;
  }, function(value) {
    results[2] = value;
    fired[2] = true;
  });
};


var test_add_fail = function() {
  var db_name = 'test_add_fail';
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  // ydn.db.crud.req.WebSql.DEBUG = true;
  var hasEventFired = false;
  var put_value, add_ev;
  var key = Math.random();

  waitForCondition(
    // Condition
    function() {
      return hasEventFired;
    },
    // Continuation
    function() {
      assertEquals('add a', key, put_value);
      hasEventFired = false;

      waitForCondition(
        // Condition
        function() {
          return hasEventFired;

        },
        // Continuation
        function() {
          assertNull('add a again', put_value);
          assertNotNull('error event', add_ev);
          if (db.getType() == 'indexeddb') {
            assertEquals('add fail with constrained error', 'ConstraintError', add_ev.name);
          } else if (db.getType() == 'websql') {
            assertEquals('add fail with constrained error', 6, add_ev.code);
          }

          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();

        },
        100, // interval
        1000); // maxTimeout

      db.add(store_name_inline_number, {id: key, value: '2', remark: 'add test'}).addCallback(function(value) {
        //console.log('receiving value callback ' + value);
        put_value = value;
        hasEventFired = true;
      }).addErrback(function(e) {
          put_value = null;
          add_ev = e;
          hasEventFired = true;
          // console.log(e);
        });
    },
    100, // interval
    1000); // maxTimeout


  db.add(store_name_inline_number, {id: key, value: '1', remark: 'add test'}).addBoth(function(value) {
    //console.log('receiving value callback ' + value);
    put_value = value;
    hasEventFired = true;
  });
};



var test_put = function() {
  var db_name = 'test_11_put';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, {id: 'a', value: '1', remark: 'put test'}).addBoth(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_put_array_key = function() {
  var db_name = 'test_12_put_array_key';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr = [];
  var n = ydn.db.crud.req.IndexedDb.REQ_PER_TX / 2;
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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, arr).addBoth(function(value) {
    results = value;
    hasEventFired = true;
  });
};


var test_put_key = function() {
  var db_name = 'test_13_put_key';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var key = new ydn.db.Key(store_name_inline_number, 1);
  var value =
    {id: 1, msg: Math.random()};

  var done = false;
  var results, keys;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('key', 1, keys);
      assertObjectEquals('value', value, results);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.put(key, value).addBoth(function(x) {
    console.log('receiving value callback.');
    keys = x;
    db.get(key).addBoth(function(x) {
      results = x;
      done = true;
    });
  });
};


var test_put_array_by_keys = function() {
  var db_name = 'test_crud_ 13_2';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr = [
    new ydn.db.Key(store_name_inline_number, 1),
    new ydn.db.Key(store_name_inline_number, 2),
    new ydn.db.Key(table_name_offline, 3)];
  var values = [
    {id: 1, msg: Math.random()},
    {msg: Math.random()},
    {key: Math.random()}];

  var done = false;
  var results, keys;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertArrayEquals('keys', [1, 2, 3], keys);
      assertArrayEquals('values', values, results);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(arr, values).addCallbacks(function(value) {
    console.log('receiving value callback: ' + value);
    keys = value;
    db.values(arr).addCallbacks(function(x) {
      console.log(x);
      results = x;
      done = true;
    }, function(e) {
      throw e;
    });
  }, function(e) {
    throw e;
  });
};



var test_get_offline = function() {
  var db_name = 'test_22_get_offline';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var key = Math.ceil(Math.random() * 1000);
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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  db.put(table_name_offline, value, key).addBoth(function(k) {
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.get(table_name_offline, key).addBoth(function(value) {
      //console.log('receiving value callback.');
      result = value;
      done = true;
    });
  });

  db.close();
};



var test_list_by_ids = function() {
  var db_name = 'test_crud_23 _2';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr = [];
  var n = ydn.db.crud.req.IndexedDb.REQ_PER_TX * 2.5;
  for (var i = 0; i < n; i++) {
    arr.push({id: i, value: 'a' + Math.random()});
  }
  var ids = [2,
    ydn.db.crud.req.IndexedDb.REQ_PER_TX,
    ydn.db.crud.req.IndexedDb.REQ_PER_TX + 1,
    2 * ydn.db.crud.req.IndexedDb.REQ_PER_TX + 1];


  var hasEventFired = false;
  var results;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('length', ids.length, results.length);

      for (var i = 0; i < ids.length; i++) {
        assertObjectEquals('of ' + i, arr[ids[i]], results[i]);
      }

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, arr).addBoth(function(x) {
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.values(table_name, ids).addBoth(function(value) {
      //console.log('receiving value callback.');
      results = value;
      hasEventFired = true;
    });
  });

  db.close();
};


var test_count_store = function() {

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.count(store_1).addBoth(function(value) {
    //console.log('receiving value callback.');
    count = value;
    done = true;
  });
};


var test_clear_store = function() {
  var db_name = 'test_40_clear_store';
  var schema = {
    stores: [{
      name: table_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}]
  );

  var done = false;
  var put_value;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      // clear success do not return any result and hence 'undefined'.
      //console.log('cleared');
      assertEquals('store cleared', 1, put_value);
      assertEquals('count in store', 0, count);
    },
    100, // interval
    1000); // maxTimeout

  // note, without this, preivous put and next clear method will go into
  // same transaction and will cause clearing the database happen
  // before inserting is complete.
  db.count(table_name).addBoth(function(value) {

  });

  var dfl = db.clear(table_name);
  dfl.addBoth(function(value) {
    put_value = value;
    done = true;
  });

  var count, recount;
  var countDone;
  waitForCondition(
    // Condition
    function() { return countDone; },
    // Continuation
    function() {
      assertEquals('count 0 after clear', 0, count);
      assertEquals('recount 0 after clear', 0, recount);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.count(table_name).addBoth(function(value) {
    count = value;
    db.close();
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.count(table_name).addBoth(function(value) {
      recount = value;
      countDone = true;
    });
  });

};


var test_remove_by_id = function() {
  var db_name = 'test_41_remove_by_key';
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear(table_name);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
  );

  var hasEventFired = false;
  var delCount, count;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('remove result', 1, delCount);
      assertEquals('count', 3, count);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.remove(table_name, 1).addBoth(function(value) {

    delCount = value;
    db.count(table_name).addBoth(function(x) {
      count = x;
      hasEventFired = true;
    });
  });

};


var test_remove_by_key = function() {
  var db_name = 'test_remove_by_key';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var ids = [Math.random(), Math.random(), Math.random()];
  var objs = [];

  for (var i = 0; i < ids.length; i++) {
    objs[i] = {id: ids[i]};
  }

  var done = false;
  var delCount, keys_before, keys_after;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertEquals('3 keys before', 3, keys_before.length);
        assertEquals('delete count', 1, delCount);
        assertEquals('2 keys after', 2, keys_after.length);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  db.clear('st').addBoth(function(x) {
    //console.log('cleared');
  });
  db.put('st', objs).addBoth(function(x) {
    // console.log(x);
  });
  db.keys('st').addBoth(function(x) {
    keys_before = x;
  });
  db.remove(new ydn.db.Key('st', ids[1])).addBoth(function(x) {
    delCount = x;
  });
  db.keys('st').addBoth(function(x) {
    keys_after = x;
    done = true;
  });
};


var test_remove_by_key_array = function() {
  // ydn.db.crud.req.IndexedDb.DEBUG = true;
  var db_name = 'test_41_remove_by_key_array';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var ids = [Math.random(), Math.random(), Math.random()];
  var objs = [];
  var keys = [];
  for (var i = 0; i < ids.length; i++) {
    objs[i] = {id: ids[i]};
    keys[i] = new ydn.db.Key('st', ids[i]);
  }

  var done = false;
  var delCount, keys_before, keys_after;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertEquals('3 keys before', 3, keys_before.length);
        assertEquals('delete count', 3, delCount);
        assertEquals('0 keys after', 0, keys_after.length);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  db.clear('st');
  db.put('st', objs);
  db.keys('st').addBoth(function(x) {
    keys_before = x;
  });
  db.remove(keys).addBoth(function(x) {
    delCount = x;
  });
  db.keys('st').addBoth(function(x) {
    keys_after = x;
    done = true;
  });
};


var test_remove_by_key_range = function() {
  var db_name = 'test_42_remove_by_key_range';


  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear(table_name);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
  );

  var hasEventFired = false;
  var countValue;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('remove result', 3, countValue);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.count(table_name); // break tx merge.
  db.remove(table_name, ydn.db.KeyRange.lowerBound(2)).addCallback(function(value) {
    countValue = value;
    hasEventFired = true;
  });

};


var test_clear_by_key_range = function() {
  //ydn.db.con.simple.Store.DEBUG = true;
  var db_name = 'test_43_clear_by_key_range';
  var schema = {
    stores: [{
      name: table_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear(table_name);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
  );

  var done = false;
  var count, countValue, recountValue;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('before clear', 4, count);
      assertEquals('clear result', 1, countValue);
      assertEquals('clear result after reconnection', 1, recountValue);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.count(table_name).addBoth(function(x) {
    count = x;
  });
  db.clear(table_name, ydn.db.KeyRange.lowerBound(2)).addBoth(function(value) {
    db.count(table_name).addBoth(function(value) {

      countValue = value;

      db.close();
      db = new ydn.db.crud.Storage(db_name, schema, options);
      db.count(table_name).addBoth(function(value) {
        recountValue = value;
        done = true;
      });

    });
  });

};



var tearDownPage = function() {

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



