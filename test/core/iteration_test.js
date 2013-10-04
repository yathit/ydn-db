
goog.require('ydn.db.algo.NestedLoop');
goog.require('goog.testing.jsunit');
goog.require('ydn.debug');
goog.require('ydn.db.core.Storage');



var reachedFinalContinuation, schema, db, objs, animals;
var store_name = 't1';
var db_name = 'test_iteration_1';

var obj_schema = {
  stores: [
    {
      name: store_name,
      keyPath: 'id',
      type: 'TEXT',
      indexes: [{
        name: 'tag',
        type: 'TEXT',
        multiEntry: true
      }, {
        name: 'value',
        type: 'NUMERIC'
      }, {
        name: 'x',
        type: 'NUMERIC'
      }]
    }
  ]
};

var setUp = function() {

  // ydn.debug.log('ydn.db.crud', 'finest');
  // ydn.debug.log('ydn.db.core', 'finest');
  //ydn.db.core.req.IDBCursor.DEBUG = true;
  //ydn.db.Cursor.DEBUG = true;
  // ydn.db.core.DbOperator.DEBUG = true;

  objs = [
    {id:'qs0', value: 0, x: 1, tag: ['a', 'b']},
    {id:'qs1', value: 1, x: 2, tag: ['a']},
    {id:'at2', value: 2, x: 3, tag: ['a', 'b']},
    {id:'bs1', value: 3, x: 6, tag: ['b']},
    {id:'bs2', value: 4, x: 14, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, x: 111, tag: ['c']},
    {id:'st3', value: 6, x: 600}
  ];

  animals = [
    {id: 'rat', color: 'brown', horn: 0, legs: 4},
    {id: 'cow', color: 'spots', horn: 1, legs: 4},
    {id: 'galon', color: 'gold', horn: 1, legs: 2},
    {id: 'snake', color: 'spots', horn: 0, legs: 0},
    {id: 'chicken', color: 'red', horn: 0, legs: 2}
  ];

  reachedFinalContinuation = false;
};

var tearDown = function() {

  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



var load_default = function() {
  var indexSchema = new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT, false, true);
  var valueIndex = new ydn.db.schema.Index('value', ydn.db.schema.DataType.INTEGER, false, false);
  var xIndex = new ydn.db.schema.Index('x', ydn.db.schema.DataType.NUMERIC, false, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.TEXT, [valueIndex, indexSchema, xIndex]);

  var colorIndex = new ydn.db.schema.Index('color', ydn.db.schema.DataType.TEXT);
  var hornIndex = new ydn.db.schema.Index('horn', ydn.db.schema.DataType.TEXT);
  var legIndex = new ydn.db.schema.Index('legs', ydn.db.schema.DataType.TEXT);
  var anmialStore = new ydn.db.schema.Store('animals', 'id', false,
    ydn.db.schema.DataType.TEXT, [colorIndex, hornIndex, legIndex]);

  schema = new ydn.db.schema.Database(undefined, [store_schema, anmialStore]);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });


  db.put('animals', animals).addCallback(function (value) {
    console.log(db + 'store: animals ready.');
  });
  return db;
};


