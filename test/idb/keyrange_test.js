
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';
var stubs;

var setUp = function () {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  //goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);

  var version = 1;
  basic_schema = new ydn.db.DatabaseSchema(version);
  var store;

  var indexSchema = new ydn.db.IndexSchema('value', ydn.db.DataType.INTEGER, true);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false,
    ydn.db.DataType.TEXT, [indexSchema]);
  schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  db = new ydn.db.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log('db ready.');
  });
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test_kr_1';
var store_name = 'st';
var options = {Mechanisms: ['indexeddb']};
var db;


var objs = [
  {id:'qs0', value: 0, type: 'a', remark: 'test ' + Math.random()},
  {id:'qs1', value: 1, type: 'a', remark: 'test ' + Math.random()},
  {id:'at2', value: 2, type: 'b', remark: 'test ' + Math.random()},
  {id:'bs1', value: 3, type: 'b', remark: 'test ' + Math.random()},
  {id:'bs2', value: 4, type: 'c', remark: 'test ' + Math.random()},
  {id:'bs3', value: 5, type: 'c', remark: 'test ' + Math.random()},
  {id:'st3', value: 6, type: 'c', remark: 'test ' + Math.random()}
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


var test_integer_close_close = function () {
  var key_range = ydn.db.KeyRange.bound(2, 3);
  var q = new ydn.db.Cursor(store_name, undefined, 'value', key_range);
  keyRange_test(q, objs.slice(2, 4));
};

var test_integer_open_close = function () {
  var key_range = ydn.db.KeyRange.bound(2, 3, true);
  var q = new ydn.db.Cursor(store_name, undefined, 'value', key_range);
  keyRange_test(q, objs.slice(3, 4));
};

var test_integer_open_open = function () {
  var key_range = ydn.db.KeyRange.bound(2, 3, true, true);
  var q = new ydn.db.Cursor(store_name, undefined, 'value', key_range);
  keyRange_test(q, objs.slice(3, 3));
};

// more testing ...



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



