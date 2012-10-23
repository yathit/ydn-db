
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, debug_console;


options.usedTextStore = false;


var setUp = function () {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  //ydn.db.con.IndexedDb.DEBUG = true;
  ydn.db.con.IndexedDb.DEBUG = true;
  reachedFinalContinuation = false;

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var test_11_put = function() {

  var db_name = 'test_' + Math.random();
  // autoSchema database
  var db = new ydn.db.Storage(db_name, undefined, options);
  var sh = db.getSchema();
  assertEquals('no store', 0, sh.Stores.length);
  assertTrue('auto schema', db.isAutoSchema());
  var table_name = 'st1';
  var store_schema = {'name': table_name, 'keyPath': 'id', 'type': 'TEXT'};

  var hasEventFired = false;
  var result;
  var value = 'a' + Math.random();

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('get back', value + ' not', result);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout


  db.put(store_schema, {id: 'a', value: value, remark: 'put test'}).addCallback(function(y) {
    //console.log('receiving value callback.');

    db.get(store_name, 'a').addCallback(function(x) {
      result = x.value;
      hasEventFired = true;
    })
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};




var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



