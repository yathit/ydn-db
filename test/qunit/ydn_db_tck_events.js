
//ydn.debug.log('ydn.db', 100);

var db;
var options = {}; // options = {Mechanisms: ['websql']};
var db_name_tck1 = "tck_test_1_1";
var store_inline = "ts";    // in-line key store
var store_inline_string = "tss";    // in-line key store
var store_outline = "ts2"; // out-of-line key store
var store_outline_string = "ts2s"; // out-of-line key store
var store_inline_auto = "ts3"; // in-line key + auto
var store_outline_auto = "ts4"; // out-of-line key + auto
var store_nested_key = "ts5"; // nested keyPath
var store_inline_index = "ts6";    // in-line key store

var data_1 = { test:"test value", name:"name 1", id:1 };
var data_1a = { test:"test value", name:"name 1", id: ['a', 'b']};
var data_2 = { test:"test value", name:"name 2" };
var gdata_1 = { test:"test value", name:"name 3", id: {$t: 1} };


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

module("Event", {
  setup: function() {

  },
  teardown: function() {
    //db.close();
    //ydn.db.deleteDatabase(db.getName());
  }
});


asyncTest("connected", function () {
  expect(2);

  var db = new ydn.db.Storage('tck1_put', events_schema);

  db.addEventListener('connected', function(e) {
    equal(e.type, 'connected', 'connected event');
    var type = typeof e.version;
    equal(type, 'number', 'version number is numeric');
    start();
  });


});


asyncTest("created RecordEvent", function () {
  expect(5);

  var db = new ydn.db.Storage('tck1_put', events_schema);

  var key = Math.ceil(Math.random() * 100000);
  var data = { test:"random value", name:"name " + key, id:key };

  db.addEventListener(['created', 'updated'], function(e) {
    console.log(e);
    equal(e.name, 'RecordEvent', 'event name');
    equal(e.getStoreName(), store_inline, 'store name');
    //equal(e.store_name, store_inline, 'store name');
    equal(e.type, 'created', 'type');
    equal(e.getKey(), key, 'key');
    deepEqual(e.getValue(), data, 'value');
    start();
  });

  db.add(store_inline, data);

  setTimeout(function() {
    // don't wait more than 5 sec.
    start();
  }, 1000);
});


asyncTest("created StoreEvent", function () {
  expect(5);

  var db = new ydn.db.Storage('tck1_put', events_schema);

  var keys = [Math.ceil(Math.random() * 100000),
    Math.ceil(Math.random() * 100000)];
  var data = [{name:"rand key 1", id: keys[0]}, {name:"rand key 2", id: keys[1]}];

  db.addEventListener(['created', 'updated'], function(e) {
    // console.log(e);
    equal(e.name, 'StoreEvent', 'event name');
    equal(e.getStoreName(), store_inline, 'store name');
    //equal(e.store_name, store_inline, 'store name');
    equal(e.type, 'created', 'type');
    deepEqual(e.getKeys(), keys, 'keys');
    deepEqual(e.getValues(), data, 'values');
    start();
  });

  db.add(store_inline, data);
  setTimeout(function() {
    // don't wait more than 5 sec.
    start();
  }, 1000);

});

asyncTest("updated RecordEvent", function () {
  expect(10);

  var db = new ydn.db.Storage('tck1_put', events_schema);

  var key = Math.ceil(Math.random() * 100000);
  var data = { test:"random value", name:"name " + key, id:key };

  var firedCreatedEvent = false;
  db.addEventListener(['created', 'updated'], function(e) {
    //console.log(e);
    if (!firedCreatedEvent) {
      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
      firedCreatedEvent = true;
    } else {
      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'updated', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
    }
    start();
  });

  db.add(store_inline, data);
  db.put(store_inline, data);
  setTimeout(function() {
    // don't wait more than 5 sec.
    start();
  }, 1000);
});


asyncTest("updated StoreEvent", function () {
  expect(10);

  var db = new ydn.db.Storage('tck1_put', events_schema);
  var keys = [Math.ceil(Math.random() * 100000),
    Math.ceil(Math.random() * 100000)];
  var data = [{name:"rand key 1", id: keys[0]}, {name:"rand key 2", id: keys[1]}];

  var firedCreatedEvent = false;
  db.addEventListener(['created', 'updated'], function(e) {
    //console.log(e);
    if (!firedCreatedEvent) {
      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      deepEqual(e.getKeys(), keys, 'created key');
      deepEqual(e.getValues(), data, 'created value');
      firedCreatedEvent = true;
    } else {
      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'updated', 'type');
      deepEqual(e.getKeys(), keys, 'updated key');
      deepEqual(e.getValues(), data, 'updated value');
    }
    start();
  });

  db.add(store_inline, data);
  db.put(store_inline, data);
  setTimeout(function() {
    // don't wait more than 5 sec.
    start();
  }, 1000);
});








