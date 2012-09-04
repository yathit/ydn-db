
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
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
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);
  ydn.db.IndexedDb.DEBUG = true;

  this.db_name = 'test_db' + Math.random();
  this.store_name = 'st';
  this.store_schema = {name: this.store_name, keyPath: 'id'};
  this.options = {preference: ['indexeddb']};
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
  if (ydn.db.IndexedDb.deleteDatabase) {
    ydn.db.IndexedDb.deleteDatabase(this.db_name);
  } else {
    console.log('Delete database manually: ' + this.db_name);
  }
};


var schema_test = function(schema) {

  console.log('testing schema: ' + JSON.stringify(schema));
  var db = new ydn.db.Storage(this.db_name, schema, this.options);

  var done, value;
  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      reachedFinalContinuation = 1 == value;
    },
    100, // interval
    2000); // maxTimeout

  db.put(this.store_name, {'id': 1}).addCallback(function(ok) {
    console.log('got: ' + ok);
    value = ok;
    done = true;
  });
};



var test_10_no_db = function() {
  var schema = {stores: [this.store_schema]};
  schema_test(schema);
};


var test_11_no_db = function() {
  var schema = {version: 1, stores: [this.store_schema]};
  schema_test(schema);
};


var test_12_no_db = function() {
  var schema = {version: 2, stores: [this.store_schema]};
  schema_test(schema);
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



