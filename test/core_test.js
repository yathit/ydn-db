// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.core.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';
var stubs;

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
  ydn.db.adapter.IndexedDb.DEBUG = true;

	basic_schema = new ydn.db.DatabaseSchema(1);
  var index = new ydn.db.IndexSchema('id');
  var store = new ydn.db.StoreSchema(table_name, 'id', false, [index]);
	basic_schema.addStore(store);
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_1_idb_basic = function() {

  var db_type =  'indexeddb';
  var options = {preference: [db_type]};
  var db_name = 'test_core_basic_1';
  var db = new ydn.db.core.Storage(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        assertEquals('database type', db_type, db.type());
        assertEquals('correct obj', val.value, result.value);
        reachedFinalContinuation = true;

      },
      100, // interval
      2000); // maxTimeout

  db.transaction(function(tx) {
    console.log('tx started.');
    var store = tx.objectStore(table_name);
    var request = store.put(val);
    request.onsuccess = function(e) {
      console.log('put ok: ' + e.target.result);
      store.get('a').onsuccess = function(e) {
        t1_fired = true;
        result = e.target.result;
        console.log('get ok: ' + JSON.stringify(result));
      };
    };
  }, table_name, 'readwrite');
};



var test_2_websql_basic = function() {

  var db_type =  'websql';
  var options = {preference: [db_type]};
  var db_name = 'test_core_basic_1';
  var db = new ydn.db.core.Storage(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;

  waitForCondition(
    // Condition
    function() { return t1_fired; },
    // Continuation
    function() {
      assertEquals('database type', db_type, db.type());
      assertEquals('correct val', val.value, result.value);
      reachedFinalContinuation = true;

    },
    100, // interval
    2000); // maxTimeout

  db.transaction(function(tx) {
    // note _default_ column
    tx.executeSql('INSERT OR REPLACE INTO ' + table_name +
      ' (id, _default_) VALUES (?, ?)', [val.id, JSON.stringify(val)], function(e) {
      console.log(e);
      console.log('Received put result ');
      tx.executeSql('SELECT * FROM ' + table_name +
        ' WHERE id = ?', [val.id], function(transaction, e) {
        console.log(e);
        var row = e.rows.item(0);
        result = JSON.parse(row['_default_']);
        console.log('Received get result ' + result);
        t1_fired = true;
      }, function error_cb(e) {
        console.log(e);
        fail('wrong sql?');
      })
    });
  }, table_name, 'readwrite');
};



var test_3_local_basic = function() {

  var db_type =  'localstorage';
  var options = {preference: [db_type]};
  var db_name = 'test_core_basic_1';
  var db = new ydn.db.core.Storage(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        assertEquals('database type', db_type, db.type());
        assertEquals('correct val', val.value, result.value);
        reachedFinalContinuation = true;

      },
      100, // interval
      2000); // maxTimeout

  db.transaction(function(tx) {
    // note _default_ column
    tx.setItem(val.id, JSON.stringify(val));
    result =  JSON.parse(tx.getItem(val.id));
    t1_fired = true;
  }, table_name, 'readwrite');
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



