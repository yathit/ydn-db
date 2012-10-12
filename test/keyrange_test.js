
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, debug_console;

var db_name = 'test_kr_3';
var store_name = 'st';
var db;


var setUp = function () {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  var indexSchema = new ydn.db.IndexSchema('value', ydn.db.DataType.TEXT, true);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false,
    ydn.db.DataType.INTEGER, [indexSchema]);
  schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  db = new ydn.db.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var objs = [
  {id: -3, value: 'a0', type: 'a', remark: 'test ' + Math.random()},
  {id: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
  {id: 1, value: 'ba', type: 'b', remark: 'test ' + Math.random()},
  {id: 3, value: 'bc', type: 'b', remark: 'test ' + Math.random()},
  {id: 10, value: 'c', type: 'c', remark: 'test ' + Math.random()},
  {id: 11, value: 'c1', type: 'c', remark: 'test ' + Math.random()},
  {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
];

var keyRange_test = function (q, exp_result) {

  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', exp_result.length, result.length);
      assertArrayEquals(exp_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout


  db.fetch(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};

var test_store_wise = function () {
  var q = new ydn.db.Cursor(store_name);
  keyRange_test(q, objs);
};


var test_integer_close_close = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3);
  var q = new ydn.db.Cursor(store_name, undefined, 'id', key_range);
  keyRange_test(q, objs.slice(1, 4));
};

var test_integer_open_close = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3, true);
  var q = new ydn.db.Cursor(store_name, undefined, 'id', key_range);
  keyRange_test(q, objs.slice(2, 4));
};

var test_integer_open_open = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3, true, true);
  var q = new ydn.db.Cursor(store_name, undefined, 'id', key_range);
  keyRange_test(q, objs.slice(2, 3));
};

// more testing ...



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



