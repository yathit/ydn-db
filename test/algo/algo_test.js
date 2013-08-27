
goog.require('goog.debug.Console');
goog.require('ydn.db.algo.NestedLoop');
goog.require('ydn.db.algo.SortedMerge');
goog.require('goog.testing.jsunit');
goog.require('ydn.debug');




var reachedFinalContinuation, debug_console;
var store_name = 't1';
var db_name = 'test_algo_2';

var colorIndex = new ydn.db.schema.Index('color', ydn.db.schema.DataType.TEXT);
var hornIndex = new ydn.db.schema.Index('horn', ydn.db.schema.DataType.TEXT);
var legIndex = new ydn.db.schema.Index('legs', ydn.db.schema.DataType.TEXT);
var anmialStore = new ydn.db.schema.Store('animals', 'id', false,
  ydn.db.schema.DataType.TEXT, [colorIndex, hornIndex, legIndex]);

var schema = new ydn.db.schema.Database(undefined, [anmialStore]);
var db = new ydn.db.sql.Storage(db_name, schema, options);

var animals = [
  {id: 'rat', color: 'brown', horn: 0, legs: 4},
  {id: 'cat', color: 'spots', horn: 0, legs: 4},
  {id: 'cow', color: 'spots', horn: 1, legs: 4},
  {id: 'galon', color: 'gold', horn: 1, legs: 2},
  {id: 'snake', color: 'spots', horn: 0, legs: 0},
  {id: 'leopard', color: 'spots', horn: 1, legs: 4},
  {id: 'chicken', color: 'red', horn: 0, legs: 2}
];
db.clear();
db.put('animals', animals).addCallback(function (value) {
  console.log(db + 'store: animals ready.');
});

var setUp = function() {
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.core.DbOperator.DEBUG = true;
    //ydn.db.crud.req.IndexedDb.DEBUG = true;
    //ydn.db.algo.SortedMerge.DEBUG = true;


  reachedFinalContinuation = false;
};

var tearDown = function() {
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
      assertArrayEquals('result', ['cow', 'leopard'], out);
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

  req = db.scan(solver, [q1, q2, q3]);
  req.addCallback(function (result) {
    //console.log(result);
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



var test_three_iterator = function () {
  var animals = [
    {id: 1, name: 'rat', color: 'brown', horn: 0, legs: 4},
    {id: 2, name: 'leopard', color: 'spots', horn: 2, legs: 4},
    {id: 3, name: 'galon', color: 'gold', horn: 10, legs: 2},
    {id: 4, name: 'cat', color: 'spots', horn: 0, legs: 4},
    {id: 5, name: 'snake', color: 'spots', horn: 0, legs: 0},
    {id: 6, name: 'ox', color: 'black', horn: 2, legs: 4},
    {id: 7, name: 'cow', color: 'spots', horn: 2, legs: 4},
    {id: 8, name: 'chicken', color: 'red', horn: 0, legs: 2}
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
  var db = new ydn.db.Storage('test_three_iterator', schema, options);
  db.clear();
  db.put('animals', animals);

  var iter_color = ydn.db.Cursors.where('animals', 'color', '=', 'spots');
  var iter_horn = ydn.db.Cursors.where('animals', 'horn', '=', 2);
  var iter_legs = ydn.db.Cursors.where('animals', 'legs', '=', 4);

  var done;
  var result = [];

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('correct result', [2, 7], result);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var solver = new ydn.db.algo.SortedMerge(result);
  var req = db.scan(solver, [iter_horn, iter_color, iter_legs]);
  req.addBoth(function() {
    done = true;
  });
};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



