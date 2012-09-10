
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Core');
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
  ydn.db.IndexedDbWrapper.DEBUG = true;

	basic_schema = new ydn.db.DatabaseSchema(1);
  var index = new ydn.db.IndexSchema('id');
  var store = new ydn.db.StoreSchema(table_name, 'id', false, [index]);
	basic_schema.addStore(store);
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_1_idb_basic = function() {

  var options = {preference: ['indexeddb']};
  var db_name = 'test_core_basic_1';
  var db = new ydn.db.Core(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        assertSame('correct obj', val, result);
        reachedFinalContinuation = true;

      },
      100, // interval
      2000); // maxTimeout

  db.transaction(function(tx) {
    console.log('tx started.');
    var store = tx.objectStore(table_name);
    store.put(val);
    tx.addEventListener('complete', function(e) {
      console.log('put ok: ' + e.target.result);
      store = tx.objectStore(table_name);
      store.get('a');
      tx.addEventListener('complete', function(e) {
        t1_fired = true;
        result = e.target.result;
        console.log('get ok: ' + JSON.stringify(result));
      }, false);
    }, false);
  }, table_name, 'readwrite');
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



