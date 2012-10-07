
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  //goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.con.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);
  //ydn.db.con.IndexedDb.DEBUG = true;
  //ydn.db.req.IndexedDb.DEBUG = true;

	basic_schema = new ydn.db.DatabaseSchema(1);
	basic_schema.addStore(new ydn.db.StoreSchema(table_name, 'id'));
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test124';
var options = {Mechanisms: ['indexeddb']};


/**
 */
var test_31_special_keys = function() {
  var db_name = 'test_61';
  var db = new ydn.db.Storage(db_name, basic_schema, options);

  var key_test = function(key) {
    console.log('testing ' + key);
    var key_value = 'a' + Math.random();

    var a_done;
    var a_value;
    waitForCondition(
      // Condition
      function() { return a_done; },
      // Continuation
      function() {
        assertEquals('put a', key, a_value);
      },
      100, // interval
      2000); // maxTimeout

    db.put(table_name, {id: key, value: key_value}).addCallback(function(value) {
      console.log(db + ' receiving put value callback for ' + key + ' = ' + key_value);
      a_value = value;
      a_done = true;
    });

    var b_done;
    var b_value;
    waitForCondition(
      // Condition
      function() { return b_done; },
      // Continuation
      function() {
        assertEquals('get', key_value, b_value.value);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


    db.get(table_name, key).addCallback(function(value) {
      console.log(db + ' receiving get value callback ' + key + ' = ' + value);
      b_value = value;
      b_done = true;
    });
  };

  key_test('x');

  key_test('t@som.com');

  key_test('http://www.ok.com');

};



var test_43_offline_key = function () {
  var store_name = 'demoOS';
  var db_name = 'test_43_27';
  var store_schema = new ydn.db.StoreSchema(store_name, undefined,  false);
  var schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);

  var key = Math.random();
  var data = {test: 'some random ' + Math.random(), type: Math.random()};

  var done, result, put_done, put_result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('value', data.test, result.test);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertEquals('key', key, put_result);
      // retrieve back by those key

      db.get(store_name, put_result).addBoth(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },

    100, // interval
    1000); // maxTimeout

  db.put(store_name, data, key).addCallback(function (value) {
    console.log(['receiving key from put', value]);
    put_done = true;
    put_result = value
  });
};


var test_44_offline_key_array = function () {
  var store_name = 'demoOS';
  var db_name = 'test_43_27';
  var store_schema = new ydn.db.StoreSchema(store_name, undefined,  false);
  var schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);

  var objs = [
    {id:'qs0', value:0, type:'a'},
    {id:'qs1', value:1, type:'a'},
    {id:'at2', value:2, type:'b'},
    {id:'bs1', value:3, type:'b'},
    {id:'bs2', value:4, type:'c'},
    {id:'bs3', value:5, type:'c'},
    {id:'st3', value:6, type:'c'}
  ];
  var keys = objs.map(function(x) {return x.id});

  var done, result, put_done, put_result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals('get back', objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertEquals('key length', objs.length, put_result.length);
      assertArrayEquals('get back the keys', keys, put_result);
      // retrieve back by those key

      db.get(store_name, put_result).addBoth(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },

    100, // interval
    1000); // maxTimeout

  db.put(store_name, objs, keys).addCallback(function (value) {
    console.log(['receiving key from put', value]);
    put_done = true;
    put_result = value
  });
};




var test_7_put_nested_keyPath = function() {
  var store_name = 'ts1';
  var db_name = 'putodbtest21';
  var schema = new ydn.db.DatabaseSchema(1);
  schema.addStore(new ydn.db.StoreSchema(store_name, 'id.$t'));
  var db = new ydn.db.Storage(db_name, schema, options);

  var key = 'a';
  var put_done = false;
  var put_value = {value: Math.random()};
  put_value.id = {$t: key};
  var put_value_received;

  waitForCondition(
    // Condition
    function() { return put_done; },
    // Continuation
    function() {
      assertEquals('put a 1', key, put_value_received);
      // Remember, the state of this boolean will be tested in tearDown().
    },
    100, // interval
    2000); // maxTimeout

  db.put(store_name, put_value).addCallback(function(value) {
    console.log('receiving value callback.');
    put_value_received = value;
    put_done = true;
  });

  var get_done;
  var get_value_received;
  waitForCondition(
    // Condition
    function() { return get_done; },
    // Continuation
    function() {
      assertObjectEquals('get', put_value, get_value_received);
      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.get(store_name, key).addCallback(function(value) {
    console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
    get_value_received = value;
    get_done = true;
  });

};


var test_42_autoincreasement_offline = function () {
  var store_name = 'demoOS';
  var db_name = 'test_42_25';
  var store_schema = new ydn.db.StoreSchema(store_name, undefined, true);
  var schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);

  var objs = [
    {id:'qs0', value:0, type:'a'},
    {id:'qs1', value:1, type:'a'},
    {id:'at2', value:2, type:'b'},
    {id:'bs1', value:3, type:'b'},
    {id:'bs2', value:4, type:'c'},
    {id:'bs3', value:5, type:'c'},
    {id:'st3', value:6, type:'c'}
  ];


  var done, result, put_done, put_result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals('get back', objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertEquals('key length', objs.length, put_result.length);
      for (var i = 1; i < objs.length; i++) {
        assertEquals('auto increase at ' + i, put_result[i], put_result[i-1] + 1);
      }

      // retrieve back by those key

      db.get(store_name, put_result).addBoth(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },

    100, // interval
    1000); // maxTimeout

  db.put(store_name, objs).addCallback(function (value) {
    console.log(['receiving key from put', value]);
    put_done = true;
    put_result = value
  });
};


var test_43_autoincreasement_inline = function () {
  var store_name = 'demoOS';
  var db_name = 'test_43_3';
  var store_schema = new ydn.db.StoreSchema(store_name, 'value', true, ydn.db.DataType.INTEGER);
  var schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);

  var objs = [
    {id:'qs0', value:0, type:'a'},
    {id:'bs1', type:'b'},
    {id:'bs2', value:4, type:'c'},
    {id:'st3', type:'c'}
  ];


  var done, result, put_done, keys;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      for (var i = 0; i < objs.length; i++) {
        assertEquals('obj ' + i, objs[i].id, result[i].id);
      }

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertEquals('key length', objs.length, keys.length);
      for (var i = 0; i < keys.length; i++) {
        if (goog.isDef(objs[i].value)) {
          assertEquals('at ' + i, objs[i].value, keys[i]);
        }
      }

      // retrieve back by those key

      db.get(store_name, keys).addBoth(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },

    100, // interval
    1000); // maxTimeout


  // last two are given different value
  db.put(store_name, objs).addCallback(function (value) {
    console.log(['receiving key from put', value]);
    keys = value;
    put_done = true;
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



