
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
  ydn.debug.log('ydn.db', 'finest');
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

var test_add = function() {
  var db_name = 'test_add';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

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

var test_load_data = function() {
  var db_name = 'test_load_data';
  if (options.mechanisms != ['indexeddb']) {
    reachedFinalContinuation = true;
    return;
  }

  var db = new ydn.db.crud.Storage(db_name, schema, options);

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
  db.load(load_store_name, text).addBoth(function(value) {
    //console.log(value);
    keys = value;
    hasEventFired = true;

  });
};




var test_put_array = function() {
  var db_name = 'test_13';
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
    //console.log('receiving value callback.');
    results = value;
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



var test_put_array_unique_constraint = function() {
  var db_name = 'test_12_put_array_unique_constraint-4';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [
        {
          keyPath: 'type',
          unique: true,
          type: 'INTEGER'
        }]
    }]
  };
  var data1 = [{
    id: 1,
    type: 1,
    value: 'a'
  }, {
    id: 2,
    type: 2,
    value: 'b'
  }];
  var data2 = [{
    id: 1, // void unique constraint
    type: 3,
    value: 'c'
  }, {
    id: 4,
    type: 4,
    value: 'd'
  }];

  // console.log(data);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var hasEventFired = false;
  var results1, results2, is_success;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('correct length for results1', 2, results1.length);
        assertEquals('correct length for results2', 2, results2.length);
        assertArrayEquals('results1', [1, 2], results1);
        assertEquals('results2 last', 4, results2[1]);
        assertFalse('has error', is_success);
        assertEquals('error record', 'ConstraintError', results2[0].name);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.clear('st');
  db.add('st', data1).addCallbacks(function(x) {
    // console.log(x);
    results1 = x;
  }, function(value) {
    // console.log(value);
    results1 = value;
  });
  db.add('st', data2).addCallbacks(function(x) {
    // console.log(x);
    is_success = true;
    results2 = x;
    hasEventFired = true;
  }, function(value) {
    // console.log(value);
    is_success = false;
    results2 = value;
    hasEventFired = true;
  });
};



