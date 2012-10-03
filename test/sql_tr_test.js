
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
  //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.conn.WebSql').setLevel(goog.debug.Logger.Level.FINEST);


  goog.userAgent.product.ASSUME_SAFARI = true;

	basic_schema = new ydn.db.DatabaseSchema(1);
  var index = new ydn.db.IndexSchema('id');
  var store = new ydn.db.StoreSchema(table_name, 'id', false, undefined, [index]);
	basic_schema.addStore(store);
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test_sql_tr_12';


var test_2_sql_basic = function() {


  var db_name = 'test_2_sql_basic2';
  var db = new ydn.db.Storage(db_name, basic_schema);
  console.log(db.getDb());

  var arr = [
    {id: 'a', value: 1},
    {id: 'b', value: 2},
    {id: 'c', value: 3}
  ];

  var amt = 7;

  var t1_fired = false;
  var t2_fired = false;
  var tx_1, tx_2, tx_3;

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
    console.log(db + ' receiving value callback ' + JSON.stringify(value));

    db.run(function tx_1(tdb) {
      console.log(db + ' starting tr');
      tdb.get(table_name, 'a').addCallback(function(a_obj) {
        console.log(tdb + ' a get ' + JSON.stringify(a_obj));
        a_obj.value += amt;
        tdb.put(table_name, a_obj).addCallback(function(out) {
          console.log(tdb + ' a_obj put ' + JSON.stringify(a_obj));
          t1_fired = true;
          assertEquals('tr done', 'a', out);
        });
      });
    }, [table_name], ydn.db.TransactionMode.READ_WRITE);

    var q = db.query(table_name);
    q.select('value');
    console.log(db + 'fetching');
    db.fetch(q).addCallback(function(q_result) {
      console.log(db + ' receiving fetch ' + JSON.stringify(q_result));
      t1_result = q_result;
      t1_fired = true;
    })
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



