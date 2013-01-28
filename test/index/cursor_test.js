
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
    //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);

    ydn.db.index.req.WebSql.DEBUG = true;
  }

  reachedFinalContinuation = false;

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);

};


var load_default = function() {

  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var typeIndex = new ydn.db.schema.Index('type', ydn.db.schema.DataType.TEXT, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.INTEGER, [indexSchema, typeIndex]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);

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
    console.log(db + ' ready.');
  });

  return db;
};


var load_default2 = function() {

  var db_name = 'index-test-2';
  var indexSchema = new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT, false, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.TEXT, [indexSchema]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);


  objs = [
    {id:'qs0', value: 0, tag: ['a', 'b']},
    {id:'qs1', value: 1, tag: 'a'},
    {id:'at2', value: 2, tag: ['a', 'b']},
    {id:'bs1', value: 3, tag: 'b'},
    {id:'bs2', value: 4, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, tag: ['c']},
    {id:'st3', value: 6}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  return db;
};

var test_getByIterator = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals(objs[1], result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = new ydn.db.KeyRange.only('a2');
  var q = new ydn.db.ValueIndexIterator(store_name, 'value', range);

  db.get(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_listByIterator = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.list(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_listByIterator_resume = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('first result', objs.slice(0, 3), result);

      done = false;
      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertObjectEquals('second result', objs.slice(3, 6), result);
          reachedFinalContinuation = true;
        },
        100, // interval
        1000); // maxTimeout

      db.list(q, 3).addBoth(function (value) {
        //console.log(db + ' fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.list(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};



var test_listBy_index_ValueIterator = function () {
  var db = load_default();
  var done;
  var result;
  var exp_result = objs.sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', exp_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIndexIterator(store_name, 'value');

  db.list(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_listBy_index_ValueIterator_resume = function () {
  var db = load_default();
  var done;
  var result;
  var exp_result = objs.sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('first result', exp_result.slice(0, 3), result);

      done = false;
      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertObjectEquals('second result', exp_result.slice(3, 6), result);
          reachedFinalContinuation = true;
        },
        100, // interval
        1000); // maxTimeout

      db.list(q, 3).addBoth(function (value) {
        //console.log(db + ' fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIndexIterator(store_name, 'value');

  db.list(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_listByKeyIterator = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.id;
  });
  // keys.sort();
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', keys, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.KeyIterator(store_name);

  db.list(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};




var test_listByKeyIterator_resume = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.id;
  });
  // keys.sort();
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('first result', keys.slice(0, 3), result);

      done = false;
      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertObjectEquals('second result', keys.slice(3, 6), result);
          reachedFinalContinuation = true;
        },
        100, // interval
        1000); // maxTimeout

      db.list(q, 3).addBoth(function (value) {
        //console.log(db + ' fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.KeyIterator(store_name);

  db.list(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};

var test_listByIterator_limit = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', objs.slice(0, 3), result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.list(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_listByIterator_limit_offset = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', objs.slice(2, 5), result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.list(q, 3, 2).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_keysBy_ValueIterator = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.id;
  });
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', keys, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.keys(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};

var test_keysBy_ValueIterator_resume = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.id;
  });
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('first result', keys.slice(0, 3), result);

      done = false;
      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertObjectEquals('first result', keys.slice(3, 6), result);
          reachedFinalContinuation = true;
        },
        100, // interval
        1000); // maxTimeout

      db.keys(q, 3).addBoth(function (value) {
        //console.log(db + ' fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.keys(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_keysBy_index_ValueIterator = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.value;
  });
  keys.sort();
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', keys, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIndexIterator(store_name, 'value');

  db.keys(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};

var test_keysBy_multiEntry_index_KeyIterator = function () {
  var db = load_default2();
  var done;
  var result;
  var keys = ['a', 'b', 'c', 'd'];
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', keys, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.KeyIndexIterator(store_name, 'tag', null, false, true);

  db.keys(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