var test_put_array_unique_index_constraint = function() {

  // Chrome bug report
  // https://code.google.com/p/chromium/issues/detail?id=258273

  var db_name = 'test_12_put_array_unique_index_constraint-4';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [
        {
          keyPath: 'type',
          unique: true,
          type: 'INTEGER'
        }]
    }]
  };
  var data1 = [{
    id: 1,
    type: 1,
    value: 'a'
  }, {
    id: 2,
    type: 2,
    value: 'b'
  }];
  var data2 = [{
    id: 3,
    type: 1, // void unique constraint
    value: 'c'
  }, {
    id: 4,
    type: 4,
    value: 'd'
  }];

  // console.log(data);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var hasEventFired = false;
  var results1, results2, keys, is_success;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        db.getSchema(function(s) {
          console.log(s);
        });
        assertEquals('correct length for results1', 2, results1.length);
        assertEquals('correct length for results2', 2, results2.length);
        assertArrayEquals('results1', [1, 2], results1);
        assertFalse('has error', is_success);
        assertArrayEquals('keys', [1, 2, 4], keys);
        assertEquals('results2 last', 4, results2[1]);
        assertEquals('error record', 'ConstraintError', results2[0].name);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.clear('st');
  db.put('st', data1).addCallbacks(function(x) {
    // console.log(x);
    results1 = x;
  }, function(value) {
    // console.log(value);
    results1 = value;
  });
  db.put('st', data2).addCallbacks(function(x) {
    console.log(x);
    is_success = true;
    results2 = x;
  }, function(value) {
    console.log(value);
    is_success = false;
    results2 = value;
  });
  db.keys('st').addBoth(function(x) {
    keys = x;
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


var _test_put_large_array = function() {
  var db_name = 'test_crud_ 13_2';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

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


  db.put(table_name, arr).addBoth(function(value) {
    console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  });
};


var test_get_inline = function() {
  var db_name = 'test_21_get_inline';
  var schema = {
    stores: [{
      name: table_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var key = Math.ceil(Math.random() * 10000);
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


  db.put(table_name, value).addBoth(function(k) {
    // console.log('key: ' + k);
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.get(table_name, key).addBoth(function(value) {
      // console.log([key, value])
      result = value;
      done = true;
    });
  });

  db.close();

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


var test_list = function() {
  var db_name = 'test_crud_26_1';
  var stores = [new ydn.db.schema.Store(table_name, 'id', false,
    ydn.db.schema.DataType.NUMERIC)];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

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


  db.put(table_name, data).addCallbacks(function(x) {
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.values(table_name).addCallbacks(function(value) {
      // console.log('receiving value callback.');
      whole_result = value;
      whole_done = true;
    }, function(e) {
      throw e;
    });

    db.values(table_name, [1, 2]).addCallbacks(function(value) {
      //console.log('receiving value callback.');
      array_result = value;
      array_done = true;
    }, function(e) {
      throw e;
    });

    db.values(table_name, null, 3).addCallbacks(function(value) {
      //console.log('receiving value callback.');
      limit_result = value;
      limit_done = true;
    }, function(e) {
      throw e;
    });

    db.values(table_name, null, 2, 1).addCallbacks(function(value) {
      //console.log('receiving value callback.');
      offset_result = value;
      offset_done = true;
    }, function(e) {
      throw e;
    });

  }, function(e) {
    throw e;
  });


};


var _test_get_large_array = function() {
  var db_name = 'test_crud_23 _2';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

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

  db.values(table_name, ids).addBoth(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  });
};


var test_get_all_no_data = function() {

  var db_name = 'test_get_all_2';
  var table_name = 'no_data_table';

  var stores = [new ydn.db.schema.Store(table_name, 'id')];
  var schema = new ydn.db.schema.Database(1, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

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

  db.values(table_name).addBoth(function(value) {
    //console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_get_none_exist = function() {
  var db_name = 'test_25_get_none_exist';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

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


  db.get(table_name, 'no_data').addBoth(function(value) {
    // console.log(value);
    put_value = value;
    hasEventFired = true;
  });
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



var test_count_stores = function() {

  var db_name = 'test_32_count_stores';

  var store_inline = 'ts';    // in-line key store
  var store_inline_string = 'tss';    // in-line key store
  var store_outline = 'ts2'; // out-of-line key store
  var store_outline_string = 'ts2s'; // out-of-line key store
  var store_inline_auto = 'ts3'; // in-line key + auto
  var store_outline_auto = 'ts4'; // out-of-line key + auto
  var store_nested_key = 'ts5'; // nested keyPath
  var store_inline_index = 'ts6';    // in-line key store

  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id',
        type: 'NUMERIC'},
      {
        name: store_inline_string,
        keyPath: 'id',
        type: 'TEXT'},
      {
        name: store_outline,
        type: 'NUMERIC'},
      {
        name: store_outline_string,
        type: 'TEXT'},
      {
        name: store_nested_key,
        keyPath: 'id.$t', // gdata style key.
        type: 'TEXT'}
    ]
  };

  var _db = new ydn.db.crud.Storage(db_name, schema_1, options);
  _db.clear();
  var data = [];
  var data2 = [];
  for (var i = 0; i < 5; i++) {
    data[i] = {id: i, value: 'test' + Math.random()};
  }
  var keys = [];
  for (var i = 0; i < 3; i++) {
    keys[i] = i;
    data2[i] = {type: 'offline', value: 'test' + Math.random()};
  }

  var done = false;
  var count, type;
  _db.put(store_outline, data2, keys);
  _db.put(store_inline, data);
  _db.count(store_inline).addBoth(function() {
    type = _db.getType();
    var db = new ydn.db.crud.Storage(db_name, schema_1, options);

    db.count([store_inline, store_outline]).addBoth(function(value) {
      //console.log('receiving value callback.');
      count = value;
      done = true;
      db.close();
    });
  });
  _db.close();

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('store_inline', 5, count[0]);
      assertEquals('store_outline', 3, count[1]);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, type);
    },
    100, // interval
    2000); // maxTimeout

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


var test_array_key = function() {
  var db_name = 'test_51_array_key_1';

  var stores = [new ydn.db.schema.Store(table_name, 'id')];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var key = ['a', 'b'];

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
      assertArrayEquals('put a', key, a_value);

      var b_done;
      var b_value;
      waitForCondition(
        // Condition
        function() {
          return b_done;
        },
        // Continuation
        function() {
          assertEquals('get ' + JSON.stringify(key), key_value, b_value.value);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        },
        100, // interval
        2000); // maxTimeout


      db.get(table_name, key).addBoth(function(value) {
        //console.log(db + ' receiving get value callback ' + key + ' = ' + value);
        b_value = value;
        b_done = true;
      });
    },
    100, // interval
    2000); // maxTimeout

  db.put(table_name, {id: key, value: key_value}).addBoth(function(value) {
    // console.log(db + ' receiving put value callback for ' + key + ' = ' + key_value);
    a_value = value;
    a_done = true;
  });


};



var test_fetch_keys = function() {
  var store_name = 'st';
  var db_name = 'test_crud_52_4';

  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      indexes: [{
        name: 'value'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: 'qs1', value: Math.random()},
    {id: 'at2', value: Math.random()},
    {id: 'bs2', value: Math.random()},
    {id: 'st', value: Math.random()}
  ];

  var put_value_received, results;
  var put_done, get_done;
  waitForCondition(
      // Condition
      function() {
        return put_done && get_done;
      },
      // Continuation
      function() {


        assertEquals('obj length', keys.length, results.length);
        assertObjectEquals('get 0', objs[1], results[0]);
        assertObjectEquals('get 1', objs[2], results[1]);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();

      },
      100, // interval
      2000); // maxTimeout


  db.put(store_name, objs).addBoth(function(value) {
    //console.log(['receiving value callback.', value]);
    put_value_received = value;
    put_done = true;
  });

  var keys = [
    new ydn.db.Key(store_name, objs[1].id),
    new ydn.db.Key(store_name, objs[2].id)];
  db.values(keys).addBoth(function(value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    results = value;

    get_done = true;
  });

};



var test_keys = function() {
  var db_name = 'test_51_keys_1';
  var stores = [new ydn.db.schema.Store(table_name, 'id', false,
    ydn.db.schema.DataType.NUMERIC)];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var keys = [0, 1, 2, 3];
  var data = goog.array.map(keys, function(x) {return {id: x, msg: 'msg' + Math.random()};});
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

    db.keys(table_name).addBoth(function(value) {
      //console.log('whole value callback.');
      whole_result = value;
      whole_done = true;
    }).addErrback(function(e) {
        whole_done = true;
        console.log('Error: ' + e);
      });

    db.keys(table_name, null, 3).addBoth(function(value) {
      //console.log('limit value callback.');
      limit_result = value;
      limit_done = true;
    });
    db.keys(table_name, null, 2, 1).addBoth(function(value) {
      //console.log('limit offset value callback.');
      offset_result = value;
      offset_done = true;
    });


};


var test_fetch_keys = function() {
  var store_name1 = 'st1';
  var store_name2 = 'st2';
  var db_name = 'test_crud_53_8';
  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.NUMERIC, true);
  var store_schema1 = new ydn.db.schema.Store(store_name1, 'id', false, ydn.db.schema.DataType.TEXT, [indexSchema]);
  var store_schema2 = new ydn.db.schema.Store(store_name2, 'id', false, ydn.db.schema.DataType.TEXT);
  var schema = new ydn.db.schema.Database(1, [store_schema1, store_schema2]);
  var db = new ydn.db.crud.Storage(db_name, schema, options);


  var objs1 = [];
  var n = ydn.db.crud.req.IndexedDb.REQ_PER_TX * 2.5;
  for (var i = 0; i < n; i++) {
    objs1.push({id: 'a' + i, value: Math.random()});
  }

  var objs2 = [];
  for (var i = 0; i < n; i++) {
    objs2.push({id: 'b' + i, value: Math.random()});
  }
  var ids = [2,
    ydn.db.crud.req.IndexedDb.REQ_PER_TX,
    ydn.db.crud.req.IndexedDb.REQ_PER_TX + 1,
    2 * ydn.db.crud.req.IndexedDb.REQ_PER_TX + 1];
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
    function() {
      return put1_done && put2_done;
    },
    // Continuation
    function() {

      var get_done, results;
      waitForCondition(
        // Condition
        function() {
          return get_done;
        },
        // Continuation
        function() {
          assertEquals('length', ids.length * 2, results.length);
          for (var i = 0; i < ids.length; i++) {
            assertEquals(i + '. ' + store_name1 + ': ' + keys[i].id,
              objs1[ids[i]].value, results[i].value);
          }
          for (var i = 0; i < ids.length; i++) {
            assertEquals(i + '. ' + store_name2 + ': ' + keys[i + ids.length].id,
              objs2[ids[i]].value, results[i + ids.length].value);
          }

          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        },
        100, // interval
        2000); // maxTimeout

      db.values(keys).addBoth(function(value) {
        //console.log('fetch value: ' + JSON.stringify(value));
        results = value;
        get_done = true;
      });

    },
    100, // interval
    2000); // maxTimeout

  db.put(store_name1, objs1).addBoth(function(value) {
    //console.log(['receiving value callback.', value]);
    put1_done = true;
  });
  db.put(store_name2, objs2).addBoth(function(value) {
    //console.log(['receiving value callback.', value]);
    put2_done = true;
  });

};


var test_constrained_error = function() {
  var db_name = 'test_constrained_error' + Math.random();
  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: 'id',
        type: 'TEXT'
      }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  var obj = {id: 1, value: 'v' + Math.random()};

  var done, result, result2;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('key', 1, result);
      assertNotNullNorUndefined('is an error', result2);
      if (options.mechanisms[0] == 'websql') {
        assertEquals('is an ConstraintError', 6, result2.code);
      } else {
        assertEquals('is an ConstraintError', 'ConstraintError', result2.name);
      }

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.add('st', obj).addBoth(function(k) {
    result = k;
  });
  db.add('st', obj).addBoth(function(x) {
    result2 = x;
    done = true;
  });
};


var tearDownPage = function() {

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



