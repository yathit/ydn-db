// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db');
goog.require('ydn.db.crud.Storage');


var reachedFinalContinuation, basic_schema;


var setUp = function() {

};


var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};




var test_basic = function() {

  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var db_name = 'test-sync-basic';
  var db = new ydn.db.tr.Storage(db_name, schema);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;
  var a_out, b_out, c_out, type_out;

  waitForCondition(
    // Condition
    function() { return t1_fired; },
    // Continuation
    function() {
      assertEquals('a', 1, a_out);
      assertEquals('b', '3', b_out);
      assertEquals('c', 'ok', c_out.id);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  var oncompleted = function(type, e) {
    assertEquals('complete event', 'complete', type);
    t1_fired = true;
  };

  db.run(function tx_cb1 (idb, a, b, c) {

    type_out = db.getType();
  }, [table_name], 'readwrite', oncompleted, 1, '3', {id: 'ok'});
};




var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



