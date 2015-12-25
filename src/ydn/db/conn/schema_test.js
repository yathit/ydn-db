
goog.provide('ydn.db.con.SchemaTest');
goog.setTestOnly('ydn.db.con.SchemaTest');

goog.require('goog.debug.Console');
goog.require('goog.events.EventTarget');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('ydn.db');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.debug');


var schema, debug_console;

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();


function setUp() {
  ydn.debug.log('ydn.db.con', 'warning');
  // ydn.db.con.IndexedDb.DEBUG = true;

}

function tearDown() {

}

function test_auto_schema() {

  var db_name = 'test_' + Math.random();
  // autoSchema database
  var db = new ydn.db.crud.Storage(db_name, undefined, options);
  var sh = db.getSchema();
  assertEquals('no store', 0, sh.stores.length);
  assertUndefined('auto schema', sh.version);
  var table_name = 'st1';
  var store_schema = {'name': table_name, 'keyPath': 'id', 'type': 'TEXT'};

  var value = 'a' + Math.random();
  asyncTestCase.waitForAsync('put');
  db.put(store_schema, {
    id: 'a',
    value: value,
    remark: 'put test'
  }).addCallback(function(y) {
    // console.log('put key ' + y);
    db.get(table_name, 'a').addCallback(function(x) {
      var result = x.value;
      assertEquals('get back', value, result);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  }).addErrback(function(e) {
    fail(e);
    asyncTestCase.continueTesting();
    ydn.db.deleteDatabase(db.getName(), db.getType());
    db.close();
  });
}

var version_change_test = function(schema1, schema2, is_final, msg, hint_sql, hint_idb) {
  var db_name = 'test' + Math.random();
  msg = msg || '';

  var db = new ydn.db.crud.Storage(db_name, schema1, options);
  asyncTestCase.waitForAsync('database ready');
  db.addEventListener('ready', function(e) {
    var ver = e.getVersion();
    var oldVer = e.getOldVersion();
    // console.log(ver, oldVer);
    db.getSchema(function(x) {
      var ex_schema1 = new ydn.db.schema.Database(x);
      // console.log(ex_schema1);
      db.close();
      asyncTestCase.continueTesting();
      asyncTestCase.waitForAsync('database ready 2');
      setTimeout(function() {
        var db2 = new ydn.db.crud.Storage(db_name, schema2, options);
        db2.addEventListener('ready', function(e) {
          var ver2 = e.getVersion();
          var oldVer2 = e.getOldVersion();
          // console.log(ver2, oldVer2);
          db2.getSchema(function(x) {
            var ex_schema2 = new ydn.db.schema.Database(x);
            // console.log(ex_schema2);

            assertNotNaN(msg + 'change_test version 1', ver);
            assertNaN(msg + 'change_test old version 1', oldVer);
            assertEquals(msg + 'change_test version 2', (ver + 1), ver2);
            assertEquals(msg + 'change_test old version 2', ver, oldVer2);
            var s1 = new ydn.db.schema.Database(schema1);
            var msg1 = s1.difference(ex_schema1, !!hint_sql, !!hint_idb);
            assertTrue(msg + ' schema 1 ' + msg1, !msg1);
            //console.log(schema2);
            //console.log(ex_schema2);
            var s2 = new ydn.db.schema.Database(schema2);
            var msg2 = s2.difference(ex_schema2);
            assertTrue(msg + ' schema 2 ' + msg2, !msg2);

            ydn.db.deleteDatabase(db2.getName(), db2.getType());
            db2.close();
            asyncTestCase.continueTesting();
          });
        });
      }, 200);
    });
  });
};


function test_add_store() {
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
}

function test_remove_store() {
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
}

function test_rename_store() {
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
}

function test_out_of_line_to_in_line_key() {
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
}

var version_unchange_test = function(schema, is_final, msg) {
  var db_name = 'test' + Math.random();
  msg = msg || '';

  asyncTestCase.waitForAsync('database ready');
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.addEventListener('ready', function(e) {
    var ver = e.getVersion();
    var oldVer = e.getOldVersion();
    db.close();
    setTimeout(function() {
      var db2 = new ydn.db.crud.Storage(db_name, schema, options);
      db2.addEventListener('ready', function(e) {
        var ver2 = e.getVersion();
        var oldVer2 = e.getOldVersion();

        assertNaN(msg + 'unchange_test old version 1', oldVer);
        assertEquals(msg + 'unchange_test version 2, no change', ver, ver2);
        assertEquals(msg + 'unchange_test old version 2, no change', ver, oldVer2);

        ydn.db.deleteDatabase(db2.getName(), db2.getType());
        db2.close();
        asyncTestCase.continueTesting();
      });
    }, 200);
  });
};

function test_keyPath() {

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
}

function test_multiEntry() {

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

  //version_change_test(schema2, schema, false, 'from multiEntry');
  //version_change_test(schema, schema2, false, 'to multiEntry');

  //version_unchange_test(schema, false, 'multiEntry=false:');
  version_unchange_test(schema2, true, 'multiEntry=true:');
}

function test_key_path_index() {
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
        indexes: [{
          name: 'y'
        }]
      }
    ]
  };

  version_unchange_test(schema, false, '1:');
  version_unchange_test(schema2, false, '2:');
  version_change_test(schema, schema2, false, '3:');
  version_change_test(schema2, schema, true, '4:');
}