var test_scan_cursor_resume = function() {
  var done1, done2;
  var keys1, values1;
  var keys2 = [];
  var values2 = [];

  var data = [{
    id: 1,
    msg: Math.random()
  }, {
    id: 2,
    msg: Math.random()
  }, {
    id: 3,
    msg: Math.random()
  }];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      type: 'NUMERIC'
    }]
  };
  var db_name = 'test_cursor_resume-2';
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.put('st', data);
  var q = new ydn.db.ValueIterator('st');
  db.scan(function (keys, values) {
    keys1 = keys;
    values1 = values;
    done1 = true;
    return []; // break at first call
  }, [q]);

  db.scan(function (keys, values) {
    if (goog.isDefAndNotNull(keys[0])) {
      keys2.push(keys[0]);
      values2.push(values[0]);
    } else {
      done2 = true;
      return []; // break at first call
    }
  }, [q]);

  waitForCondition(
      // Condition
      function() {
        return done1;
      },
      function() {
        assertArrayEquals('keys1', [1], keys1);
        assertArrayEquals('values1', data.slice(0, 1), values1);
      },
      100, // interval
      1000); // maxTimeout


  waitForCondition(
      // Condition
      function() {
        return done2;
      },
      function() {
        assertArrayEquals('keys2', [2, 3], keys2);
        assertArrayEquals('values2', data.slice(1, 3), values2);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout
};


var test_scan_cursor_restart = function() {
  var done1;
  var keys1 = [];
  var values1 = [];

  var data = [{
    id: 1,
    msg: Math.random()
  }, {
    id: 2,
    msg: Math.random()
  }, {
    id: 3,
    msg: Math.random()
  }];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      type: 'NUMERIC'
    }]
  };
  var db_name = 'test_cursor_restart-1';
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.put('st', data);
  var q = new ydn.db.ValueIterator('st');
  var restarted = false;
  db.scan(function (keys, values) {
    keys1.push(keys[0]);
    values1.push(values[0]);
    if (!restarted) {
      restarted = true;
      return {'restart': [true]};
    } else {
      done1 = true;
      return []; // end
    }
  }, [q]);


  waitForCondition(
      // Condition
      function() {
        return done1;
      },
      function() {
        assertArrayEquals('keys1', [1, 1], keys1);
        assertArrayEquals('values1', [data[0], data[0]], values1);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

};

var test_scan_cursor_index_iter_resume = function() {
  var done1, done2;
  var keys1, values1;
  var keys2 = [];
  var values2 = [];

  var data = [{
    id: 1,
    tag: 'z',
    msg: Math.random()
  }, {
    id: 2,
    tag: 'x',
    msg: Math.random()
  }, {
    id: 3,
    tag: 'y',
    msg: Math.random()
  }];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      type: 'NUMERIC',
      indexes: [
        {
          name: 'tag',
          type: 'TEXT'
        }]
    }]
  };
  var db_name = 'test_cursor_resume-3';
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.put('st', data);
  var q = new ydn.db.IndexIterator('st', 'tag');
  db.scan(function (keys, values) {
    keys1 = keys;
    values1 = values;
    done1 = true;
    return []; // break at first call
  }, [q]);

  db.scan(function (keys, values) {
    if (goog.isDefAndNotNull(keys[0])) {
      keys2.push(keys[0]);
      values2.push(values[0]);
    } else {
      done2 = true;
      return []; // break at first call
    }
  }, [q]);

  waitForCondition(
      // Condition
      function() {
        return done1;
      },
      function() {
        assertArrayEquals('keys1', ['x'], keys1);
        assertArrayEquals('values1', [2], values1);
      },
      100, // interval
      1000); // maxTimeout


  waitForCondition(
      // Condition
      function() {
        return done2;
      },
      function() {
        assertArrayEquals('keys2', ['y', 'z'], keys2);
        assertArrayEquals('values2', [3, 1], values2);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout
};


var test_streamer_collect = function() {
  if (options.mechanisms[0] == 'websql') {
    // know issue.
    reachedFinalContinuation = true;
    return;
  }

  db = load_default();
  var done, result;

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      function () {
        assertArrayEquals('result', [objs[1], objs[4]], result);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  var streamer = new ydn.db.Streamer(db, store_name);

  db.addEventListener('ready', function() {  // to make sure
    streamer.push(objs[1].id);
    streamer.push(objs[4].id);
    streamer.collect(function(keys, x) {
      result = x;
      done = true;
    });
  });

};

var test_streamer_sink = function() {
  if (options.mechanisms[0] == 'websql') {
    // know issue.
    reachedFinalContinuation = true;
    return;
  }

  db = load_default();
  var done;
  var result = [];

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      function () {
        assertArrayEquals('result', [objs[1], objs[4]], result);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  var streamer = new ydn.db.Streamer(db, store_name);
  streamer.setSink(function(key, value) {
    result.push(value);
    if (result.length == 2) {
      done = true;
    }
  });

  db.addEventListener('ready', function() {  // to make sure
    streamer.push(objs[1].id);
    streamer.push(objs[4].id);
  });

};


var test_streamer_collect_index = function() {
  if (options.mechanisms[0] == 'websql') {
    // know issue.
    reachedFinalContinuation = true;
    return;
  }

  db = load_default();
  var done, result;
  var exp_result = [objs[1].x, objs[4].x];

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    function () {
      assertArrayEquals('result', exp_result, result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var streamer = new ydn.db.Streamer(db, store_name, 'x');

  db.addEventListener('ready', function() {  // to make sure
    streamer.push(objs[1].id);
    streamer.push(objs[4].id);
    streamer.collect(function(keys, x) {
      result = x;
      done = true;
    });
  });

};

var db_single_cnt = 0;
var scan_key_single_test = function (q, actual_keys, actual_index_keys) {

  var done;
  var streaming_keys = [];
  var streaming_values_keys = [];

  var db_name = 'scan_key_single_test_' + (db_single_cnt++);

  var db = new ydn.db.core.Storage(db_name, obj_schema, options);

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming keys', actual_keys, streaming_keys);
        //console.log([actual_index_keys, streaming_index_keys]);
        assertArrayEquals('streaming values', actual_index_keys, streaming_values_keys);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout


  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  var req = db.scan(function join_algo(keys, values) {
    //console.log(JSON.stringify([keys, values]));
    if (!goog.isDef(keys[0])) {
      return [];
    }

    streaming_keys.push(keys[0]);
    streaming_values_keys.push(values[0]);
    return [true]; // continue iteration
  }, [q]);

  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });

};

var test_scan_key_iterator = function () {

  var actual_keys = objs.map(function(x) {return x.id;});
  actual_keys.sort();
  var actual_index_keys = actual_keys;
  var q = new ydn.db.KeyIterator(store_name);
  scan_key_single_test(q, actual_keys, actual_index_keys);

};

var test_scan_value_iterator = function () {

  objs.sort(function(a, b) {
    return a.id > b.id ? 1 : -1;
  });
  var actual_keys = objs.map(function(x) {return x.id;});

  var q = new ydn.db.ValueIterator(store_name);
  scan_key_single_test(q, actual_keys, objs);

};

var test_scan_index_key_iterator = function () {

  objs.sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });
  var actual_keys = objs.map(function(x) {return x.value;});
  var actual_values = objs.map(function(x) {
    return x.id;
  });
  var q = new ydn.db.IndexIterator(store_name, 'value');
  scan_key_single_test(q, actual_keys, actual_values);

};


var test_scan_index_key_iterator_reverse = function () {

  objs.sort(function(a, b) {
    return a.value > b.value ? -1 : 1;
  });
  var actual_keys = objs.map(function(x) {return x.value;});
  var actual_index_keys = objs.map(function(x) {return x.id;});
  var q = new ydn.db.IndexIterator(store_name, 'value', null, true);

  scan_key_single_test(q, actual_keys, actual_index_keys);

};


var test_scan_key_dual = function () {

  var actual_keys = objs.map(function(x) {return x.id;});
  var actual_index_key_0 = objs.map(function(x) {return x.value;});
  var actual_index_key_1 = objs.map(function(x) {return x.x;});

  var done;
  var streaming_keys = [];
  var streaming_index_key_0 = [];
  var streaming_index_key_1 = [];

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('streaming key', actual_keys, streaming_keys);
      assertArrayEquals('streaming index 0', actual_index_key_0, streaming_index_key_0);
      assertArrayEquals('streaming index 1', actual_index_key_1, streaming_index_key_1);

      reachedFinalContinuation = true;

    },
    100, // interval
    1000); // maxTimeout

  var q1 = new ydn.db.IndexIterator(store_name, 'value');
  var q2 = new ydn.db.IndexIterator(store_name, 'x');

  db = load_default();
  var req = db.scan(function join_algo (keys, primary_keys) {
    // console.log(['receiving ', JSON.stringify(keys), JSON.stringify(primary_keys)]);
    if (goog.isDefAndNotNull(keys[0])) {
      streaming_keys.push(primary_keys[0]);
      streaming_index_key_0.push(keys[0]);
      streaming_index_key_1.push(keys[1]);
    }

    return [
      goog.isDefAndNotNull(keys[0]) ? true : undefined,
      goog.isDefAndNotNull(keys[1]) ? true : undefined]; // continue iteration
  }, [q1, q2]);

  req.addBoth(function (result) {
    //console.log(result);
    done = true;
  });

};



