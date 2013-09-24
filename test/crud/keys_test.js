
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.db');
goog.require('ydn.debug');


var reachedFinalContinuation;


var setUp = function () {
  // ydn.debug.log('ydn.db', 'finest');


};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};





var test_primary_key_range = function () {

  var db_name = 'test_primary_key_range';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: -3, value: 'a0', x: 1, type: ['a', 'b'], remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', x: 3, type: ['a'], remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', x: 2, type: ['b'], remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', x: 2, type: ['b', 'c'], remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: ['c'], remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: ['c', 'a', 'b'], remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', x: 2, remark: 'test ' + Math.random()}
  ];
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    5000); // maxTimeout

  var range = ydn.db.KeyRange.bound(1, 10);
  db.keys(store_name, range).addCallback(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    get_done = true;
  });

};

var test_by_index_key_range = function () {
  var db_name = 'test_by_index_key_range';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [{
        keyPath: 'value',
        type: 'TEXT'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: -3, value: 'a0', x: 1, type: ['a', 'b'], remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', x: 3, type: ['a'], remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', x: 2, type: ['b'], remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', x: 2, type: ['b', 'c'], remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: ['c'], remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: ['c', 'a', 'b'], remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', x: 2, remark: 'test ' + Math.random()}
  ];
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });

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
      assertArrayEquals('correct results', keys, result);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    5000); // maxTimeout

  var range = ydn.db.KeyRange.bound('ba', 'c');
  db.keys(store_name, 'value', range).addCallback(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    get_done = true;
  });

};


var test_array_key = function () {

  var db_name = 'test_array_key';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr_objs = [
    {id: ['a', 'qs0'], value: 0, type: 'a'},
    {id: ['a', 'qs1'], value: 1, type: 'a'},
    {id: ['b', 'at2'], value: 2, type: 'b'},
    {id: ['b', 'bs1'], value: 3, type: 'b'},
    {id: ['c', 'bs2'], value: 4, type: 'c'},
    {id: ['c', 'bs3'], value: 5, type: 'c'},
    {id: ['c', 'st3'], value: 6, type: 'c'}
  ];
  db.put(store_name, arr_objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout


  db.keys(store_name).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};

var test_keyrange_starts = function () {

  var db_name = 'test_keyrange_starts';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [{
        name: 'value',
        keyPath: 'value',
        type: 'TEXT'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: -3, value: 'a0', x: 1, type: ['a', 'b'], remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', x: 3, type: ['a'], remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', x: 2, type: ['b'], remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', x: 2, type: ['b', 'c'], remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: ['c'], remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: ['c', 'a', 'b'], remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', x: 2, remark: 'test ' + Math.random()}
  ];
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });


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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout


  var range = ydn.db.KeyRange.starts('b');
  db.keys(store_name, 'value', range).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};


var test_string_key_starts = function () {

  var db_name = 'test_keyrange_starts';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'value',
      type: 'TEXT'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: -3, value: 'a0', x: 1, type: ['a', 'b'], remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', x: 3, type: ['a'], remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', x: 2, type: ['b'], remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', x: 2, type: ['b', 'c'], remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: ['c'], remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: ['c', 'a', 'b'], remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', x: 2, remark: 'test ' + Math.random()}
  ];
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });

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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout


  var range = ydn.db.KeyRange.starts('b');
  db.keys(store_name, range).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};

var test_array_key_key_range = function () {


  var db_name = 'test_array_key_key_range';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr_objs = [
    {id: ['a', 'qs0'], value: 0, type: 'a'},
    {id: ['a', 'qs1'], value: 1, type: 'a'},
    {id: ['b', 'at2'], value: 2, type: 'b'},
    {id: ['b', 'bs1'], value: 3, type: 'b'},
    {id: ['c', 'bs2'], value: 4, type: 'c'},
    {id: ['c', 'bs3'], value: 5, type: 'c'},
    {id: ['c', 'st3'], value: 6, type: 'c'}
  ];
  db.put(store_name, arr_objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });


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
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout

  var range = ydn.db.KeyRange.starts(['b']);
  db.keys(store_name, range).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};





var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



