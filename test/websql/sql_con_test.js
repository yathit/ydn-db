
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation;
var table_name = 't1';
var stubs;

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
  goog.debug.Logger.getLogger('ydn.db.con.WebSql').setLevel(goog.debug.Logger.Level.FINEST);

  ydn.db.con.WebSql.DEBUG = true;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var options = {
  preference: ['websql'],
  use_text_store: false
};

/**
 * Assert the two schema are similar
 * @param {ydn.db.DatabaseSchema} schema
 * @param {ydn.db.DatabaseSchema|DatabaseSchema} schema_json
 */
var assert_similar_schema = function(schema, schema_json) {
  console.log(['testing ', schema, schema_json]);
  assertEquals('# stores', schema.stores.length, schema_json.stores.length);
  assertEquals('# stores', schema.version, schema_json.version);
  for (var i = 0; i < schema.stores.length; i++) {
    var store = schema.stores[i];
    var store_json = schema_json.stores[i];
    assertEquals(i + ': name', store.name, store_json.name);
    assertEquals(i + ': type', store.type, store_json.type);
    assertEquals(i + ': keyPath', store.keyPath, store_json.keyPath);
    assertEquals(i + ': autoIncremenent', store.autoIncremenent,
        store_json.autoIncremenent);
    assertEquals('# indexes', store.indexes.length,
        store_json.indexes.length);

    for (var j = 0; j < store.indexes.length; j++) {
      var index = store.indexes[i];
      var index_json = store_json.indexes[i];
      assertEquals(i + ':' + j + ': index name', index.name, index_json.name);
      assertEquals(i + ':' + j + ': index type', index.type, index_json.type);
      //assertEquals(i + ':' + j + ': index keyPath', index.keyPath, index_json.keyPath);
    }

    store_json = store_json instanceof ydn.db.StoreSchema ?
        store_json : ydn.db.StoreSchema.fromJSON(store_json);
    assertTrue(i + ': similar', store.similar(store_json));
  }
  //console.log('test OK');
};

var test_2_sql_schema_sniffing = function() {

  var schema = new ydn.db.DatabaseSchema(1);
  var index = new ydn.db.IndexSchema('id.$t', true, ydn.db.DataType.TEXT, 'id.$t');
  var store = new ydn.db.StoreSchema(table_name, 'id', false, ydn.db.DataType.INTEGER, [index]);
  schema.addStore(store);

  var db_name = 'test_sql_con_6';
  var db = new ydn.db.Storage(db_name, schema, options);


  var schema_json = db.getSchema();

  assert_similar_schema(schema, schema_json);


  var t1_fired = false;
  var infos;

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        var stores = [];
        for (var key in infos) {
          if (schema.hasStore(key)) {
            stores.push(infos[key]);
          }
        }
        var sniff_schema = new ydn.db.DatabaseSchema(1, stores);
        assert_similar_schema(schema, sniff_schema);
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  db.transaction(function(t) {
    console.log('in tx')
    db.db_.table_info_(t, function(result) {
      infos = result;
      t1_fired = true;
    })
  }, [], ydn.db.TransactionMode.READ_WRITE);

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



