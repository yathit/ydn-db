// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.tr.Storage');
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
  ydn.db.con.IndexedDb.DEBUG = true;

	basic_schema = new ydn.db.schema.Database(1);
  var index = new ydn.db.schema.Index('id');
  var store = new ydn.db.schema.Store(table_name, 'id', false, undefined, [index]);
	basic_schema.addStore(store);
};


var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_1_basic = function() {

  var db_type =  'indexeddb';
  var options = {Mechanisms: [db_type]};
  var db_name = 'test_tr_basic_1';
  var db = new ydn.db.tr.Storage(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        assertEquals('correct obj', val.value, result.value);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout

  db.run(function tx_cb1 (idb) {
    console.log('tr start: ' + idb);
    assertEquals('type', db_type, idb.type());
    var tx = idb.getTx();
    assertNotUndefined(tx);
    assertNotNull(tx);
    // assertNull(tx.error); // accessing error object will cause tx to commit ?
    console.log(idb + ' tx started with ' + idb.type() + ' ' + tx);
    var store = tx.objectStore(table_name);
    var put_req = store.put(val);
    put_req.onsuccess = function(x) {
      console.log(idb + ' put ' + x);
      var get_req = store.get(val.id);
      get_req.onsuccess = function(e) {
        console.log(idb + ' get ' + e);
        result = e.target.result;
        t1_fired = true;
      };
    };
  }, table_name, 'readwrite');
};




var test_2_opt_arg = function() {


  var db_name = 'test_tr_opt_arg_1';
  var db = new ydn.db.tr.Storage(db_name, basic_schema);

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
    },
    100, // interval
    2000); // maxTimeout


  var oncompleted = function(type, e) {
    assertEquals('complete event', 'complete', type);
    t1_fired = true;
  };

  db.run(function tx_cb1 (idb, a, b, c) {
    a_out = a;
    b_out = b;
    c_out = c;
    type_out = idb.type();
  }, table_name, 'readwrite', oncompleted, 1, '3', {id: 'ok'});
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



