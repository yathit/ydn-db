
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.core.Storage');


var reachedFinalContinuation, schema, debug_console, db, objs, arr_objs;

var db_name = 'test_keys_3';
var store_name = 'st';
var string_key_store = 'st3';
var arr_store_name = 'st2';

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
  var arr_store_schema = new ydn.db.schema.Store(arr_store_name, 'id', false,
    ydn.db.schema.DataType.ARRAY);
  var string_store = new ydn.db.schema.Store(string_key_store, 'value');
  schema = new ydn.db.schema.Database(undefined, [arr_store_schema, store_schema, string_store]);
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

  arr_objs = [
    {id:['a', 'qs0'], value:0, type:'a'},
    {id:['a', 'qs1'], value:1, type:'a'},
    {id:['b', 'at2'], value:2, type:'b'},
    {id:['b', 'bs1'], value:3, type:'b'},
    {id:['c', 'bs2'], value:4, type:'c'},
    {id:['c', 'bs3'], value:5, type:'c'},
    {id:['c', 'st3'], value:6, type:'c'}
  ];

  db.put(arr_store_name, arr_objs);
  db.put(string_key_store, objs);
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

  goog.net.XhrIo

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


var test_array_key = function () {

  var keys = arr_objs.map(function(x) {return x.id});
  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', keys, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout


  db.keys(arr_store_name).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};

var test_keyrange_starts = function () {

  var keys = [];
  for (var i = 0; i < objs.length; i++) {
    if (goog.string.startsWith(objs[i].value, 'b')) {
      keys.push(objs[i].id);
    }
  }
  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', keys, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout


  var range = ydn.db.KeyRange.starts('b');
  db.keys(store_name, 'value', range).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};


var test_string_key_starts = function () {

  var keys = [];
  for (var i = 0; i < objs.length; i++) {
    if (goog.string.startsWith(objs[i].value, 'b')) {
      keys.push(objs[i].value);
    }
  }
  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', keys, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout


  var range = ydn.db.KeyRange.starts('b');
  db.keys(string_key_store, range).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};

var test_array_key_key_range = function () {

  var keys = arr_objs.slice(2, 4).map(function(x) {return x.id});
  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', keys, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout


  var range = ydn.db.KeyRange.starts(['b']);
  db.keys(arr_store_name, range).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



