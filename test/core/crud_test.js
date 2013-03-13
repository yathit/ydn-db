
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.core.Storage');
goog.require('ydn.debug');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, debug_console, db, objs;

var db_name = 'test_crud_4';
var table_name = 'st_inline';
var table_name_offline = 'st_offline';
var store_name_inline_number = 'st_inline_n';
var load_store_name = 'st_load';


var setUp = function () {
  //ydn.debug.log('ydn.db', 'finest');

  var indexes = [new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT)];
  var stores = [new ydn.db.schema.Store(table_name, 'id'),
    new ydn.db.schema.Store(store_name_inline_number, 'id', false, ydn.db.schema.DataType.NUMERIC, undefined, true),
    new ydn.db.schema.Store(table_name_offline),
    new ydn.db.schema.Store(load_store_name, 'id', false, ydn.db.schema.DataType.NUMERIC, indexes)
  ];
  schema = new ydn.db.schema.Database(undefined, stores);


};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var test_add = function() {

  var db = new ydn.db.core.Storage(db_name, schema, options);

  var hasEventFired = false;
  var put_value;
  var key = Math.random();

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('add a', key, put_value);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;

      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.add(store_name_inline_number, {id: key, value: '1', remark: 'put test'}).addCallback(function(value) {
    //console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};


var test_add_fail = function() {

  var db = new ydn.db.core.Storage(db_name, schema, options);

  var hasEventFired = false;
  var put_value, add_ev;
  var key = Math.random();

  waitForCondition(
    // Condition
    function () {
      return hasEventFired;
    },
    // Continuation
    function () {
      assertEquals('add a', key, put_value);
      hasEventFired = false;

      waitForCondition(
        // Condition
        function () {
          return hasEventFired;

        },
        // Continuation
        function () {
          assertNull('add a again', put_value);
          assertNotNull('error event', add_ev);
          if (db.getType() == 'indexeddb') {
            assertEquals('add fail with constrained error', 'ConstraintError', add_ev.target.error.name);
          } else if (db.getType() == 'websql') {
            assertEquals('add fail with constrained error', 6, add_ev.code);
          }

          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();

        },
        100, // interval
        1000); // maxTimeout

      db.add(store_name_inline_number, {id: key, value: '2', remark: 'add test'}).addCallback(function (value) {
        //console.log('receiving value callback ' + value);
        put_value = value;
        hasEventFired = true;
      }).addErrback(function (e) {
          put_value = null;
          add_ev = e;
          hasEventFired = true;
          console.log(e);
        });
    },
    100, // interval
    1000); // maxTimeout


  db.add(store_name_inline_number, {id: key, value: '1', remark: 'add test'}).addCallback(function(value) {
    //console.log('receiving value callback ' + value);
    put_value = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};



var test_11_put = function() {

  var db = new ydn.db.core.Storage(db_name, schema, options);

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


  db.put(table_name, {id: 'a', value: '1', remark: 'put test'}).addCallback(function(value) {
    //console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};

var test_load_data = function() {

  if (options.mechanisms != ['indexeddb']) {
    reachedFinalContinuation = true;
    return;
  }

  var db = new ydn.db.core.Storage(db_name, schema, options);

  var data = [
    {id: 1, tag: 'a', remark: 'put test'},
    {id: 2, tag: 'b', remark: 'put test'}
  ];
  var text = 'id,tag,remark\n1,a,put test\n2,b,put test';

  var hasEventFired = false;
  var keys, result;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertArrayEquals('load text', [1, 2], keys);
      hasEventFired = false;
      waitForCondition(
        // Condition
        function() { return hasEventFired; },
        // Continuation
        function() {
          assertArrayEquals('get data back', data, result);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        },
        100, // interval
        2000); // maxTimeout

      db.values(load_store_name, keys).addBoth(function(x) {
        result = x;
        hasEventFired = true;
      });
    },
    100, // interval
    2000); // maxTimeout

  db.clear();
  db.load(load_store_name, text).addCallback(function(value) {
    //console.log(value);
    keys = value;
    hasEventFired = true;

  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};




var test_12_put_array = function() {
  var db_name = 'test_13';
  var db = new ydn.db.core.Storage(db_name, schema, options);

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
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



var test_12_put_array_key = function() {
  var db_name = 'test_13';
  var db = new ydn.db.core.Storage(db_name, schema, options);

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
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


var test_13_put_key = function() {
  var db_name = 'test_crud_ 13_2';
  var db = new ydn.db.core.Storage(db_name, schema, options);

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
    2000); // maxTimeout


  db.put(key, value).addBoth(function(x) {
    console.log('receiving value callback.');
    keys = x;
    db.get(key).addBoth(function(x) {
      results = x;
      done = true;
    })
  });
};


var test_13_put_array_by_keys = function() {
  var db_name = 'test_crud_ 13_2';
  var db = new ydn.db.core.Storage(db_name, schema, options);

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


  db.put(arr, values).addBoth(function(value) {
    //console.log('receiving value callback.');
    keys = value;
    db.values(arr).addBoth(function(x) {
      console.log(x);
      results = x;
      done = true;
    })
  });
};


var test_14_put_large_array = function() {
  var db_name = 'test_crud_ 13_2';
  var db = new ydn.db.core.Storage(db_name, schema, options);

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
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
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
  var db = new ydn.db.core.Storage(db_name, schema, options);

  var key = Math.ceil(Math.random()*10000);
  var value = {id: key, value: 'a' + Math.random()};

  var done = false;
  var result;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertObjectEquals('value', value, result);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, value).addCallback(function(k) {
    console.log('key: ' + k);
  });

  db.get(table_name, key).addCallback(function(value) {
    console.log([key, value])
    result = value;
    done = true;
  }).addErrback(function(e) {
      done = true;
      console.log('Error: ' + e);
    });
};


var test_22_get_offline = function() {
  var db_name = 'test_crud_21_2';
  var db = new ydn.db.core.Storage(db_name, schema, options);

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
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



var test_24_list_by_ids = function() {
  var db_name = 'test_crud_23 _2';
  var db = new ydn.db.core.Storage(db_name, schema, options);

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
        assertObjectEquals('of ' + i, arr[ids[i]], results[i]);
      }

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, arr);

  db.values(table_name, ids).addCallback(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};


var test_26_list = function() {
  var db_name = 'test_crud_26_1';
  var stores = [new ydn.db.schema.Store(table_name, 'id', false,
    ydn.db.schema.DataType.NUMERIC)];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  var data = [
    {id: 0, value: 'a' + Math.random()},
    {id: 1, value: 'a' + Math.random()},
    {id: 2, value: 'a' + Math.random()},
    {id: 3, value: 'a' + Math.random()}
  ];
  //var rev_data = ydn.object.clone(data).reverse();


  var whole_done, array_done, limit_done, offset_done;
  var whole_result, array_result, limit_result, offset_result;

  waitForCondition(
    // Condition
    function() { return whole_done && array_done && limit_done && offset_done; },
    // Continuation
    function() {
      assertArrayEquals('whole store', data, whole_result);
      assertArrayEquals('array keys', data.slice(1, 3), array_result);
      assertArrayEquals('limit store', data.slice(0, 3), limit_result);
      assertArrayEquals('offset store', data.slice(1, 3), offset_result);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.put(table_name, data);

  db.values(table_name).addCallback(function(value) {
    //console.log('receiving value callback.');
    whole_result = value;
    whole_done = true;
  }).addErrback(function(e) {
      whole_done = true;
      console.log('Error: ' + e);
    });

  db.values(table_name, [1, 2]).addBoth(function(value) {
    //console.log('receiving value callback.');
    array_result = value;
    array_done = true;
  });

  db.values(table_name, null, 3).addBoth(function(value) {
    //console.log('receiving value callback.');
    limit_result = value;
    limit_done = true;
  });
  db.values(table_name, null, 2, 1).addCallback(function(value) {
    //console.log('receiving value callback.');
    offset_result = value;
    offset_done = true;
  }).addErrback(function(e) {
      offset_done = true;
      console.log('Error: ' + e);
    });
};


var _test_25_get_large_array = function() {
  var db_name = 'test_crud_23 _2';
  var db = new ydn.db.core.Storage(db_name, schema, options);

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
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, arr);

  db.values(table_name, ids).addCallback(function(value) {
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
  var db = new ydn.db.core.Storage(db_name, schema, options);

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  db.values(table_name).addCallback(function(value) {
    //console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_25_get_none_exist = function() {

  var db = new ydn.db.core.Storage(db_name, schema, options);

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
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
  var db = new ydn.db.core.Storage(db_name, schema, options);

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


  db.count(store_1).addCallback(function(value) {
    //console.log('receiving value callback.');
    count = value;
    done = true;
  });
};


var test_40_clear_store = function() {
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}]
  );

  var hasEventFired = false;
  var put_value;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      // clear success do not return any result and hence 'undefined'.
      //console.log('cleared');
      assertEquals('clear result', 1, put_value);
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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.count(table_name).addCallback(function(value) {
    countValue = value;
    countDone = true;
  });

};


var test_41_remove_by_key = function() {
  var db = new ydn.db.core.Storage(db_name, schema, options);
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
    db.count(table_name).addBoth(function (x) {
      count = x;
      hasEventFired = true;
    });
  });

};


var test_42_remove_by_key_range = function() {
  var db = new ydn.db.core.Storage(db_name, schema, options);
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

  db.remove(table_name, ydn.db.KeyRange.lowerBound(2)).addCallback(function(value) {
    countValue = value;
    hasEventFired = true;
  });

};


var test_43_clear_by_key_range = function() {
  var db = new ydn.db.core.Storage(db_name, schema, options);
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
      assertEquals('clear result', 1, countValue);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.clear(table_name, ydn.db.KeyRange.lowerBound(2)).addBoth(function(value) {
    db.count(table_name).addBoth(function (value) {

      countValue = value;
      hasEventFired = true;
    });
  });

};


var test_51_array_key = function() {
  var db_name = 'test_51_array_key_1';

  var stores = [new ydn.db.schema.Store(table_name, 'id', false, ['TEXT', 'TEXT'])];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  var key = ['a', 'b'];

  //console.log('testing ' + key);
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
      assertArrayEquals('put a', key, a_value);

      var b_done;
      var b_value;
      waitForCondition(
        // Condition
        function () {
          return b_done;
        },
        // Continuation
        function () {
          assertEquals('get ' + JSON.stringify(key), key_value, b_value.value);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        },
        100, // interval
        2000); // maxTimeout


      db.get(table_name, key).addCallback(function (value) {
        console.log(db + ' receiving get value callback ' + key + ' = ' + value);
        b_value = value;
        b_done = true;
      });
    },
    100, // interval
    2000); // maxTimeout

  db.put(table_name, {id: key, value: key_value}).addCallback(function (value) {
    //console.log(db + ' receiving put value callback for ' + key + ' = ' + key_value);
    a_value = value;
    a_done = true;
  });


};



var test_52_fetch_keys = function () {
  var store_name = 'st';
  var db_name = 'test_crud_52_3';
  var indexSchema = new ydn.db.schema.Index('value', undefined, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.TEXT, [indexSchema]);
  var schema = new ydn.db.schema.Database(1, [store_schema]);
  var db = new ydn.db.core.Storage(db_name, schema, options);

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
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        },
        100, // interval
        2000); // maxTimeout

      var keys = [
        new ydn.db.Key(store_name, objs[1].id),
        new ydn.db.Key(store_name, objs[2].id)];
      db.values(keys).addCallback(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        put_value_received = value;

        get_done = true;
      });

    },
    100, // interval
    2000); // maxTimeout


  db.put(store_name, objs).addCallback(function (value) {
    //console.log(['receiving value callback.', value]);
    put_value_received = value;
    put_done = true;
  });

};



var test_51_keys = function() {
  var db_name = 'test_51_keys_1';
  var stores = [new ydn.db.schema.Store(table_name, 'id', false,
    ydn.db.schema.DataType.NUMERIC)];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  var keys = [0, 1, 2, 3];
  var data = keys.map(function(x) {return {id: x};});
  //var rev_data = ydn.object.clone(data).reverse();


  var whole_done, limit_done, offset_done;
  var whole_result, limit_result, offset_result;

  waitForCondition(
    // Condition
    function() { return whole_done && limit_done && offset_done; },
    // Continuation
    function() {
      assertArrayEquals('whole store', keys, whole_result);
      assertArrayEquals('limit store', keys.slice(0, 3), limit_result);
      assertArrayEquals('offset store', keys.slice(1, 3), offset_result);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.put(table_name, data);

    db.keys(table_name).addCallback(function(value) {
      //console.log('whole value callback.');
      whole_result = value;
      whole_done = true;
    }).addErrback(function(e) {
        whole_done = true;
        console.log('Error: ' + e);
      });

    db.keys(table_name, null, 3).addCallback(function(value) {
      //console.log('limit value callback.');
      limit_result = value;
      limit_done = true;
    }).addErrback(function(e) {
        limit_done = true;
        console.log('Error: ' + e);
      });
    db.keys(table_name, null, 2, 1).addCallback(function(value) {
      console.log('limit offset value callback.');
      offset_result = value;
      offset_done = true;
    }).addErrback(function(e) {
        offset_done = true;
        console.log('Error: ' + e);
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
  var db = new ydn.db.core.Storage(db_name, schema, options);


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
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        },
        100, // interval
        2000); // maxTimeout

      db.values(keys).addCallback(function (value) {
        //console.log('fetch value: ' + JSON.stringify(value));
        results = value;
        get_done = true;
      });

    },
    100, // interval
    2000); // maxTimeout

  db.put(store_name1, objs1).addCallback(function (value) {
    //console.log(['receiving value callback.', value]);
    put1_done = true;
  });
  db.put(store_name2, objs2).addCallback(function (value) {
    //console.log(['receiving value callback.', value]);
    put2_done = true;
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