function test_auto_increment() {
  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: 'x',
        autoIncrement: true
      }
    ]
  };

  var schema2 = {
    stores: [
      {
        name: 'st',
        keyPath: 'x',
        autoIncrement: false
      }
    ]
  };

  version_unchange_test(schema, false, '1:');
  version_unchange_test(schema2, false, '2:');
  version_change_test(schema, schema2, false, '3:');
  version_change_test(schema2, schema, true, '4:');
}

function test_composite_key_schema() {

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
}


function test_composite_index_schema() {

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

}


function test_blob_column() {

  var schema = {
    stores: [{
      name: 'st',
      indexes: [{
        keyPath: 'x',
        type: 'BLOB'
      }]
    }]
  };

  var schema2 = {
    stores: [{
      name: 'st',
      indexes: [{
        name: 'y'
      }]
    }]
  };

  version_unchange_test(schema, false, '1:');
  version_unchange_test(schema2, false, '2:');
  if (options.mechanisms[0] == 'indexeddb') {
    version_change_test(schema, schema2, true, '3:', false, true);
    return;
  }
  version_change_test(schema2, schema, true, '4:');

}

function test_data_index_add() {
  if (options.mechanisms[0] != 'indexeddb') {
    return;
  }
  // only work in IndexedDB
  var db_name = 'test_data_lost_index_add-2';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var data = [{
    id: 1,
    value: 2
  }, {
    id: 2,
    value: 1
  }, {
    id: 3,
    value: 2
  }];

  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', data);
  db.close();
  var schema2 = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        keyPath: 'value'
      }]
    }]
  };
  asyncTestCase.waitForAsync('database opening');
  setTimeout(function() {
    // make time to close the database, before schema change.
    var db2 = new ydn.db.crud.Storage(db_name, schema2, options);
    db2.keys('st', 'value', ydn.db.KeyRange.only(2)).addBoth(function(keys) {
      assertArrayEquals(keys, [1, 3]);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      asyncTestCase.continueTesting();
    });
  }, 1000);

}

