
goog.require('goog.debug.Console');
goog.require('ydn.db.algo.NestedLoop');
goog.require('goog.testing.jsunit');

goog.require('ydn.db.index.Storage');



var reachedFinalContinuation, schema, debug_console, db, objs, animals;
var store_name = 't1';
var db_name = 'test_iteration_1';

var setUp = function() {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);

    //ydn.db.tr.Mutex.DEBUG = true;
    //ydn.db.core.req.IndexedDb.DEBUG = true;
    //ydn.db.core.req.IndexedDb.DEBUG = true;
    //ydn.db.index.req.WebsqlCursor.DEBUG = true;

  }

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
  db.close();
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
  var db = new ydn.db.index.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });


  db.put('animals', animals).addCallback(function (value) {
    console.log(db + 'store: animals ready.');
  });
  return db;
};


var test_streamer_collect = function() {
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

  db.addEventListener('connected', function() {  // to make sure
    streamer.push(objs[1].id);
    streamer.push(objs[4].id);
    streamer.collect(function(keys, x) {
      result = x;
      done = true;
    });
  });

};

var test_streamer_sink = function() {
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

  db.addEventListener('connected', function() {  // to make sure
    streamer.push(objs[1].id);
    streamer.push(objs[4].id);
  });

};


var test_index_streamer_collect = function() {
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

  db.addEventListener('connected', function() {  // to make sure
    streamer.push(objs[1].id);
    streamer.push(objs[4].id);
    streamer.collect(function(keys, x) {
      result = x;
      done = true;
    });
  });

};

var scan_key_single_test = function (q, actual_keys, actual_index_keys) {

  db = load_default();
  var done;
  var streaming_keys = [];
  var streaming_index_keys = [];

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming keys', actual_keys, streaming_keys);
        //console.log([actual_index_keys, streaming_index_keys]);
        assertArrayEquals('streaming values', actual_index_keys, streaming_index_keys);

        reachedFinalContinuation = true;

      },
      100, // interval
      1000); // maxTimeout

  var req = db.scan([q], function join_algo (key, index_key) {

    if (!goog.isDef(key[0])) {
      return [];
    }
    //console.log(['receiving ', key[0], index_key[0]]);
    streaming_keys.push(key[0]);
    streaming_index_keys.push(index_key[0]);
    return [true]; // continue iteration
  });

  req.addCallback(function (result) {
     done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });

};

var test_11_scan_key_iterator = function () {

  var actual_keys = objs.map(function(x) {return x.id;});
  actual_keys.sort();
  var actual_index_keys = actual_keys;
  var q = new ydn.db.KeyCursors(store_name);
  scan_key_single_test(q, actual_keys, actual_index_keys);

};

var test_12_scan_value_iterator = function () {

  objs.sort(function(a, b) {
    return a.id > b.id ? 1 : -1;
  });
  var actual_keys = objs.map(function(x) {return x.id;});

  var q = new ydn.db.ValueCursors(store_name);
  scan_key_single_test(q, actual_keys, objs);

};

var test_13_scan_index_key_iterator = function () {

  objs.sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });
  var actual_keys = objs.map(function(x) {return x.value;});
  var actual_index_keys = objs.map(function(x) {return x.id;});
  var q = new ydn.db.Cursors(store_name, 'value');
  scan_key_single_test(q, actual_keys, actual_index_keys);

};


var test_14_scan_index_key_iterator_reverse = function () {

  objs.sort(function(a, b) {
    return a.value > b.value ? -1 : 1;
  });
  var actual_keys = objs.map(function(x) {return x.value;});
  var actual_index_keys = objs.map(function(x) {return x.id;});
  var q = new ydn.db.Cursors(store_name, 'value', null, true);

  scan_key_single_test(q, actual_keys, actual_index_keys);

};


var test_21_scan_key_dual = function () {

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

  var q1 = new ydn.db.Cursors(store_name, 'value');
  var q2 = new ydn.db.Cursors(store_name, 'x');

  db = load_default();
  var req = db.scan([q1, q2], function join_algo (index_key, key) {
    //console.log(['receiving ', key, index_key]);
    if (goog.isDef(key[0])) {
      streaming_keys.push(key[0]);
      streaming_index_key_0.push(index_key[0]);
      streaming_index_key_1.push(index_key[1]);
    }

    return [goog.isDef(key[0]) ? true : null, goog.isDef(key[1]) ? true : null]; // continue iteration
  });

  req.addCallback(function (result) {
    //console.log(result);
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });

};



var test_41_map_key_iterator = function() {

  var done;
  var streaming_keys = [];

  // for key iterator, the reference value is sorted primary key.
  var q = new ydn.db.KeyCursors(store_name);
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


var test_41_map_value_iterator = function() {

  var done;
  var streaming_keys = [];

  // for value iterator, the reference value is record sorted by primary key.
  var actual_keys = objs;
  goog.array.sort(actual_keys, function(a, b) {
    return a.id > b.id ? 1 : -1;
  });
  var q = new ydn.db.ValueCursors(store_name);

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

var test_41_map_index_key_iterator = function() {

  var done;
  var streaming_keys = [];

  // for index key iterator, the reference value is index key.
  var q = new ydn.db.Cursors(store_name, 'value');
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


var test_41_map_index_value_iterator = function() {

  var done;
  var streaming_keys = [];

  // for index value iterator, the reference value is primary key.
  var actual_keys = objs.map(function(x) {return x.id;});
  var q = new ydn.db.IndexValueCursors(store_name, 'value');

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

var test_42_map_skip = function() {

  var done;
  var streaming_keys = [];

  var actual_index_keys = [0, 4, 5, 6];
  var q = new ydn.db.Cursors(store_name, 'value');

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming index', actual_index_keys, streaming_keys);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  var start = 3;
  db = load_default();
  var req = db.map(q, function (key) {
    streaming_keys.push(key);
    if (key < 3) {
      return 4;
    }
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


var test_43_map_stop = function() {

  var done;
  var streaming_keys = [];
  var streaming_values = [];

  var actual_index_keys = [0, 1, 2, 3];
  var q = new ydn.db.Cursors(store_name, 'value');

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming index', actual_index_keys, streaming_keys);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  var start = 3;
  db = load_default();
  var req = db.map(q, function (key) {
    streaming_keys.push(key);
    if (key >= 3) {
      return null;
    }
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};



var test_51_reduce = function() {

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



var test_61_scan_cursor_resume = function() {

  var done;
  var values = [];
  var actual_values = [0, 1, 2, 3];
  var q = new ydn.db.Cursors(store_name, 'value');

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
        var req = db.scan([q], function (keys, v) {
          if (goog.isDef(keys[0])) {
            values.push(keys[0]);
            return [true];
          } else {
            return [];
          }
        });
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
  var req = db.scan([q], function (keys, v) {
    //console.log([keys, v]);
    if (goog.isDef(keys[0])) {
      values.push(keys[0]);
      // scan until value is 3.
      return [keys[0] < 3 ? true : undefined];
    } else {
      return [];
    }
  });
  req.addCallback(function () {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



