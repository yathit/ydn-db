
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');

goog.require('ydn.db.Storage');



var reachedFinalContinuation, schema, debug_console, db, objs;
var store_name = 't1';
var db_name = 'test_index_1';

var setUp = function() {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    //goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  var indexSchema = new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT, false, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
      ydn.db.schema.DataType.TEXT, [indexSchema]);
  schema = new ydn.db.schema.Database(1, [store_schema]);
  db = new ydn.db.Storage(db_name, schema, options);


  objs = [
    {id:'qs0', value: 0, tag: ['a', 'b']},
    {id:'qs1', value: 1, tag: 'a'},
    {id:'at2', value: 2, tag: ['a', 'b']},
    {id:'bs1', value: 3, tag: 'b'},
    {id:'bs2', value: 4, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, tag: 'c'},
    {id:'st3', value: 6}
  ];

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  reachedFinalContinuation = false;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_11_multiEntry_idb = function () {


  var tags = ['d', 'b', 'c', 'a', 'e'];
  var exp_counts = [1, 3, 2, 4, 0];
  var counts = [];
  var total = tags.length;
  var done = 0;

  waitForCondition(
      // Condition
      function () {
        return done == total;
      },
      // Continuation
      function () {

        for (var i = 0; i < total; i++) {
          assertEquals('for tag: ' + tags[i] + ' count', exp_counts[i], counts[i]);
        }

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  var count_for = function (tag_name, idx) {
    var keyRange = ydn.db.KeyRange.only(tag_name);
    var q = db.cursor(store_name, 'next', 'tag', keyRange);

    q.fetch().addBoth(function (value) {
      console.log(tag_name + ' ==> ' + JSON.stringify(value));
      counts[idx] = value.length;
      done++;
    });
  };

  for (var i = 0; i < total; i++) {
    count_for(tags[i], i);
  }


};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



