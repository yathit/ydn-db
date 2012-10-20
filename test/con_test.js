
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.object');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, debug_console, db_name;
var store_name = 'st';
var stubs;
options.used_text_store = false;

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

//
///**
// * Assert the two schema are similar
// * @param {ydn.db.DatabaseSchema} schema
// * @param {ydn.db.DatabaseSchema|DatabaseSchema} schema_json
// */
//var assert_similar_schema = function(schema, schema_json) {
//  console.log(['testing ', schema, schema_json]);
//  var stores = schema_json.Stores || schema_json.stores;
//  assertEquals('# stores', schema.stores.length, stores.length);
//  for (var i = 0; i < schema.stores.length; i++) {
//    var store = schema.stores[i];
//    var store_json = stores[i];
//    assertEquals(i + ': name', store.name, store_json.name);
//    assertEquals(i + ': type', store.type, store_json.type);
//    assertEquals(i + ': keyPath', store.keyPath, store_json.keyPath);
//    assertEquals(i + ':autoIncrementt', store.autoIncrement,
//        store_json.autoIncrement);
//    var indexes = store.Indexes || store.indexes;
//    assertEquals('# indexes', store.indexes.length,
//        indexes.length);
//
//    for (var j = 0; j < store.indexes.length; j++) {
//      var index = store.indexes[i];
//      var index_json = indexes[i];
//      assertEquals(i + ':' + j + ': index name', index.name, index_json.name);
//      assertEquals(i + ':' + j + ': index type', index.type, index_json.type);
//      //assertEquals(i + ':' + j + ': index keyPath', index.keyPath, index_json.keyPath);
//    }
//
//    store_json = store_json instanceof ydn.db.StoreSchema ?
//        store_json : ydn.db.StoreSchema.fromJSON(store_json);
//    assertTrue(i + ': similar', store.similar(store_json));
//  }
//  //console.log('test OK');
//};
//
//var test_2_schema_sniffing = function() {
//
//  var index = new ydn.db.IndexSchema('id.$t', ydn.db.DataType.TEXT, true);
//  var store = new ydn.db.StoreSchema(store_name, 'id', false, ydn.db.DataType.NUMERIC, [index]);
//  var schema = new ydn.db.DatabaseSchema(1, [store]);
//
//  var db_name = 'test_2_sql_schema_sniffing_8';
//  var db = new ydn.db.Storage(db_name, schema, options);
//
//
//  var schema_json = db.getSchema();
//
//
//  var t1_fired = false;
//  var sniff_schema;
//
//  waitForCondition(
//      // Condition
//      function() { return t1_fired; },
//      // Continuation
//      function() {
//        console.log([schema, sniff_schema]);
//        assertTrue(schema.similar(sniff_schema));
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      1000); // maxTimeout
//
//
//  db.transaction(function(t) {
//    console.log('in tx')
//    db.db_.getSchema(function(result) {
//      sniff_schema = result;
//      t1_fired = true;
//    }, t)
//  }, [], ydn.db.base.TransactionMode.READ_WRITE);
//
//};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



