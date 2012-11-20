
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.core.Storage');


var reachedFinalContinuation, schema, debug_console, db, objs;

var db_name = 'test_kr_4';
var store_name = 'st';

var setUp = function () {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    //goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  var value_index = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var tag_index = new ydn.db.schema.Index('type', ydn.db.schema.DataType.TEXT, false, true);
  var x_index = new ydn.db.schema.Index('x', ydn.db.schema.DataType.NUMERIC, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.INTEGER, [x_index, value_index, tag_index]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  db = new ydn.db.core.Storage(db_name, schema, options);

  objs = [
    {id: -3, value: 'a0', x: 1, type: ['a', 'b'], remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', x: 3,type: ['a'], remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', x: 2,type: ['b'], remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', x: 2,type: ['b', 'c'], remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: ['c'], remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: ['c', 'a', 'b'], remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', x: 2,remark: 'test ' + Math.random()}
  ];

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};




var test_store = function () {

  var get_done;
  var result;
  var keys = objs.map(function(x) {return x.id});

  waitForCondition(
    // Condition
    function () {
      return get_done;
    },
    // Continuation
    function () {
      assertArrayEquals(keys, result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout


  db.keys(store_name).addCallback(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    get_done = true;
  });

};


var test_primary_key_range = function () {

  var get_done;
  var result;
  var keys = objs.slice(2, 5).map(function(x) {return x.id});

  waitForCondition(
    // Condition
    function () {
      return get_done;
    },
    // Continuation
    function () {
      assertArrayEquals(keys, result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.bound(1, 10);
  db.keys(store_name, range).addCallback(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    get_done = true;
  });

};

var test_by_index_key_range = function () {

  var get_done;
  var result;
  var keys = objs.slice(2, 5).map(function(x) {return x.id});

  waitForCondition(
    // Condition
    function () {
      return get_done;
    },
    // Continuation
    function () {
      assertArrayEquals(keys, result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.bound('ba', 'c');
  db.keys(store_name, 'value', range).addCallback(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    get_done = true;
  });

};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



