
goog.require('goog.debug.Console');
goog.require('ydn.db.algo.NestedLoop');
goog.require('ydn.db.algo.ZigzagMerge');
goog.require('ydn.db.algo.SortedMerge');
goog.require('goog.testing.jsunit');

goog.require('ydn.db.Storage');



var reachedFinalContinuation, db, objs;

var debug_console = new goog.debug.Console();
debug_console.setCapturing(true);
goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
//goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
goog.debug.Logger.getLogger('ydn.db.con.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);
goog.debug.Logger.getLogger('ydn.db.algo').setLevel(goog.debug.Logger.Level.FINEST);
goog.debug.Logger.getLogger('ydn.db.index.req').setLevel(goog.debug.Logger.Level.FINEST);

var store_name = 't1';
var db_name = 'test_algo_scan_1';

var setUp = function() {

  objs = [
    {id: 0, first: 'A', last: 'M', age: 20},
    {id: 1, first: 'B', last: 'M', age: 24},
    {id: 2, first: 'B', last: 'L', age: 16},
    {id: 3, first: 'D', last: 'P', age: 49},
    {id: 4, first: 'B', last: 'M', age: 21}
  ];

  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      indexes: [{
        name: 'fa',
        keyPath: ['first', 'age']
      }, {
        name: 'la',
        keyPath: ['last', 'age']
      }]
    }]
  };
  db = new ydn.db.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });


  reachedFinalContinuation = false;
};

var tearDown = function() {
  db.close();
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var test_scan = function(algo) {

  var done;
  var result_keys = [];
  // sorted by primary key
  var results = [4, 1];

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', results, result_keys);
      reachedFinalContinuation = true;

    },
    100, // interval
    1000); // maxTimeout

  var q1 = new ydn.db.KeyIterator(store_name, 'fa', ydn.db.KeyRange.starts(['B']));
  var q2 = new ydn.db.KeyIterator(store_name, 'la', ydn.db.KeyRange.starts(['M']));

  var solver = function(keys, values) {
    console.log(JSON.stringify(keys));
    var cmp = ydn.db.cmp(keys[0], keys[1]);
    if (cmp == 0) {
      result_keys.push(values[0]);
      return [true, true];
    } else if (cmp == 1) {
      return [undefined, keys[0]];
    } else {
      return [keys[1], undefined];
    }
  };

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



