
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

  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.INTEGER, [indexSchema]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
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


/**
 *
 * @param {ydn.db.KeyRange} key_range
 * @param {string} index
 * @param {*} exp_result
 * @param {boolean=} reverse
 */
var keyRange_test = function (key_range, index, exp_result, reverse) {

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


  db.list(store_name, key_range, 'id').addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};



var test_integer_only = function () {
  var key_range = ydn.db.KeyRange.only(3);
  keyRange_test(key_range, 'id', objs.slice(3, 4));
};


var test_integer_lower_close = function () {
  var key_range = ydn.db.KeyRange.lowerBound(3);
  keyRange_test(key_range, 'id', objs.slice(3, objs.length));
};

var test_integer_lower_open = function () {
  var key_range = ydn.db.KeyRange.lowerBound(3, true);
  keyRange_test(key_range, 'id', objs.slice(4, objs.length));
};

var test_integer_upper_close = function () {
  var key_range = ydn.db.KeyRange.upperBound(3);
  keyRange_test(key_range, 'id', objs.slice(0, 4));
};

var test_integer_upper_open = function () {
  var key_range = ydn.db.KeyRange.upperBound(3, true);
  keyRange_test(key_range, 'id', objs.slice(0, 3));
};

var test_integer_close_close = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3);
  keyRange_test(key_range, 'id', objs.slice(1, 4));
};

var test_integer_close_close_reverse = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3);
  keyRange_test(key_range, 'id', objs.slice(1, 4).reverse());
};

var test_integer_open_close = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3, true);
  keyRange_test(key_range, 'id', objs.slice(2, 4));
};

var test_integer_open_open = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3, true, true);
  keyRange_test(key_range, 'id', objs.slice(2, 3));
};


var test_index_string_only = function () {
  var key_range = ydn.db.KeyRange.only('bc');
  keyRange_test(key_range, 'value', objs.slice(3, 4));
};

var test_index_string_lower_close = function () {
  var key_range = ydn.db.KeyRange.lowerBound('bc');
  keyRange_test(key_range, 'value', objs.slice(3, objs.length));
};

var test_index_string_lower_open = function () {
  var key_range = ydn.db.KeyRange.lowerBound('bc', true);
  keyRange_test(key_range, 'value', objs.slice(4, objs.length));
};

var test_index_string_close = function () {
  var key_range = ydn.db.KeyRange.upperBound('bc');
  keyRange_test(key_range, 'value', objs.slice(0, 4));
};

var test_index_string_upper_open = function () {
  var key_range = ydn.db.KeyRange.upperBound('bc', true);
  keyRange_test(key_range, 'value', objs.slice(0, 3));
};

var test_index_string_close_close = function () {
  var key_range = ydn.db.KeyRange.bound('a2', 'bc');
  keyRange_test(key_range, 'value', objs.slice(1, 4));
};


var test_index_string_close_close_reverse = function () {
  var key_range = ydn.db.KeyRange.bound('a2', 'bc');
  keyRange_test(key_range, 'value', objs.slice(1, 4).reverse(), true);
};

var test_store_string_index_wise_revrse = function () {
  var q = new ydn.db.Iterator(store_name, 'value', null, true);
  keyRange_test(q, objs.reverse());
};



var test_query_start_with = function () {
  var store_name = 'ts1';
  var db_name = 'test_crud_5';

  // NOTE: key also need to be indexed.
  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.NUMERIC, true);
  var stores = [new ydn.db.schema.Store(store_name, 'id', false, ydn.db.schema.DataType.TEXT, [indexSchema])];
  //schema.addStore(new ydn.db.schema.Store(store_name, 'id'));
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.Storage(db_name, schema, options);

  var objs = [
    {id:'qs1', value:Math.random()},
    {id:'qs2', value:Math.random()},
    {id:'qt', value:Math.random()}
  ];

  var put_value_received;
  var put_done;
  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertArrayEquals('put objs', [objs[0].id, objs[1].id, objs[2].id],
        put_value_received);

      var get_done;
      var get_value_received;
      waitForCondition(
        // Condition
        function () {
          return get_done;
        },
        // Continuation
        function () {
          reachedFinalContinuation = true;
        },
        100, // interval
        2000); // maxTimeout


      var key_range = ydn.db.KeyRange.starts('qs');
      var q = new ydn.db.Iterator(store_name, 'id', key_range);
      db.fetch(q).addCallback(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        assertEquals('obj length', objs.length - 1, value.length);
        assertObjectEquals('get', objs[0], value[0]);
        assertObjectEquals('get', objs[1], value[1]);

        get_done = true;
      });

    },
    100, // interval
    2000); // maxTimeout

  db.put(store_name, objs).addCallback(function (value) {
    console.log(['receiving value callback.', value]);
    put_value_received = value;
    put_done = true;
  });

};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



