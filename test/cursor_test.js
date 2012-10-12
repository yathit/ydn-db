
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';
var stubs;

var setUp = function () {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  //goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);

  var version = 1;
  basic_schema = new ydn.db.DatabaseSchema(version);
  var store;

  basic_schema = new ydn.db.DatabaseSchema(1);
  var index1 = new ydn.db.IndexSchema('id');
  var index2 = new ydn.db.IndexSchema('value', ydn.db.DataType.FLOAT);
  store = new ydn.db.StoreSchema(table_name, 'id', false, undefined, [index1, index2]);

  basic_schema.addStore(store);
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test_cursor_1';



var test_1_iteration = function () {
  var store_name = 'st';
  var db_name = 'test_42_13';
  var indexSchema = new ydn.db.IndexSchema('value', ydn.db.DataType.INTEGER, true);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false,
    ydn.db.DataType.TEXT, [indexSchema]);
  var schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);
  console.log('db ' + db);

  var objs = [
    {id:'qs0', value: 0, type: 'a'},
    {id:'qs1', value: 1, type: 'a'},
    {id:'at2', value: 2, type: 'b'},
    {id:'bs1', value: 3, type: 'b'},
    {id:'bs2', value: 4, type: 'c'},
    {id:'bs3', value: 5, type: 'c'},
    {id:'st3', value: 6, type: 'c'}
  ];


  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', 2, result.length);
      assertArrayEquals([objs[3], objs[4]], result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout


  db.put(store_name, objs).addCallback(function (value) {
    console.log([db + ' receiving put callback.', value]);

    var q = db.query(store_name, 'next', 'value', 2, 5, true, true);

    q.fetch().addBoth(function (value) {
      console.log(db + ' fetch value: ' + JSON.stringify(value));
      result = value;
      done = true;
    });
  }).addErrback(function(e) {
      console.log(e.stack);
      console.log(e);
      assertFalse(true, 'Error');
    });

};





var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



