var options = {}; // options = {mechanisms: ['websql']};
if (/log/.test(location.hash)) {
  if (/ui/.test(location.hash)) {
    if (ydn.debug && ydn.debug.log) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      ydn.debug.log('ydn.db', 100, div);
    } else {
      console.log('no logging facility');
    }
  } else {
    if (ydn.debug && ydn.debug.log) {
      ydn.debug.log('ydn.db', 100);
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

  asyncTest("connected", function () {
    expect(2);

    var db = new ydn.db.Storage(db_name_event, events_schema);

    db.addEventListener('connected', function (e) {
      equal(e.type, 'connected', 'connected event');
      ok(e.version > 0, 'version number');
      var type = db.type();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();
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
      var type = db.type();
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
      var type = db.type();
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
      var type = db.type();
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
      var type = db.type();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();

    });

    db.add(store_inline, data);
    db.put(store_inline, data);

  });

})();







