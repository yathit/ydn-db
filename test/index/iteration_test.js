
goog.require('goog.debug.Console');
goog.require('ydn.db.algo.NestedLoop');
goog.require('goog.testing.jsunit');

goog.require('ydn.db.Storage');



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
  }

  var indexSchema = new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT, false, true);
  var valueIndex = new ydn.db.schema.Index('value', ydn.db.schema.DataType.INTEGER, false, true);
  var xIndex = new ydn.db.schema.Index('x', ydn.db.schema.DataType.NUMERIC, false, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
      ydn.db.schema.DataType.TEXT, [valueIndex, indexSchema, xIndex]);

  var colorIndex = new ydn.db.schema.Index('color', ydn.db.schema.DataType.TEXT);
  var hornIndex = new ydn.db.schema.Index('horn', ydn.db.schema.DataType.TEXT);
  var legIndex = new ydn.db.schema.Index('legs', ydn.db.schema.DataType.TEXT);
  var anmialStore = new ydn.db.schema.Store('animals', 'id', false,
    ydn.db.schema.DataType.TEXT, [colorIndex, hornIndex, legIndex]);

  schema = new ydn.db.schema.Database(undefined, [store_schema, anmialStore]);
  db = new ydn.db.Storage(db_name, schema, options);


  objs = [
    {id:'qs0', value: 0, x: 1, tag: ['a', 'b']},
    {id:'qs1', value: 1, x: 2, tag: 'a'},
    {id:'at2', value: 2, x: 3, tag: ['a', 'b']},
    {id:'bs1', value: 3, x: 6, tag: 'b'},
    {id:'bs2', value: 4, x: 14, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, x: 111, tag: 'c'},
    {id:'st3', value: 6, x: 600}
  ];

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });

  animals = [
    {id: 'rat', color: 'brown', horn: 0, legs: 4},
    {id: 'cow', color: 'spots', horn: 1, legs: 4},
    {id: 'galon', color: 'gold', horn: 1, legs: 2},
    {id: 'snake', color: 'spots', horn: 0, legs: 0},
    {id: 'chicken', color: 'red', horn: 0, legs: 2}
  ];
  db.put('animals', animals).addCallback(function (value) {
    console.log(db + 'store: animals ready.');
  });


  reachedFinalContinuation = false;
};

var tearDown = function() {
  db.close();
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var scan_key_single_test = function (q, actual_keys, actual_index_keys) {

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
        assertArrayEquals('streaming key', actual_keys, streaming_keys);
        assertArrayEquals('streaming index', actual_index_keys, streaming_index_keys);

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


var test_11_scan_key_single = function () {

  var actual_keys = objs.map(function(x) {return x.id;});
  var actual_index_keys = objs.map(function(x) {return x.value;});
  var q = new ydn.db.Iterator(store_name, 'value');
  scan_key_single_test(q, actual_keys, actual_index_keys);

};


var test_12_scan_key_single_reverse = function () {

  var actual_keys = objs.map(function(x) {return x.id;});
  var actual_index_keys = objs.map(function(x) {return x.value;});
  var q = new ydn.db.Iterator(store_name, 'value', null, true);
  scan_key_single_test(q, actual_keys.reverse(), actual_index_keys.reverse());

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

  var q1 = new ydn.db.Iterator(store_name, 'value');
  var q2 = new ydn.db.Iterator(store_name, 'x');

  var req = db.scan([q1, q2], function join_algo (key, index_key) {
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


var test_31_scan_mutli_query_match = function () {

  var done;
  var result_keys = [];
  var result_values = [];

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('number of result', 1, result_keys.length);
      assertEquals('number of result value', 1, result_values.length);
      assertEquals('result', 'cow', result_values[0]);
      reachedFinalContinuation = true;

    },
    100, // interval
    1000); // maxTimeout

  var q1 = ydn.db.Iterator.where('animals', 'color', '=', 'spots');
  var q2 = ydn.db.Iterator.where('animals', 'horn', '=', 1);
  var q3 = ydn.db.Iterator.where('animals', 'legs', '=', 4);
  var out = new ydn.db.Streamer(db, 'animals', 'id');
  out.setSink(function(key, value) {
    console.log(['streamer', key, value]);
    result_keys.push(key);
    result_values.push(value);
  });

  var solver = new ydn.db.algo.NestedLoop(out);
  var req = db.scan([q1, q2, q3], solver);

  req.addCallback(function (result) {
    //console.log(result);
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });

};


var test_41_map = function() {

  var done;
  var streaming_keys = [];
  var streaming_values = [];

  var actual_keys = objs.map(function(x) {return x.id;});
  var actual_index_keys = objs.map(function(x) {return x.value;});
  var q = new ydn.db.Iterator(store_name, 'value');

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming key', actual_keys, streaming_keys);
        assertArrayEquals('streaming index', actual_index_keys, streaming_values);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  var req = db.map(q, function (primary_key, key, value) {
    streaming_keys.push(primary_key);
    streaming_values.push(key);
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
  var streaming_values = [];

  var actual_index_keys = [0, 4, 5, 6];
  var q = new ydn.db.Iterator(store_name, 'value');

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
  var req = db.map(q, function (primary_key, key, value) {
    streaming_keys.push(key);
    streaming_values.push(value);
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
  var q = new ydn.db.Iterator(store_name, 'value');

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
  var req = db.map(q, function (primary_key, key, value) {
    streaming_keys.push(key);
    streaming_values.push(value);
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
  var q = new ydn.db.Iterator(store_name, 'value');

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
            values.push(v[0]);
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

  var req = db.scan([q], function (keys, v) {
    //console.log([keys, v]);
    if (goog.isDef(keys[0])) {
      values.push(v[0]);
      // scan until value is 3.
      return [v[0] < 3 ? true : undefined];
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