var test_map_key_iterator = function() {

  var done;
  var streaming_keys = [];

  // for key iterator, the reference value is sorted primary key.
  var q = new ydn.db.KeyIterator(store_name);
  var actual_keys = objs.map(function(x) {return x.id;});
  actual_keys.sort();

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming value', actual_keys, streaming_keys);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db = load_default();
  var req = db.map(q, function (key) {
    streaming_keys.push(key);
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


var test_map_value_iterator = function() {

  var done;
  var streaming_keys = [];

  // for value iterator, the reference value is record sorted by primary key.
  var actual_keys = objs;
  goog.array.sort(actual_keys, function(a, b) {
    return a.id > b.id ? 1 : -1;
  });
  var q = new ydn.db.ValueIterator(store_name);

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('values', actual_keys, streaming_keys);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db = load_default();
  var req = db.map(q, function (key) {
    streaming_keys.push(key);
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};

var test_map_index_key_iterator = function() {

  var done;
  var streaming_keys = [];

  // for index key iterator, the reference value is index key.
  var q = new ydn.db.IndexIterator(store_name, 'value');
  var actual_keys = objs.map(function(x) {return x.value;});

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming value', actual_keys, streaming_keys);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db = load_default();
  var req = db.map(q, function (key) {
    streaming_keys.push(key);
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


var test_map_index_value_iterator = function() {

  var done;
  var streaming_keys = [];

  // for index value iterator, the reference value is primary key.
  var actual_keys = objs.map(function(x) {return x.id;});
  var q = new ydn.db.IndexValueIterator(store_name, 'value');

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming key', actual_keys, streaming_keys);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db = load_default();
  var req = db.map(q, function (key) {
    streaming_keys.push(key);
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};



var test_open_value_iterator_update = function() {

  var objs = goog.array.range(4).map(function(i) {
    return {
      id: i,
      label: 'old-' + Math.random()
    };
  });
  var db_name = 'test_open_value_iterator-1';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var new_val = 'new-' + Math.random();
  var done, result, type;
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', objs).addBoth(function() {
    type = db.getType();
    //db.close();
    //var db2 = new ydn.db.core.Storage(db_name, schema, options);
    var iter = ydn.db.ValueIterator.where('st', '>=', 1, '<=', 2);
    var req = db.open(function(cursor) {
      var val = cursor.getValue();
      val.label = new_val;
      cursor.update(val);
    }, iter, 'readwrite');
    req.addBoth(function() {
      db.values('st').addBoth(function(x) {
        result = x;
        done = true;
        db.close();
      });
    });
  });

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        objs[1].label = new_val;
        objs[2].label = new_val;
        assertArrayEquals('updated result', objs, result);
        ydn.db.deleteDatabase(db_name, type);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout
};


var test_open_index_value_iterator = function() {

  var done;
  var streaming_keys = [];
  var streaming_eff_keys = [];
  var streaming_values = [];

  // for index value iterator, the reference value is primary key.
  var actual_values = objs.map(function(x) {return x});
  actual_values.sort(function(a, b) {
    return a > b ? 1 : -1;
  });
  var actual_keys = objs.map(function(x) {return x.id;});
  var actual_eff_keys = objs.map(function(x) {return x.value;});
  var q = new ydn.db.IndexValueIterator(store_name, 'value');

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('eff key', actual_eff_keys, streaming_eff_keys);
      assertArrayEquals('pri key', actual_keys, streaming_keys);
      assertArrayEquals('values', actual_values, streaming_values);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db = load_default();
  var req = db.open(function (cursor) {
    streaming_eff_keys.push(cursor.getKey());
    streaming_keys.push(cursor.getPrimaryKey());
    streaming_values.push(cursor.getValue());
  }, q);
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};
//
//var test_42_map_skip = function() {
//
//  var done;
//  var streaming_keys = [];
//
//  var actual_index_keys = [0, 4, 5, 6];
//  var q = new ydn.db.IndexIterator(store_name, 'value');
//
//  waitForCondition(
//      // Condition
//      function () {
//        return done;
//      },
//      // Continuation
//      function () {
//        assertArrayEquals('streaming index', actual_index_keys, streaming_keys);
//
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      1000); // maxTimeout
//
//  var start = 3;
//  db = load_default();
//  var req = db.map(q, function (key) {
//    streaming_keys.push(key);
//    if (key < 3) {
//      return 4;
//    }
//  });
//  req.addCallback(function (result) {
//    done = true;
//  });
//  req.addErrback(function (e) {
//    console.log(e);
//    done = true;
//  });
//};
//
//
//var test_43_map_stop = function() {
//
//  var done;
//  var streaming_keys = [];
//  var streaming_values = [];
//
//  var actual_index_keys = [0, 1, 2, 3];
//  var q = new ydn.db.IndexIterator(store_name, 'value');
//
//  waitForCondition(
//      // Condition
//      function () {
//        return done;
//      },
//      // Continuation
//      function () {
//        assertArrayEquals('streaming index', actual_index_keys, streaming_keys);
//
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      1000); // maxTimeout
//
//  var start = 3;
//  db = load_default();
//  var req = db.map(q, function (key) {
//    streaming_keys.push(key);
//    if (key >= 3) {
//      return null;
//    }
//  });
//  req.addCallback(function (result) {
//    done = true;
//  });
//  req.addErrback(function (e) {
//    console.log(e);
//    done = true;
//  });
//};



var test_reduce = function() {

  var done, result;

  var sum = objs.reduce(function(p, x) {
    return p + x.value;
  }, 0);

  var q = new ydn.db.Iterator(store_name, 'value');

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertEquals('sum', sum, result);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db = load_default();
  var req = db.reduce(q, function (prev, curr, index) {
    return prev + curr;
  }, 0);
  req.addCallback(function (x) {
    done = true;
    result = x;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};



var test_scan_cursor_resume = function() {

  var done;
  var values = [];
  var actual_values = [0, 1, 2, 3];
  var q = new ydn.db.IndexIterator(store_name, 'value');

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('first half values', actual_values, values);
        console.log('first half passed');

        done = false;
        values = [];
        actual_values = [4, 5, 6];

        waitForCondition(
            // Condition
            function () {
              return done;
            },
            // Continuation
            function () {
              assertArrayEquals('second half values', actual_values, values);

              reachedFinalContinuation = true;
            },
            100, // interval
            1000); // maxTimeout

        // pick up where letf off.
        var req = db.scan(function (keys, v) {
          if (goog.isDef(keys[0])) {
            values.push(keys[0]);
            return [true];
          } else {
            return [];
          }
        }, [q]);
        req.addCallback(function (result) {
          done = true;
        });
        req.addErrback(function (e) {
          console.log(e);
          done = true;
        });
      },
      100, // interval
      1000); // maxTimeout

  db = load_default();
  var req = db.scan(function (keys, v) {
    //console.log([keys, v]);
    if (goog.isDef(keys[0])) {
      values.push(keys[0]);
      // scan until value is 3.
      return [keys[0] < 3 ? true : undefined];
    } else {
      return [];
    }
  }, [q]);
  req.addCallback(function () {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};



var _test_join_primary = function() {
  var db_name = 'test_join_primary';
  var data = [
    {id: 0, a: 3, b: 'e'},
    {id: 1, a: 3, b: 'a'},
    {id: 2, a: 2, b: 'b'}, // result
    {id: 3, a: 2, b: 'c'},
    {id: 4, a: 2, b: 'b'}, // result
    {id: 5, a: 1, b: 'b'}
  ];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        name: 'a'
      }, {
        name: 'b'
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', data);
  var done;
  var keys1 = [];
  var values1 = [];

  waitForCondition(
      function() {
        return done;
      },
      function() {
        assertArrayEquals('keys', [2, 4], keys1);
        assertArrayEquals('values', [data[2], data[4]], values1);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var iter = new ydn.db.ValueIterator('st');
  iter = iter.join('st', 'a', 2);
  iter = iter.join('st', 'b', 'b');

  var req = db.open(function(cursor) {
    keys1.push(cursor.getPrimaryKey());
    values1.push(cursor.getValue());
  }, iter);
  req.addBoth(function(x) {
    done = true;
  });

};



var _test_join_index = function() {
  var db_name = 'test_join_index';
  var data = [
    {id: 0, a: 3, b: 'b'}, // result 3
    {id: 1, a: 3, b: 'a'},
    {id: 2, a: 2, b: 'b'}, // result 1
    {id: 3, a: 2, b: 'c'},
    {id: 4, a: 1, b: 'b'},
    {id: 5, a: 2, b: 'b'}, // result 2
    {id: 6, a: 4, b: 'b'}
  ];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        name: 'a'
      }, {
        name: 'b'
      }]
    }]
  };

  var iter = ydn.db.IndexValueIterator.where('st', 'a', '>=', 2, '<', 4);
  iter = iter.join('st', 'b', 'b');

  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', data);
  var done;
  var keys1 = [];
  var values1 = [];

  waitForCondition(
      function() {
        return done;
      },
      function() {
        assertArrayEquals('keys', [['b', 2], ['b', 5], ['b', [3]]], keys1);
        assertArrayEquals('values', [data[2], data[5], data[0]], values1);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout


  var req = db.open(function(cursor) {
    keys1.push(cursor.getPrimaryKey());
    values1.push(cursor.getValue());
  }, iter);
  req.addBoth(function(x) {
    done = true;
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



