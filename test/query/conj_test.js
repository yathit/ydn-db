
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Query');
goog.require('ydn.debug');




var reachedFinalContinuation, debug_console;

var setUp = function() {
  // ydn.debug.log('ydn.db.core.req', 'finest');
  // ydn.debug.log('ydn.db.algo', 'finest');
  // ydn.db.core.DbOperator.DEBUG = true;
  // ydn.db.crud.req.IndexedDb.DEBUG = true;
  // ydn.db.algo.SortedMerge.DEBUG = true;


  reachedFinalContinuation = false;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var animals = [
  {id: 1, name: 'rat', color: 'brown', horn: 0, legs: 4},
  {id: 2, name: 'leopard', color: 'spots', horn: 2, legs: 4},
  {id: 3, name: 'galon', color: 'gold', horn: 10, legs: 2},
  {id: 4, name: 'tiger', color: 'spots', horn: 2, legs: 4},
  {id: 5, name: 'snake', color: 'spots', horn: 0, legs: 0},
  {id: 6, name: 'rhino', color: 'spots', horn: 1, legs: 4},
  {id: 7, name: 'ox', color: 'black', horn: 2, legs: 4},
  {id: 8, name: 'cow', color: 'spots', horn: 2, legs: 4},
  {id: 9, name: 'chicken', color: 'red', horn: 0, legs: 2},
  {id: 10, name: 'unicon', color: 'pink', horn: 1, legs: 4},
  {id: 11, name: 'cat', color: 'spots', horn: 0, legs: 4},
  {id: 12, name: 'human', color: 'pink', horn: 0, legs: 2}
];

var schema = {
  stores: [
    {
      name: 'animals',
      keyPath: 'id',
      indexes: [
        {
          keyPath: 'color'
        },
        {
          keyPath: 'horn'
        },
        {
          keyPath: 'legs'
        },
        {
          keyPath: ['horn', 'name']
        }, {
          keyPath: ['legs', 'name']
        }]
    }]
};


var test_logic = function() {
  var db = new ydn.db.core.Storage('test-logic', schema, options);
  var done, result;
  var q1 = db.from('animals').where('color', '=', 'spots');
  var q2 = db.from('animals').where('horn', '=', 2);
  var q = q1.and(q2);
  q = q.select('id');
  var iters = q.getIterators();
  assertEquals('number of iters', 2, iters.length);
  assertFalse('key join', q.isRefJoin());

  reachedFinalContinuation = true;
  ydn.db.deleteDatabase(db.getName(), db.getType());
  db.close();
};


var two_iterator = function(rev) {

  var db = new ydn.db.core.Storage('test-sorted-merge-' + rev, schema, options);
  db.clear();
  db.put('animals', animals);

  var exp_result = [2, 4, 8];
  var done;
  var result = [];

  waitForCondition(
      // Condition
      function() {
        return done;
      },
      // Continuation
      function() {
        assertArrayEquals('correct result', exp_result, result);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var q1 = db.from('animals').where('color', '=', 'spots');
  var q2 = db.from('animals').where('horn', '=', 2);
  var q = q1.and(q2);
  if (rev) {
    q1 = q1.reverse();
    q2 = q2.reverse();
  }
  q = q.select('id');
  var req = q.list();
  req.addBoth(function(x) {
    result = x;
    done = true;
  });
};


var test_two_iterator = function() {
  two_iterator(false);
};


var _test_two_iterator_reverse = function() {
  two_iterator(true);
};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



