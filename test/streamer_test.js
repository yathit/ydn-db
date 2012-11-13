
goog.require('goog.debug.Console');
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

  var q = new ydn.db.Iterator(store_name, 'next', 'value');

  var req = db.scan([q], function join_algo (key, index_key) {
    console.log(['receiving ', key ? key[0] : key, index_key]);
    if (!goog.isDef(key[0])) {
      return null;
    }
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





var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



