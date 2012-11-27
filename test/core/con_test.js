
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


var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

/**
 * @param {string=} name
 */
var deleteDb = function(name) {
  name = name || db_name;

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

  var db = new ydn.db.Storage(dbname, schema, options);
  var validated_schema = new ydn.db.schema.Database(db.getSchema());

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
    act_schema = new ydn.db.schema.Database(v);
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
  var schema = {stores: [store_schema]};
  schema_test(schema);
};


var test_13a_same_ver = function() {
  var schema = {version: 1, stores: [store_schema]};
  schema_test(schema);
};

var test_13b_same_ver_diff_schema = function() {
  var new_store = {name: 'nst' + Math.random(), keyPath: 'id'};
  var schema = {version: 1, stores: [store_schema, new_store]};
  schema_test(schema);
};


var test_13c_ver_update = function() {
  var new_store = {name: 'nst' + Math.random(), keyPath: 'id'};
  var schema = {version: 2, stores: [store_schema, new_store]};
  schema_test(schema, true);
};


var test_21_add_store = function() {
  var done, sh_len;
  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('1 store', 1, sh_len);
      assertTrue('still auto schema', db.isAutoSchema());
      reachedFinalContinuation = true;

    },
    100, // interval
    2000); // maxTimeout

  var db_name = 'test_' + Math.random();
  // autoSchema database
  var db = new ydn.db.Storage(db_name, undefined, options);
  var sh = db.getSchema();
  assertEquals('no store', 0, sh.stores.length);
  assertTrue('auto schema', db.isAutoSchema());
  var store_name = 'st' + Math.random();
  var store = {name: store_name, keyPath: 'id'};
  var v = Math.random();
  db.put(store, {id: 'a', value: v});
  db.getSchema(function(sh) {
    console.log(sh);
    sh_len = sh.stores.length;
    done = true;
  });
};



/**
* Assert the two schema are similar
* @param {ydn.db.schema.Database} schema
* @param {ydn.db.schema.Database|DatabaseSchema} schema_json
*/
var assert_similar_schema = function(schema, schema_json) {
  console.log(['testing ', schema, schema_json]);
  var stores = schema_json.stores || schema_json.stores;
  assertEquals('# stores', schema.stores.length, stores.length);
  for (var i = 0; i < schema.stores.length; i++) {
    var store = schema.stores[i];
    var store_json = stores[i];
    assertEquals(i + ': name', store.name, store_json.name);
    assertEquals(i + ': type', store.type, store_json.type);
    assertEquals(i + ': keyPath', store.keyPath, store_json.keyPath);
    assertEquals(i + ':autoIncrementt', store.autoIncrement,
        store_json.autoIncrement);
    var indexes = store.Indexes || store.indexes;
    assertEquals('# indexes', store.indexes.length,
        indexes.length);

    for (var j = 0; j < store.indexes.length; j++) {
      var index = store.indexes[i];
      var index_json = indexes[i];
      assertEquals(i + ':' + j + ': index name', index.name, index_json.name);
      assertEquals(i + ':' + j + ': index type', index.type, index_json.type);
      //assertEquals(i + ':' + j + ': index keyPath', index.keyPath, index_json.keyPath);
    }

    store_json = store_json instanceof ydn.db.schema.Store ?
        store_json : ydn.db.schema.Store.fromJSON(store_json);
    assertTrue(i + ': similar', store.similar(store_json));
  }
  //console.log('test OK');
};

var test_2_schema_sniffing = function() {

  var index = new ydn.db.schema.Index('id.$t', ydn.db.schema.DataType.TEXT, true);
  var store = new ydn.db.schema.Store(store_name, 'id', false, ydn.db.schema.DataType.NUMERIC, [index]);
  var schema = new ydn.db.schema.Database(1, [store]);

  var db_name = 'test_2_sql_schema_sniffing_8';
  var db = new ydn.db.Storage(db_name, schema, options);


  var schema_json = db.getSchema();


  var t1_fired = false;
  var sniff_schema;

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        console.log([schema, sniff_schema]);
        assertTrue(schema.similar(sniff_schema));
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  db.transaction(function(t) {
    console.log('in tx')
    db.db_.getSchema(function(result) {
      sniff_schema = result;
      t1_fired = true;
    }, t)
  }, [], ydn.db.base.TransactionMode.READ_WRITE);

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



