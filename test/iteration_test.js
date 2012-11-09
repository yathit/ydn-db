
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');

goog.require('ydn.db.Storage');



var reachedFinalContinuation, schema, debug_console, db, objs;
var store_name = 't1';
var db_name = 'test_iteration_1';

var setUp = function() {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);

    ydn.db.tr.Mutex.DEBUG = true;
    ydn.db.req.IndexedDb.DEBUG = true;
  }

  var indexSchema = new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT, false, true);
  var valueIndex = new ydn.db.schema.Index('value', ydn.db.schema.DataType.INTEGER, false, true);
  var xIndex = new ydn.db.schema.Index('x', ydn.db.schema.DataType.NUMERIC, false, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
      ydn.db.schema.DataType.TEXT, [valueIndex, indexSchema, xIndex]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
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
    console.log(db + ' ready.');
  });

  reachedFinalContinuation = false;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_11_scan_key_single = function () {

  var actual_keys = objs.map(function(x) {return x.id;});
  var actual_index_keys = objs.map(function(x) {return x.value;});

  var done, result_keys, result_index_keys;
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

        assertArrayEquals('result key', actual_keys, result_keys);
        var result_index_keys1 = result_index_keys.map(function(x) {return x[0]});
        assertArrayEquals('result index', actual_index_keys, result_index_keys1);

        reachedFinalContinuation = true;

      },
      100, // interval
      1000); // maxTimeout

  var q = new ydn.db.Query(store_name, 'next', 'value');

  var req = db.scan([q], function join_algo (key, index_key) {
    //console.log(['receiving ', key, index_key]);
    streaming_keys.push(key[0]);
    streaming_index_keys.push(index_key[0]);
    return [true]; // continue iteration
  });

  req.addCallback(function (result) {
    result_keys = result.keys;
    result_index_keys = result.indexKeys;

    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });

};



var test_21_scan_key_dual = function () {

  var actual_keys = objs.map(function(x) {return x.id;});
  var actual_index_key_0 = objs.map(function(x) {return x.value;});
  var actual_index_key_1 = objs.map(function(x) {return x.x;});

  var done, result_keys, result_index_keys;
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

      assertArrayEquals('result key', actual_keys, result_keys);
      var result_index_key_0 = result_index_keys.map(function(x) {return x[0]});
      var result_index_key_1 = result_index_keys.map(function(x) {return x[1]});
      assertArrayEquals('result index', actual_index_key_0, result_index_key_0);
      assertArrayEquals('result index', actual_index_key_1, result_index_key_1);

      reachedFinalContinuation = true;

    },
    100, // interval
    1000); // maxTimeout

  var q1 = new ydn.db.Query(store_name, 'next', 'value');
  var q2 = new ydn.db.Query(store_name, 'next', 'x');

  var req = db.scan([q1, q2], function join_algo (key, index_key) {
    //console.log(['receiving ', key, index_key]);
    streaming_keys.push(key[0]);
    streaming_index_key_0.push(index_key[0]);
    streaming_index_key_1.push(index_key[1]);
    return [true, true]; // continue iteration
  });

  req.addCallback(function (result) {
    result_keys = result.keys;
    result_index_keys = result.indexKeys;

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



