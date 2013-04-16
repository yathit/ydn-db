// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');
goog.require('ydn.db');
goog.require('ydn.db.crud.Storage');


var reachedFinalContinuation;
var table_name = 't1';
var stubs;
var basic_schema = {
  stores: [
    {
      name: table_name,
      keyPath: 'id',
      type: 'TEXT'
    }]
};


var setUp = function() {
  //ydn.debug.log('ydn.db', 'finest');
  //ydn.db.tr.StrictOverflowParallel.DEBUG = true;
  //ydn.db.tr.Parallel.DEBUG = true;
// ydn.db.con.IndexedDb.DEBUG = true;

};


var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var continuous_request_test = function(thread, exp_tx_no) {

  var db_name = 'nested_request_test' + Math.random();
  options.thread = thread;
  var db = new ydn.db.crud.Storage(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;
  var tx_no = [];

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        assertNotNullNorUndefined('has result', result);
        assertEquals('correct obj', val.value, result.value);
        assertArrayEquals('tx no', exp_tx_no, tx_no);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, val).addBoth(function() {
    tx_no.push(db.getTxNo());
    db.get(table_name, 'a').addBoth(function (r) {
      tx_no.push(db.getTxNo());
    });
    db.get(table_name, 'a').addBoth(function (x) {
      result = x;
      tx_no.push(db.getTxNo());
      t1_fired = true;
    });
  });

};


var committed_continuous_request_test = function(thread, exp_tx_no) {

  var db_name = 'nested_request_test' + Math.random();
  options.thread = thread;
  var db = new ydn.db.crud.Storage(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;
  var tx_no = [];

  waitForCondition(
    // Condition
    function() { return t1_fired; },
    // Continuation
    function() {
      assertNotNullNorUndefined('has result', result);
      assertEquals('correct obj', val.value, result.value);
      assertArrayEquals('tx no', exp_tx_no, tx_no);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  db.run(function (tdb) {
    tdb.put(table_name, val);
  }, [table_name], 'readwrite', function (t) {
    db.get(table_name, 'a').addBoth(function (r) {
      tx_no.push(db.getTxNo());
    });
    db.get(table_name, 'a').addBoth(function (x) {
      result = x;
      tx_no.push(db.getTxNo());
      t1_fired = true;
    });
  })


};

var nested_request_test = function(thread, exp_tx_no) {

  var db_name = 'nested_request_test' + Math.random();
  options.thread = thread;
  var db = new ydn.db.crud.Storage(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;
  var tx_no = [];

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        assertEquals('correct obj', val.value, result.value);
        assertArrayEquals('tx no', exp_tx_no, tx_no);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, val).addBoth(function() {
    tx_no.push(db.getTxNo());
    db.get(table_name, 'a').addBoth(function (r) {
      tx_no.push(db.getTxNo());
      // do some heavy DOM
      var root = document.createElement('div');
      root.textContent = thread;
      document.body.appendChild(root);
      var parent = root;
      for (var i = 0; i < 1000; i++) {
        var div = document.createElement('div');
        div.textContent = i + '.';
        parent.appendChild(div);
        parent = div;
      }

      db.get(table_name, 'a').addBoth(function (x) {
        result = x;
        tx_no.push(db.getTxNo());
        document.body.removeChild(root);
        t1_fired = true;
      });
    });
  });

};


var test_nested_request_serial_atomic = function() {
  // each request create a new tx
  nested_request_test('atomic-serial', [1, 2, 3]);
};

var test_continuous_request_serial_atomic = function() {
  // each request create a new tx
  continuous_request_test('atomic-serial', [1, 2, 3]);
};

var test_nested_request_serial_strict_overflow = function() {
  // first create readwrite tx
  // second create readonly tx
  // third reuse
  nested_request_test('samescope-multirequest-serial', [1, 2, 2]);
};

var test_continuous_request_serial_strict_overflow = function() {
  // first create readwrite tx
  // second create readonly tx
  // third reuse
  continuous_request_test('samescope-multirequest-serial', [1, 2, 2]);
};

var test_nested_request_parallel_strict_overflow = function() {
  // first create readwrite tx
  // second create readonly tx because not same as previous tx
  // third create readonly tx because although it is same as preivous tx
  // the tx might have committed.
  nested_request_test('samescope-multirequest-parallel', [1, 2, 3]);
};


var test_nested_request_parallel_overflow = function() {
  // first create readwrite tx  (running tx)
  // reuse running tx
  // reuse running tx
  nested_request_test('multirequest-parallel', [1, 1, 1]);
};

var test_continuous_request_parallel_strict_overflow  = function() {
  // websql is slow in opening request.
  var exp_tx_no = options.mechanisms[0] == 'websql' ? [1, 2] : [2, 2];
  committed_continuous_request_test('samescope-multirequest-parallel', exp_tx_no);
};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