function test_multi_connection() {
  if (options.mechanisms[0] != 'indexeddb') {
    reachedFinalContinuation = true;
    return;
  }
  // only work in IndexedDB
  var db_name = 'test_mutli_connection-2';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var data = [{
    id: 1,
    value: 2
  }, {
    id: 2,
    value: 1
  }, {
    id: 3,
    value: 2
  }];
  var event_vc, event_fail;

  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear('st');

  var schema2 = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        keyPath: 'value'
      }]
    }]
  };
  db.addEventListener('versionchange', function(e) {
    db.put('st', data);
    // console.log(e);
    event_vc = e;
  });
  db.addEventListener('fail', function(e) {
    // console.log(e);
    event_fail = e;
  });

  asyncTestCase.waitForAsync('database opening');
  setTimeout(function() {
    // make time.
    var db2 = new ydn.db.crud.Storage(db_name, schema2, options);
    db2.keys('st', 'value', ydn.db.KeyRange.only(2)).addBoth(function(keys) {

      assertNotNullNorUndefined('version change event called', event_vc);
      assertNotNullNorUndefined('fail event called', event_fail);
      var e = event_fail.getError();
      assertEquals('fail event name', 'versionchange', e.name);
      assertArrayEquals(keys, [1, 3]);

      ydn.db.deleteDatabase(db_name, options.mechanisms[0]);
      db.close();
      asyncTestCase.continueTesting();
    });
  }, 1000);
}


function test_multiple_multi_entry_index() {

  var db_name = 'test_' + Math.random();
  var schema = {
    stores: [{
      name: 'ms1',
      keyPath: 'a',
      indexes: [{
        name: 'ab',
        keyPath: ['a', 'b']
      }, {
        name: 'de',
        keyPath: ['d', 'e']
      }]
    }]
  };

  var db = new ydn.db.crud.Storage(db_name, schema, options);

  asyncTestCase.waitForAsync('put');
  var data = [{
    a: 1,
    b: 2,
    d: 4,
    e: 5
  }, {
    a: 11,
    b: 12,
    d: 14,
    e: 15
  }];
  db.onReady(function(e) {
    if (e) {
      console.error(e);
      fail(String(e));
    }
    db.put('ms1', data).addBoth(function(y) {
      // console.log('put key ' + y);
      db.valuesByIndex('ms1', 'ab', ydn.db.KeyRange.only([1, 2])).addBoth(function(x) {
        // console.log(data[0], x[0]);
        assertObjectEquals('get by ab index', data[0], x[0]);
        asyncTestCase.continueTesting();
        asyncTestCase.waitForAsync('de');
        db.valuesByIndex('ms1', 'de', ydn.db.KeyRange.only([14, 15])).addBoth(function(x) {
          assertObjectEquals('get by de index', data[1], x[0]);
          asyncTestCase.continueTesting();
          ydn.db.deleteDatabase(db.getName(), db.getType());
          db.close();
        });
      });

    });
  });

}


function test_drop_multi_entry_index() {

  var db_name = 'test_' + Math.random();
  var schema_1 = {
    stores: [{
      name: 'ms1',
      keyPath: 'a',
      indexes: [{
        name: 'ab',
        keyPath: ['a', 'b']
      }, {
        name: 'de',
        keyPath: ['d', 'e']
      }]
    }]
  };
  var schema_2 = {
    stores: [{
      name: 'ms1',
      keyPath: 'a',
      indexes: [{
        name: 'de',
        keyPath: ['d', 'e']
      }]
    }]
  };

  var db = new ydn.db.crud.Storage(db_name, schema_1, options);

  asyncTestCase.waitForAsync('create two multi entry');
  db.getSchema(function(sch) {
    assertEquals('two indexes', 2, sch.stores[0].indexes.length);
    asyncTestCase.continueTesting();

    db.close();
    asyncTestCase.waitForAsync('drop a multi entry');
    setTimeout(function() {
      var db2 = new ydn.db.crud.Storage(db_name, schema_2, options);
      var sch2 = db2.getSchema(function(sch) {
        console.log(sch.stores[0]);
        assertEquals('one indexes in actual schema', 1, sch.stores[0].indexes.length);
        ydn.db.deleteDatabase(db2.getName(), db2.getType());
        db2.close();
        asyncTestCase.continueTesting();
      });
      console.log(sch2.stores[0]);
      assertEquals('one indexes in defined schema', 1, sch2.stores[0].indexes.length);
    }, 500);

  });

}


