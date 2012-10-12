
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
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

var db_name = 'test124';
var options = {Mechanisms: ['indexeddb']};

















var test_83_fetch_keys = function () {
  var store_name1 = 'st1';
  var store_name2 = 'st2';
  var db_name = 'test83';
  var indexSchema = new ydn.db.IndexSchema('id', undefined, true);
  var store_schema1 = new ydn.db.StoreSchema(store_name1, 'id', false, undefined, [indexSchema]);
  var store_schema2 = new ydn.db.StoreSchema(store_name2, 'id');
  var schema = new ydn.db.DatabaseSchema(1, [store_schema1, store_schema2]);
  var db = new ydn.db.Storage(db_name, schema, options);


  var objs1 = [];
  var n = ydn.db.req.IndexedDb.REQ_PER_TX * 2.5;
  for (var i = 0; i < n; i++) {
    objs1.push({id: 'a' + i, value: Math.random()});
  }

  var objs2 = [];
  for (var i = 0; i < n; i++) {
    objs2.push({id: 'b' + i, value: Math.random()});
  }
  var ids = [2,
    ydn.db.req.IndexedDb.REQ_PER_TX,
    ydn.db.req.IndexedDb.REQ_PER_TX+1,
    2*ydn.db.req.IndexedDb.REQ_PER_TX+1];
  var keys = [];
  for (var i = 0; i < ids.length; i++) {
    keys.push(new ydn.db.Key(store_name1, objs1[ids[i]].id));
  }
  for (var i = 0; i < ids.length; i++) {
    keys.push(new ydn.db.Key(store_name2, objs2[ids[i]].id));
  }

  var put1_done, put2_done;

  waitForCondition(
      // Condition
      function () {
        return put1_done && put2_done;
      },
      // Continuation
      function () {

        var get_done, results;
        waitForCondition(
            // Condition
            function () {
              return get_done;
            },
            // Continuation
            function () {
              assertEquals('length', ids.length * 2, results.length);
              for (var i = 0; i < ids.length; i++) {
                assertEquals('store 1 ' + i, objs1[ids[i]].value, results[i].value);
              }
              for (var i = 0; i < ids.length; i++) {
                assertEquals('store 2 ' + i, objs2[ids[i]].value, results[i+ids.length].value);
              }

              reachedFinalContinuation = true;
            },
            100, // interval
            2000); // maxTimeout


        db.get(keys).addCallback(function (value) {
          console.log('fetch value: ' + JSON.stringify(value));
          results = value;
          get_done = true;
        });

      },
      100, // interval
      2000); // maxTimeout

  db.put(store_name1, objs1).addCallback(function (value) {
    console.log(['receiving value callback.', value]);
    put1_done = true;
  });
  db.put(store_name2, objs2).addCallback(function (value) {
    console.log(['receiving value callback.', value]);
    put2_done = true;
  });

};


var test_85_query_start_with = function () {
  var store_name = 'ts1';
  var db_name = 'test_81';
  var schema = new ydn.db.DatabaseSchema(1);
  // NOTE: key also need to be indexed.
  var indexSchema = new ydn.db.IndexSchema('id', undefined, true);
  schema.addStore(new ydn.db.StoreSchema(store_name, 'id', false, undefined, [indexSchema]));
  //schema.addStore(new ydn.db.StoreSchema(store_name, 'id'));
  var db = new ydn.db.Storage(db_name, schema, options);

  var objs = [
    {id:'qs1', value:Math.random()},
    {id:'qs2', value:Math.random()},
    {id:'qt', value:Math.random()}
  ];

  var put_value_received;
  var put_done;
  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertArrayEquals('put objs', [objs[0].id, objs[1].id, objs[2].id],
        put_value_received);

      var get_done;
      var get_value_received;
      waitForCondition(
        // Condition
        function () {
          return get_done;
        },
        // Continuation
        function () {
          reachedFinalContinuation = true;
        },
        100, // interval
        2000); // maxTimeout


      var key_range = ydn.db.KeyRange.starts('qs');
      var q = new ydn.db.Cursor(store_name, 'id', 'next', key_range);
      db.fetch(q).addCallback(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        assertEquals('obj length', objs.length - 1, value.length);
        assertObjectEquals('get', objs[0], value[0]);
        assertObjectEquals('get', objs[1], value[1]);

        get_done = true;
      });

    },
    100, // interval
    2000); // maxTimeout

  db.put(store_name, objs).addCallback(function (value) {
    console.log(['receiving value callback.', value]);
    put_value_received = value;
    put_done = true;
  });

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



