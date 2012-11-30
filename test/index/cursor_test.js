
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, debug_console, schema, db, objs;
var store_name = 't1';
var db_name = 'test_cursor_4';

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
  var typeIndex = new ydn.db.schema.Index('type', ydn.db.schema.DataType.TEXT, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
      ydn.db.schema.DataType.INTEGER, [indexSchema, typeIndex]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  db = new ydn.db.Storage(db_name, schema, options);

  objs = [
    {id: -3, value: 'ba', type: 'a', remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
    {id: 1, value: 'b', type: 'b', remark: 'test ' + Math.random()},
    {id: 3, value: 'b1', type: 'b', remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: 'c', remark: 'test ' + Math.random()},
    {id: 11, value: 'a3', type: 'c', remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    //console.log(db + ' ready.');
  });

  reachedFinalContinuation = false;

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);

};


var test_11_list_store = function () {

  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

    var q = new ydn.db.Iterator(store_name);

    db.list(q).addBoth(function (value) {
      //console.log(db + ' fetch value: ' + JSON.stringify(value));
      result = value;
      done = true;
    });
};


var test_12_list_store_reverse = function () {

  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs.reverse(), result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name, undefined, null, true);

  db.list(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_13_list_store_range = function () {

  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', 3, result.length);
      assertEquals('0', objs[2].id, result[0].id);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name, undefined, ydn.db.KeyRange.bound(1, 10));

  db.list(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_21_list_index = function () {

  var done, result;
  goog.array.sort(objs, function(a, b) {
    return goog.array.defaultCompare(a.value, b.value);
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name, 'value');

  db.list(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    //console.log(db.explain(q));
    result = value;
    done = true;
  });
};


var test_22_list_index_rev = function () {

  var done, result;
  goog.array.sort(objs, function(a, b) {
    return - goog.array.defaultCompare(a.value, b.value);
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name, 'value', null, true);

  db.list(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    //console.log(db.explain(q));
    result = value;
    done = true;
  });
};

var test_23_list_index_range = function () {

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', 3, result.length);
      assertEquals('0', objs[1].id, result[0].id);
      assertEquals('3', objs[2].id, result[2].id);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.bound('a', 'b');
  var q = new ydn.db.Iterator(store_name, 'value', range);

  db.list(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    //console.log(db.explain(q));
    result = value;
    done = true;
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



