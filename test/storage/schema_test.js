
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, debug_console;



var setUp = function () {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  //ydn.db.con.IndexedDb.DEBUG = true;
  ydn.db.con.IndexedDb.DEBUG = true;
  reachedFinalContinuation = false;

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var test_auto_schema = function() {

  var db_name = 'test_' + Math.random();
  // autoSchema database
  var db = new ydn.db.Storage(db_name, undefined, options);
  var sh = db.getSchema();
  assertEquals('no store', 0, sh.stores.length);
  assertUndefined('auto schema', sh.version);
  var table_name = 'st1';
  var store_schema = {'name': table_name, 'keyPath': 'id', 'type': 'TEXT'};

  var hasEventFired = false;
  var result;
  var value = 'a' + Math.random();

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('get back', value, result);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(store_schema, {id: 'a', value: value, remark: 'put test'}).addCallback(function(y) {
    //console.log('receiving value callback.');

    db.get(table_name, 'a').addCallback(function(x) {
      result = x.value;
      hasEventFired = true;
    })
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};



var test_composite_key_schema = function() {
  var db_name = 'test' + Math.random();
  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: ['x', 'y'],
        type: ['TEXT', 'TEXT']
      }
    ]
  };

  var ver, oldVer, ver2, oldVer2;
  var done = false;


  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertEquals('version 1', 1, ver);
        assertNaN('old version 1', oldVer);
        assertEquals('version 2', 1, ver2);
        assertEquals('old version 2', 1, oldVer2);

        reachedFinalContinuation = true;

      },
      100, // interval
      2000); // maxTimeout


  var db = new ydn.db.Storage(db_name, schema, options);
  db.addEventListener('done', function(e) {
    ver = e.getVersion();
    oldVer = e.getOldVersion();
    db.close();
    var db2 = new ydn.db.Storage(db_name, schema, options);
    db2.addEventListener('done', function (e) {
      ver2 = e.getVersion();
      oldVer2 = e.getOldVersion();
      ydn.db.deleteDatabase(db2.getName(), db2.getType());
      db2.close();
      done = true;
    })
  })
};


var test_composite_index_schema = function() {
  var db_name = 'test' + Math.random();
  var schema = {
    stores: [{
      name: 'st',
      indexes: [{
        name: 'x, y',
        keyPath: ['x', 'y'],
        type: ['TEXT', 'TEXT']
      }]
    }]
  };

  var ver, oldVer, ver2, oldVer2;
  var done = false;


  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertEquals('version 1', 1, ver);
        assertNaN('old version 1', oldVer);
        assertEquals('version 2', 1, ver2);
        assertEquals('old version 2', 1, oldVer2);

        reachedFinalContinuation = true;

      },
      100, // interval
      2000); // maxTimeout


  var db = new ydn.db.Storage(db_name, schema, options);
  db.addEventListener('done', function(e) {
    ver = e.getVersion();
    oldVer = e.getOldVersion();
    db.close();
    var db2 = new ydn.db.Storage(db_name, schema, options);
    db2.addEventListener('done', function (e) {
      ver2 = e.getVersion();
      oldVer2 = e.getOldVersion();
      ydn.db.deleteDatabase(db2.getName(), db2.getType());
      db2.close();
      done = true;
    })
  })
};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



