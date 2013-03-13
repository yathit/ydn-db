// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');
goog.require('ydn.db');
goog.require('ydn.db.core.Storage');


var reachedFinalContinuation;
var table_name = 't1';
var stubs;
var basic_schema = {
  stores: [
    {
      name: table_name,
      keyPath: 'id',
      type: 'TEXT'
    }]
};

var setUp = function() {
  ydn.debug.log('ydn.db', 'finest');
  ydn.db.con.IndexedDb.DEBUG = true;

};


var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_1_basic = function() {

  var db_name = 'test_tr_basic_2';
  options.thread = 'strict-overflow-serial';
  var db = new ydn.db.core.Storage(db_name, basic_schema, options);

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
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, val);
  db.get(table_name, 'a').addBoth(function (r) {
    var div = document.createElement('div');
    r.textContent = r.id + ' ' + r.value;
    document.body.appendChild(div);
    console.log('div added ' + r.textContent);
    db.get(table_name, 'a').addBoth(function (x) {
      result = x;
      t1_fired = true;
    });
  });

};






var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



