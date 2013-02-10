
goog.require('goog.debug.Console');
goog.require('ydn.db.algo.ZigzagMerge');
goog.require('goog.testing.jsunit');



var reachedFinalContinuation, debug_console;

var db_name = 'test_zigzag_test_1';

var schema = {
  stores: [
    {
      name: 'animals',
      autoIncrement: true,
      indexes: [
        {
          keyPath: ['color', 'name']
        }, {
          keyPath: ['legs', 'name']
        }]
    }]
};
var db = new ydn.db.Storage(db_name, schema, options);

var animals = [
  {name: 'rat', color: 'brown', horn: 0, legs: 4},
  {name: 'cow', color: 'spots', horn: 1, legs: 4},
  {name: 'galon', color: 'gold', horn: 1, legs: 2},
  {name: 'cat', color: 'spots', horn: 0, legs: 4},
  {name: 'snake', color: 'spots', horn: 0, legs: 0},
  {name: 'leopard', color: 'spots', horn: 1, legs: 4},
  {name: 'chicken', color: 'red', horn: 0, legs: 2}
];
db.clear();
db.put('animals', animals).addCallback(function (value) {
  console.log(db + 'store: animals ready.');
});

var setUp = function() {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.algo').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.index.req').setLevel(goog.debug.Logger.Level.FINEST);

    //ydn.db.tr.Mutex.DEBUG = true;
    //ydn.db.core.req.IndexedDb.DEBUG = true;
    ydn.db.algo.ZigzagMerge.DEBUG = true;
  }

  reachedFinalContinuation = false;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_simple = function() {

  var done;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', ['cat', 'cow', 'leopard'], out);
      reachedFinalContinuation = true;

    },
    100, // interval
    1000); // maxTimeout

  var q1 = new ydn.db.Cursors('animals', 'color, name', ydn.db.KeyRange.starts(['spots']));
  var q2 = new ydn.db.Cursors('animals', 'legs, name', ydn.db.KeyRange.starts([4]));
  var out = [];

  var solver = new ydn.db.algo.ZigzagMerge(out);

  var req = db.scan([q1, q2], solver);
  req.addCallback(function (result) {
    //console.log(result);
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



