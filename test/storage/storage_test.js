
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Storage');
goog.require('ydn.testing');


var reachedFinalContinuation, debug_console, stubs;

var setUp = function() {

  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
  }

  //stubs = new goog.testing.PropertyReplacer();

  var table_name = 't1';
  var store = new ydn.db.schema.Store(table_name);
  var basic_schema = new ydn.db.schema.Database(1, [store]);

};

var tearDown = function() {
  //stubs.reset();
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test1';


var test_1_json_trival_config = function() {

  var db_name = 'todos_test_9';
  var db = new ydn.db.Storage(db_name);

  //db.setItem('some-value', 'ok');

  var hasEventFired = false;
  var key = 'some-value';
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('put a 1', key, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  //db.getItem('some-value')
  db.put('st', {foo: 'bar'}, key).addBoth(function(value) {
    console.log('receiving value callback.' + JSON.stringify(value));
    put_value = value;
    hasEventFired = true;
  });
};




var test_0_json_config_empty_table = function() {
  var store = {name:'todo', keyPath:"timeStamp"};

  var schema_ver1 = {
    stores:[store]
  };

  var db = new ydn.db.Storage('todos_test_2', schema_ver1);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertArrayEquals('empry table', [], put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  db.values('todo').addCallback(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_1_json_config = function() {
  var store = {name:'todo', keyPath:"timeStamp"};

  var schema_ver1 = {
    version: 2,
    stores:[store]
  };

  var db = new ydn.db.Storage('todos_test_3', schema_ver1);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertArrayEquals('put a 1', [], put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  var iter = new ydn.db.ValueCursors('todo');
  db.values(iter).addCallback(function(value) {
    console.log('receiving value callback.' + JSON.stringify(value));
    put_value = value;
    hasEventFired = true;
  });
};

var test_2_json_config_in_out = function() {

	var store_name = 't1';
	var put_obj_dbname = 'testdb3';
  var store = new ydn.db.schema.Store(store_name, 'id');
	var schema = new ydn.db.schema.Database(1, [store]);

	var db = new ydn.db.Storage(put_obj_dbname, schema);

	var key = 'a';
	var put_done = false;
	var put_value = {value: Math.random(), 'remark': 'testing'};
	put_value.id = key;
	var put_value_received;

	waitForCondition(
		// Condition
		function() { return put_done; },
		// Continuation
		function() {
			assertEquals('put a 1', key, put_value_received);
      console.log('put OK.');

      var schema = db.getSchema();
      console.log(schema);
      var db_name = db.getName();
      db.close();
      var db2 = new ydn.db.Storage(db_name, schema);

      var get_done;
      var get_value_received;
      waitForCondition(
        // Condition
        function() { return get_done; },
        // Continuation
        function() {
          assertObjectEquals('get ', put_value, get_value_received);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db2.getName(), db2.getType());
          db2.close();
        },
        100, // interval
        1000); // maxTimeout

      db2.get(store_name, key).addBoth(function(value) {
        console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
        get_value_received = value;
        get_done = true;
      });

		},
		100, // interval
		1000); // maxTimeout

	db.put(store_name, put_value).addBoth(function(value) {
		console.log('receiving value callback.');
		put_value_received = value;
		put_done = true;
	});

};

var test_4_lazy_init = function() {
  var db_name = 'test_4_lazy_init';
  var db = new ydn.db.Storage();
  var value =  {foo: 'a1 object'};
  var get_done, result;

  waitForCondition(
      // Condition
      function() { return get_done; },
      // Continuation
      function() {
        assertObjectEquals('get ', value, result);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  db.put('st', value, 'a1');
  db.get('st', 'a1').addBoth(function(x) {
    result = x;
    get_done = true;
  });

  db.setName('lazy-db');
};


var thread_test = function(thread, exp_tx_no) {
  var options = {
    thread: thread
  };
  var schema = {
    stores: [
      {
        name: 'st'
      }]
  };
  var db = new ydn.db.Storage('test_strict_overflow_serial_thread', schema, options);

  var get_done;
  waitForCondition(
      // Condition
      function() { return get_done; },
      // Continuation
      function() {
        assertArrayEquals('tx no ', exp_tx_no, tx_no);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var tx_no = [];
  db.addEventListener(ydn.db.events.Types.DONE, function() {
    for (var i = 1; i <= 3; i++) {
      db.put('st', {foo: 'bar'}, i).addBoth(function(x) {
        tx_no.push(db.getTxNo());
      });
    }
    db.get('st', 1).addBoth(function(x) {
      tx_no.push(db.getTxNo());
      get_done = true;
    });

  });
};

var test_atomic_serial_thread = function() {

  thread_test('atomic-serial', [1, 2, 3, 4]);

};


var test_strict_overflow_serial_thread = function() {

  thread_test('strict-overflow-serial', [1, 1, 1, 2]);

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



