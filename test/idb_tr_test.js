
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
  ydn.db.IndexedDbWrapper.DEBUG = true;

	basic_schema = new ydn.db.DatabaseSchema(1);
  var index = new ydn.db.IndexSchema('id');
  var store = new ydn.db.StoreSchema(table_name, 'id', false, [index]);
	basic_schema.addStore(store);
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test12';
var options = {preference: ['indexeddb']};


var test_2_idb_basic = function() {


  var db_name = 'test_2_idb_basic2';
  var db = new ydn.db.Storage(db_name, basic_schema, options);

  var arr = [
    {id: 'a', value: 1},
    {id: 'b', value: 2},
    {id: 'c', value: 3}
  ];

  var amt = 7;

  var t1_fired = false;
  var t2_fired = false;

  waitForCondition(
      // Condition
      function() { return t2_fired; },
      // Continuation
      function() {
        reachedFinalContinuation = true;

      },
      100, // interval
      2000); // maxTimeout

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        db.get(table_name, 'a').addCallback(function(a_obj) {
          assertEquals('a value', 1+amt, a_obj.value);
          t2_fired = true;
        })
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    console.log('receiving value callback ' + JSON.stringify(value));

    var a_key = db.key(table_name, 'a');

    db.transaction(function() {
      a_key.get().addCallback(function(a_obj) {
        console.log('a_key get ' + JSON.stringify(a_obj));
        a_obj.value += amt;
        a_key.put(a_obj).addCallback(function(out) {
          t1_fired = true;
          assertEquals('tr done', 'a', out);
        });
      });
    }, [a_key]);

    var q = db.query(table_name);
    q.select('value');
    db.fetch(q).addCallback(function(q_result) {
      console.log('receiving fetch ' + JSON.stringify(q_result));
      t1_result = q_result;
      t1_fired = true;
    })
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



