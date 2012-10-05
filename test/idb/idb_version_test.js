
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
  //goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.con.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);
  ydn.db.con.IndexedDb.DEBUG = true;

  this.db_name = 'test_db' + Math.random();
  this.store_name = 'st';
  this.store_schema = {name: this.store_name, keyPath: 'id'};
  this.options = {mechanisms: ['indexeddb']};
};

var deleteDb = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
  if (ydn.db.con.IndexedDb.indexedDb.deleteDatabase) {
    ydn.db.con.IndexedDb.indexedDb.deleteDatabase(this.db_name);
  } else {
    console.log('Delete database manually: ' + this.db_name);
  }
};


var schema_test = function(schema, to_delete) {

  console.log('testing schema: ' + JSON.stringify(schema));
  var db = new ydn.db.Storage(this.db_name, schema, this.options);

  var version = schema.version;

  var done, value;
  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('val', 1, value);
      var sh = db.getSchema();
      console.log(JSON.stringify(sh));
      assertEquals('version', version, sh.version);
      reachedFinalContinuation = true;
      if (to_delete) {
        deleteDb();
      }
    },
    100, // interval
    2000); // maxTimeout

  db.put(this.store_name, {'id': 1}).addCallback(function(ok) {
    value = ok;
    done = true;
  });
};



var test_10_no_db = function() {
  var schema = {stores: [this.store_schema]};
  schema_test(schema);
};


var test_11_same_ver = function() {
  var schema = {version: 1, stores: [this.store_schema]};
  schema_test(schema);
};


var test_12_ver_update = function() {
  var new_store = {name: 'nst' + Math.random(), keyPath: 'id'};
  var schema = {version: 2, stores: [this.store_schema, new_store]};
  schema_test(schema, true);
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



