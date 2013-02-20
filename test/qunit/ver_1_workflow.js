var options = {}; // options = {mechanisms: ['websql']};
if (/log/.test(location.hash)) {
  if (/ui/.test(location.hash)) {
    if (ydn.debug && ydn.debug.log) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      ydn.debug.log('ydn.db', 'finer', div);
    } else {
      console.log('no logging facility');
    }
  } else {
    if (ydn.debug && ydn.debug.log) {
      ydn.debug.log('ydn.db', 'finer');
    } else {
      console.log('no logging facility');
    }
  }
}
if (/websql/.test(location.hash)) {
  options['mechanisms'] = ['websql'];
}


var db;
var db_name_event = "tck_test_1_1";
var store_inline = "ts";    // in-line key store
var store_outline = "ts2"; // out-of-line key store


var events_schema = {
  stores: [
    {
      name: store_inline,
      keyPath: 'id',
      dispatchEvents: true,
      type: 'NUMERIC'},
    {
      name: store_outline,
      dispatchEvents: true,
      type: 'NUMERIC'}
  ]};

(function () {

  var db_name_event = 'test_tb' + Math.random();
  db_name_event = db_name_event.replace('.', '');
  var schema = {stores: [
    {
      name: store_inline
    }
  ]};

  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('Storage Event test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Storage Event", test_env);

  asyncTest("connected to a new database and existing", function () {
    expect(4 * 3);

    var db = new ydn.db.Storage(db_name_event, schema);

    db.addEventListener('done', function (e) {
      equal(e.name, 'StorageEvent', 'event name');
      equal(e.type, 'done', 'event type');
      equal(e.getVersion(), 1, 'version number');
      ok(isNaN(e.getOldVersion()), 'old version number');

      db.values(store_inline).always(function () {

        db.close();

        db = new ydn.db.Storage(db_name_event, schema);

        db.addEventListener('done', function (e) {
          equal(e.name, 'StorageEvent', 'event name');
          equal(e.type, 'done', 'event type');
          equal(e.getVersion(), 1, 'version number');
          equal(e.getOldVersion(), 1, 'old version number, existing');

          db.values(store_inline).always(function () {

            db.close();

            var tb_name = 'new_tb' + Math.random();
            tb_name = tb_name.replace('.', '');
            var new_schema = {stores: [
              {
                name: tb_name
              }
            ]};

            db = new ydn.db.Storage(db_name_event, new_schema);

            db.addEventListener('done', function (e) {
              equal(e.name, 'StorageEvent', 'event name');
              equal(e.type, 'done', 'event type');
              equal(e.getVersion(), 2, 'updated version number');
              equal(e.getOldVersion(), 1, 'old version number, existing db, new schema');
              var type = db.getType();
              db.values(tb_name).always(function () { // make sure all run.
                db.close();
                ydn.db.deleteDatabase(db.getName(), type);
                start();
              });

            });
          });

        });
      });
    });

  });

})();


(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('RecordEvent Event test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("RecordEvent Event", test_env);

  asyncTest("created", function () {
    expect(6);

    var db = new ydn.db.Storage(db_name_event, events_schema);

    var key = Math.ceil(Math.random() * 100000);
    var data = { test: "random value", name: "name " + key, id: key };

    db.addEventListener('created', function (e) {
      //console.log(e);
      equal(e.type, 'created', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
    });

    db.addEventListener('updated', function (e) {
      //console.log(e);
      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      deepEqual(e.getValue(), data, 'value');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();
    });

    db.add(store_inline, data);
    db.put(store_inline, data);

  });


  asyncTest("updated", function () {
    expect(10);

    var db = new ydn.db.Storage(db_name_event, events_schema);

    var key = Math.ceil(Math.random() * 100000);
    var data = { test: "random value", name: "name " + key, id: key };

    var firedCreatedEvent = false;
    db.addEventListener(['created'], function (e) {
      //console.log(e);

      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
      firedCreatedEvent = true;

    });

    db.addEventListener(['updated'], function (e) {
      //console.log(e);

      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'updated', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();

    });

    db.add(store_inline, data);
    db.put(store_inline, data);

  });

})();


(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('Store Event test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Store Event", test_env);

  asyncTest("created", function () {
    expect(5);

    var db = new ydn.db.Storage(db_name_event, events_schema);

    var keys = [Math.ceil(Math.random() * 100000),
      Math.ceil(Math.random() * 100000)];
    var data = [
      {name: "rand key 1", id: keys[0]},
      {name: "rand key 2", id: keys[1]}
    ];

    db.addEventListener('created', function (e) {
      // console.log(e);
      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      deepEqual(e.getKeys(), keys, 'keys');
      deepEqual(e.getValues(), data, 'values');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();
    });

    db.add(store_inline, data);

  });


  asyncTest("updated", function () {
    expect(10);

    var db = new ydn.db.Storage(db_name_event, events_schema);
    var keys = [Math.ceil(Math.random() * 100000),
      Math.ceil(Math.random() * 100000)];
    var data = [
      {name: "rand key 1", id: keys[0]},
      {name: "rand key 2", id: keys[1]}
    ];

    var firedCreatedEvent = false;
    db.addEventListener(['created'], function (e) {
      //console.log(e);

      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      deepEqual(e.getKeys(), keys, 'created key');
      deepEqual(e.getValues(), data, 'created value');

    });

    db.addEventListener(['updated'], function (e) {
      //console.log(e);

      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'updated', 'type');
      deepEqual(e.getKeys(), keys, 'updated key');
      deepEqual(e.getValues(), data, 'updated value');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();

    });

    db.add(store_inline, data);
    db.put(store_inline, data);

  });

})();


(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('RecordEvent Event test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Run in transaction", test_env);

  asyncTest("all four crud operations in one transaction", function () {
    expect(4);

    var db_name = 'test_run_1';

    var db = new ydn.db.Storage(db_name, events_schema);

    db.run(function(tdb) {
      var key1 = Math.ceil(Math.random() * 100000);
      var obj = {test: 'first value', id: key1};

      tdb.add(store_inline, obj).always(function(x) {
        equal(key1, x, 'add key');
      });
      var key = Math.ceil(Math.random() * 100000);
      var data = { test: "random value", name: "name " + key, id: key };
      tdb.put(store_inline, data).always(function(x) {
        equal(key, x, 'put key');
      });
      tdb.values(store_inline, [key1, key]).always(function(x) {
        deepEqual([obj, data], x, 'get objects');
      });
      tdb.clear(store_inline).always(function(x) {
        equal(1, x, 'clear');
      });
    }, null, 'readwrite', function() {
      start();
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    })

  });


})();





