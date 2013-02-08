
goog.require('goog.debug.Console');
goog.require('ydn.db.algo.NestedLoop');
goog.require('ydn.db.algo.ZigzagMerge');
goog.require('ydn.db.algo.SortedMerge');
goog.require('goog.testing.jsunit');



var reachedFinalContinuation, debug_console;
var store_name = 't1';
var db_name = 'test_algo_2';

var colorIndex = new ydn.db.schema.Index('color', ydn.db.schema.DataType.TEXT);
var hornIndex = new ydn.db.schema.Index('horn', ydn.db.schema.DataType.TEXT);
var legIndex = new ydn.db.schema.Index('legs', ydn.db.schema.DataType.TEXT);
var anmialStore = new ydn.db.schema.Store('animals', 'id', false,
  ydn.db.schema.DataType.TEXT, [colorIndex, hornIndex, legIndex]);

var schema = new ydn.db.schema.Database(undefined, [anmialStore]);
var db = new ydn.db.Storage(db_name, schema, options);

var animals = [
  {id: 'rat', color: 'brown', horn: 0, legs: 4},
  {id: 'cat', color: 'spots', horn: 0, legs: 4},
  {id: 'cow', color: 'spots', horn: 1, legs: 4},
  {id: 'galon', color: 'gold', horn: 1, legs: 2},
  {id: 'snake', color: 'spots', horn: 0, legs: 0},
  {id: 'chicken', color: 'red', horn: 0, legs: 2}
];
db.put('animals', animals).addCallback(function (value) {
  console.log(db + 'store: animals ready.');
});

var setUp = function() {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db.algo').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db.index.req').setLevel(goog.debug.Logger.Level.FINEST);

    //ydn.db.tr.Mutex.DEBUG = true;
    //ydn.db.core.req.IndexedDb.DEBUG = true;
    //ydn.db.algo.SortedMerge.DEBUG = true;
    ydn.db.algo.NestedLoop.DEBUG = true;
  }


  reachedFinalContinuation = false;
};

var tearDown = function() {
  db.close();
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var match_animal = function(algo) {

  var done;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', ['cow'], out);
      reachedFinalContinuation = true;

    },
    100, // interval
    1000); // maxTimeout

  var q1 = new ydn.db.Cursors('animals', 'color', ydn.db.KeyRange.only('spots'));
  var q2 = new ydn.db.Cursors('animals', 'horn', ydn.db.KeyRange.only(1));
  var q3 = new ydn.db.Cursors('animals', 'legs', ydn.db.KeyRange.only(4));
  var out = [];

  var solver, req;
  if (algo == 'nested') {
    solver = new ydn.db.algo.NestedLoop(out);
  } else if (algo == 'sorted') {
    solver = new ydn.db.algo.SortedMerge(out);
  }

  req = db.scan([q1, q2, q3], solver);
  req.addCallback(function (result) {
    console.log(result);

    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


var test_nested_loop_1 = function () {
  match_animal('nested');
};



var test_sorted_merge_1 = function () {
  match_animal('sorted');
};




var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



