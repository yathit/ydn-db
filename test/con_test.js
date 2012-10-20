
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.object');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, debug_console, db_name;
var store_name = 'st';
var stubs;

var setUp = function() {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  ydn.db.con.IndexedDb.DEBUG = true;

  db_name = 'test_db' + Math.random();

  store_schema = {name: store_name, keyPath: 'id'};

};

/**
 * @param {string=} name
 */
var deleteDb = function(name) {
  name = name || db_name;
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
  if (ydn.db.con.IndexedDb.indexedDb.deleteDatabase) {
    ydn.db.con.IndexedDb.indexedDb.deleteDatabase(name);
  } else {
    console.log('Delete database manually: ' + name);
  }
};


var schema_test = function(schema, to_delete, name) {

  name = name || db_name;
  console.log('testing schema: ' + JSON.stringify(schema));
  var db = new ydn.db.Storage(name, schema, options);

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

  db.put(store_name, {'id': 1}).addCallback(function(ok) {
    value = ok;
    done = true;
  });
};


var trival_db_name = 'test_' + Math.random();

var trival_schema_test = function(dbname) {
  var schema = {};

  var opt = ydn.object.clone(options);
  opt['used_text_store'] = false;
  var db = new ydn.db.Storage(dbname, schema, opt);
  var validated_schema = ydn.db.DatabaseSchema.fromJSON(db.getSchema());

  var done, act_schema;
  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {

      console.log([act_schema, validated_schema]);
      var diff = validated_schema.difference(act_schema);
      assertTrue('version diff: ' + diff, diff.length == 0);
      reachedFinalContinuation = true;

    },
    100, // interval
    2000); // maxTimeout

  db.getSchema(function(v) {
    act_schema = v;
    done = true;
  })

};

var test_10a_trival_schema = function() {
  trival_schema_test(trival_db_name);
};

var test_10b_trival_schema = function() {
  // this run is different because database already exists.
  trival_schema_test(trival_db_name);
  deleteDb(trival_db_name);
};

var test_12_no_db = function() {
  var schema = {Stores: [store_schema]};
  schema_test(schema);
};


var test_13a_same_ver = function() {
  var schema = {version: 1, Stores: [store_schema]};
  schema_test(schema);
};

var test_13b_same_ver_diff_schema = function() {
  var new_store = {name: 'nst' + Math.random(), keyPath: 'id'};
  var schema = {version: 1, Stores: [store_schema, new_store]};
  schema_test(schema);
};


var test_13c_ver_update = function() {
  var new_store = {name: 'nst' + Math.random(), keyPath: 'id'};
  var schema = {version: 2, Stores: [store_schema, new_store]};
  schema_test(schema, true);
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



