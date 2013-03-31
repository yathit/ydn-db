
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db');
goog.require('ydn.debug');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, debug_console;



var setUp = function () {
  // ydn.debug.log('ydn.db', 'finest');
  //ydn.db.con.IndexedDb.DEBUG = true;
  //ydn.db.con.IndexedDb.DEBUG = true;
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


var version_change_test = function(schema1, schema2, is_final, msg) {
  var db_name = 'test' + Math.random();
  msg = msg || '';

  var ver, oldVer, ver2, oldVer2;
  var done = false;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertNotNaN(msg + 'change_test version 1', ver);
        assertNaN(msg + 'change_test old version 1', oldVer);
        assertEquals(msg + 'change_test version 2', (ver + 1), ver2);
        assertEquals(msg + 'change_test old version 2', ver, oldVer2);

        if (is_final) {
          reachedFinalContinuation = true;
        }

      },
      100, // interval
      2000); // maxTimeout


  var db = new ydn.db.Storage(db_name, schema1, options);
  db.addEventListener('ready', function(e) {
    // console.log(db.getSchema(function (s) {console.log(s)}));
    ver = e.getVersion();
    oldVer = e.getOldVersion();
    db.close();
    var db2 = new ydn.db.Storage(db_name, schema2, options);
    db2.addEventListener('ready', function (e) {
      // console.log(db.getSchema(function (s) {console.log(s)}));
      ver2 = e.getVersion();
      oldVer2 = e.getOldVersion();
      ydn.db.deleteDatabase(db2.getName(), db2.getType());
      db2.close();
      done = true;
    })
  })
};


var test_add_store = function () {
  var schema1 = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema2 = {
    stores: [
      {
        name: 'st'
      },
      {
        name: 'st2'
      }
    ]
  };
  version_change_test(schema1, schema2, true);
};

var test_remove_store = function () {
  var schema2 = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema1 = {
    stores: [
      {
        name: 'st'
      },
      {
        name: 'st2'
      }
    ]
  };
  version_change_test(schema1, schema2, true);
};

var test_rename_store = function () {
  var schema2 = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema1 = {
    stores: [
      {
        name: 'st2'
      }
    ]
  };
  version_change_test(schema1, schema2, true);
};

var test_out_of_line_to_in_line_key = function () {
  var schema1 = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema2 = {
    stores: [
      {
        name: 'st',
        keyPath: 'id'
      }
    ]
  };
  version_change_test(schema1, schema2, true);
};

var version_unchange_test = function(schema, is_final, msg) {
  var db_name = 'test' + Math.random();
  msg = msg || '';

  var ver, oldVer, ver2, oldVer2;
  var done = false;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        // console.log([ver, oldVer, ver2, oldVer2]);
        assertNotNaN(msg + 'unchange_test version 1', ver);
        assertNaN(msg + 'unchange_test old version 1', oldVer);
        assertEquals(msg + 'unchange_test version 2, no change', ver, ver2);
        assertEquals(msg + 'unchange_test old version 2, no change', ver, oldVer2);

        if (is_final) {
          reachedFinalContinuation = true;
        }

      },
      100, // interval
      2000); // maxTimeout

  var db = new ydn.db.Storage(db_name, schema, options);
  db.addEventListener('ready', function(e) {
    ver = e.getVersion();
    oldVer = e.getOldVersion();
    db.close();
    var db2 = new ydn.db.Storage(db_name, schema, options);
    db2.addEventListener('ready', function (e) {
      ver2 = e.getVersion();
      oldVer2 = e.getOldVersion();
      ydn.db.deleteDatabase(db2.getName(), db2.getType());
      db2.close();
      done = true;
    })
  })
};

var test_keyPath = function() {

  var schema = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema2 = {
    stores: [
      {
        name: 'st',
        keyPath: 'id',
        type: 'TEXT'
      }
    ]
  };
  version_unchange_test(schema);
  version_unchange_test(schema2);
  version_change_test(schema, schema2);
  version_change_test(schema2, schema, true);
};

var test_multiEntry = function() {

  var schema = {
    stores: [
      {
        name: 'st',
        indexes: [{
          name: 'idx',
          type: 'TEXT'
        }]
      }
    ]
  };
  var schema2 = {
    stores: [
      {
        name: 'st',
        indexes: [{
          name: 'idx',
          type: 'TEXT',
          multiEntry: true
        }]
      }
    ]
  };

  version_change_test(schema2, schema, false, 'from multiEntry');
  version_change_test(schema, schema2, false, 'to multiEntry');

  version_unchange_test(schema, false, 'multiEntry=false:');
  version_unchange_test(schema2, true, 'multiEntry=true:');
};



var test_composite_key_schema = function() {

  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: 'x',
        type: 'TEXT'
      }
    ]
  };

  var schema2 = {
    stores: [
      {
        name: 'st',
        keyPath: ['x', 'y']
      }
    ]
  };

  version_unchange_test(schema, false, '1:');
  version_unchange_test(schema2, false, '2:');
  version_change_test(schema, schema2, false, '3:');
  version_change_test(schema2, schema, true, '4:');
};


var test_composite_index_schema = function() {

  if (options.mechanisms[0] == 'websql') {
    // fixme: known issue
    reachedFinalContinuation = true;
    return;
  }

  var schema = {
    stores: [{
      name: 'st',
      indexes: [{
        name: 'xy',
        keyPath: 'x'
      }]
    }]
  };

  var schema2 = {
    stores: [{
      name: 'st',
      indexes: [{
        name: 'xy',
        keyPath: ['x', 'y']
      }]
    }]
  };

  version_unchange_test(schema, false, '1:');
  version_unchange_test(schema2, false, '2:');
  version_change_test(schema, schema2, false, '3:');
  version_change_test(schema2, schema, true, '4:');

};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



