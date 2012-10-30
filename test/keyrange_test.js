
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


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

  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.INTEGER, [indexSchema]);
  schema = new ydn.db.schema.Database(1, [store_schema]);
  db = new ydn.db.Storage(db_name, schema, options);

  objs = [
    {id: -3, value: 'a0', type: 'a', remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', type: 'b', remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', type: 'b', remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: 'c', remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: 'c', remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
  ];

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });


};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



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


var test_store_wise_revrse = function () {
  var q = new ydn.db.Cursor(store_name, ydn.db.Cursor.Direction.PREV);
  keyRange_test(q, objs.reverse());
};

var test_integer_only = function () {
  var key_range = ydn.db.KeyRange.only(3);
  var q = new ydn.db.Cursor(store_name, undefined, 'id', key_range);
  keyRange_test(q, objs.slice(3, 4));
};


var test_integer_lower_close = function () {
  var key_range = ydn.db.KeyRange.lowerBound(3);
  var q = new ydn.db.Cursor(store_name, undefined, 'id', key_range);
  keyRange_test(q, objs.slice(3, objs.length));
};

var test_integer_lower_open = function () {
  var key_range = ydn.db.KeyRange.lowerBound(3, true);
  var q = new ydn.db.Cursor(store_name, undefined, 'id', key_range);
  keyRange_test(q, objs.slice(4, objs.length));
};

var test_integer_upper_close = function () {
  var key_range = ydn.db.KeyRange.upperBound(3);
  var q = new ydn.db.Cursor(store_name, undefined, 'id', key_range);
  keyRange_test(q, objs.slice(0, 4));
};

var test_integer_upper_open = function () {
  var key_range = ydn.db.KeyRange.upperBound(3, true);
  var q = new ydn.db.Cursor(store_name, undefined, 'id', key_range);
  keyRange_test(q, objs.slice(0, 3));
};

var test_integer_close_close = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3);
  var q = new ydn.db.Cursor(store_name, undefined, 'id', key_range);
  keyRange_test(q, objs.slice(1, 4));
};

var test_integer_close_close_reverse = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3);
  var q = new ydn.db.Cursor(store_name, ydn.db.Cursor.Direction.PREV, 'id', key_range);
  keyRange_test(q, objs.slice(1, 4).reverse());
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


var test_index_string_only = function () {
  var key_range = ydn.db.KeyRange.only('bc');
  var q = new ydn.db.Cursor(store_name, undefined, 'value', key_range);
  keyRange_test(q, objs.slice(3, 4));
};

var test_index_string_lower_close = function () {
  var key_range = ydn.db.KeyRange.lowerBound('bc');
  var q = new ydn.db.Cursor(store_name, undefined, 'value', key_range);
  keyRange_test(q, objs.slice(3, objs.length));
};

var test_index_string_lower_open = function () {
  var key_range = ydn.db.KeyRange.lowerBound('bc', true);
  var q = new ydn.db.Cursor(store_name, undefined, 'value', key_range);
  keyRange_test(q, objs.slice(4, objs.length));
};

var test_index_string_close = function () {
  var key_range = ydn.db.KeyRange.upperBound('bc');
  var q = new ydn.db.Cursor(store_name, undefined, 'value', key_range);
  keyRange_test(q, objs.slice(0, 4));
};

var test_index_string_upper_open = function () {
  var key_range = ydn.db.KeyRange.upperBound('bc', true);
  var q = new ydn.db.Cursor(store_name, undefined, 'value', key_range);
  keyRange_test(q, objs.slice(0, 3));
};

var test_index_string_close_close = function () {
  var key_range = ydn.db.KeyRange.bound('a2', 'bc');
  var q = new ydn.db.Cursor(store_name, undefined, 'value', key_range);
  keyRange_test(q, objs.slice(1, 4));
};


var test_index_string_close_close_reverse = function () {
  var key_range = ydn.db.KeyRange.bound('a2', 'bc');
  var q = new ydn.db.Cursor(store_name, ydn.db.Cursor.Direction.PREV, 'value', key_range);
  keyRange_test(q, objs.slice(1, 4).reverse());
};

var test_store_string_index_wise_revrse = function () {
  var q = new ydn.db.Cursor(store_name, ydn.db.Cursor.Direction.PREV, 'value');
  keyRange_test(q, objs.reverse());
};




var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



