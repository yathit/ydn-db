
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');

goog.require('ydn.db.Storage');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  //goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.con.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);
  //ydn.db.con.IndexedDb.DEBUG = true;
  //ydn.db.req.IndexedDb.DEBUG = true;

	basic_schema = new ydn.db.DatabaseSchema(1);
	basic_schema.addStore(new ydn.db.StoreSchema(table_name, 'id'));
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var options = {preference: ['indexeddb']};


var test_51_multiEntry = function () {
  var store_name = 'st';
  var db_name = 'test_51_multiEntry_2';
  var indexSchema = new ydn.db.IndexSchema('tag', ydn.db.DataType.TEXT, false, true);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false,
    ydn.db.DataType.TEXT, [indexSchema]);
  var schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);
  console.log('db ' + db);

  var objs = [
    {id:'qs0', value: 0, tag: ['a', 'b']},
    {id:'qs1', value: 1, tag: 'a'},
    {id:'at2', value: 2, tag: ['a', 'b']},
    {id:'bs1', value: 3, tag: 'b'},
    {id:'bs2', value: 4, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, tag: 'c'},
    {id:'st3', value: 6}
  ];

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
        assertEquals(tags[i] + ' count', exp_counts[i], counts[i]);
      }

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.put(store_name, objs).addCallback(function (value) {
    console.log([db + ' receiving put callback.', value]);

    var count_for = function (tag_name, idx) {
      var keyRange = ydn.db.KeyRange.only(tag_name);
      var q = db.query(store_name, 'tag', 'next', keyRange);

      q.fetch().addBoth(function (value) {
        console.log(db + ' fetch value: ' + JSON.stringify(value));
        counts[idx] = value.length;
        done++;
      });
    };

    for (var i = 0; i < total; i++) {
      count_for(tags[i], i);
    }

  });

};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



