
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Storage');
goog.require('ydn.testing');


var reachedFinalContinuation;

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);


  this.table_name = 't1';
  this.basic_schema = new ydn.db.DatabaseSchema(1);
  this.basic_schema.addStore(new ydn.db.StoreSchema(this.table_name));
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);

};

var db_name = 'test1';

var test_1_json_config = function() {
  var store = {name:'todo', keyPath:"timeStamp"};

  var schema_ver1 = {
    version: 2,
    size: 1 * 1024 * 1024, // 1 MB,
    stores:[store]
  };

  var db = new ydn.db.Storage('todos_test', [schema_ver1]);

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
      },
      100, // interval
      2000); // maxTimeout

  db.get('todo').addCallback(function(value) {
    console.log('receiving value callback.' + JSON.stringify(value));
    put_value = value;
    hasEventFired = true;
  });

};

var test_2_json_config_in_out = function() {

	var store_name = 't1';
	var put_obj_dbname = 'testdb2';
	var schema = new ydn.db.DatabaseSchema(1);
	schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));
	var db = new ydn.db.Storage(put_obj_dbname, [schema]);

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
			assertTrue('put a 1', put_value_received);
      console.log('put OK.');

      var config = db.getConfig();
      var schemas = [];
      for (var i = 0; i < config.schemas.length; i++) {
        schemas.push(ydn.db.DatabaseSchema.fromJSON(config.schemas[i]));
      }
      console.log([config, schemas]);
      var db2 = new ydn.db.Storage(config.db_name, schemas);

      var get_done;
      var get_value_received;
      waitForCondition(
        // Condition
        function() { return get_done; },
        // Continuation
        function() {
          assertObjectEquals('get ', put_value, get_value_received);
          reachedFinalContinuation = true;
        },
        100, // interval
        1000); // maxTimeout

      db2.get(store_name, key).addCallback(function(value) {
        console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
        get_value_received = value;
        get_done = true;
      });

		},
		100, // interval
		1000); // maxTimeout

	db.put(store_name, put_value).addCallback(function(value) {
		console.log('receiving value callback.');
		put_value_received = value;
		put_done = true;
	});



};




var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



