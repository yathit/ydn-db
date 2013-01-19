
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.core.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, debug_console, db, objs;

var db_name = 'test_crud_4';
var table_name = 'st_inline';
var table_name_offline = 'st_offline';
var store_name_inline_number = 'st_inline_n';
var load_store_name = 'st_load';


var setUp = function () {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    //goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  //ydn.db.con.IndexedDb.DEBUG = true;
  //ydn.db.con.WebSql.DEBUG = true;
  //ydn.db.core.req.IndexedDb.DEBUG = true;

  var indexes = [new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT)];
  var stores = [new ydn.db.schema.Store(table_name, 'id'),
    new ydn.db.schema.Store(store_name_inline_number, 'id', false, ydn.db.schema.DataType.NUMERIC, undefined, true),
    new ydn.db.schema.Store(table_name_offline),
    new ydn.db.schema.Store(load_store_name, 'id', false, ydn.db.schema.DataType.NUMERIC, indexes)
  ];
  schema = new ydn.db.schema.Database(undefined, stores);


};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_created_event = function() {

  var db = new ydn.db.core.Storage(db_name, schema, options);

  var hasEventFired = false;
  var ev;
  var key = Math.random();
  var obj =  {id: key, value: '1', remark: 'put test'};

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertNotNull(ev);
        assertEquals('name', 'RecordEvent', ev.name);
        assertEquals('type', 'created', ev.type);
        assertEquals('store name', store_name_inline_number, ev.store_name);
        assertEquals('key', key, ev.key);
        assertEquals('value', obj, ev.value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db.addEventListener('created', function(e) {
    ev = e;
    hasEventFired = true;
  });

  db.add(store_name_inline_number, obj);
};

var test_updated_event = function() {

  var db = new ydn.db.core.Storage(db_name, schema, options);

  var hasEventFired = false;
  var ev;
  var key = Math.random();
  var obj =  {id: key, value: '1', remark: 'put test'};

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertNotNull(ev);
      assertEquals('name', 'RecordEvent', ev.name);
      assertEquals('type', 'updated', ev.type);
      assertEquals('store name', store_name_inline_number, ev.store_name);
      assertEquals('key', key, ev.key);
      assertEquals('value', obj, ev.value);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.addEventListener('updated', function(e) {
    ev = e;
    hasEventFired = true;
  });

  db.put(store_name_inline_number, obj);
};



var test_updated_store_event = function() {

  var db = new ydn.db.core.Storage(db_name, schema, options);

  var hasEventFired = false;
  var ev;
  var objs =  [{id: 1, value: '1', remark: 'put test'}, {id: 2, value: '2', remark: 'put test'}];
  var keys = [1, 2];

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertNotNull(ev);
      assertEquals('name', 'StoreEvent', ev.name);
      assertEquals('type', 'updated', ev.type);
      assertEquals('store name', store_name_inline_number, ev.store_name);
      assertArrayEquals('key', keys, ev.keys);
      assertArrayEquals('value', objs, ev.values);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.addEventListener('updated', function(e) {
    ev = e;
    hasEventFired = true;
  });

  db.put(store_name_inline_number, objs);
};





var test_deleted_event = function() {

  var db = new ydn.db.core.Storage(db_name, schema, options);

  var ev_count = 0;
  var store_event, record_event;

  var objs =  [{id: 1, value: '1', remark: 'put test'}, {id: 2, value: '2', remark: 'put test'}];
  var keys = [1, 2];


  waitForCondition(
    // Condition
    function() { return ev_count == 2; },
    // Continuation
    function() {
      assertNotNull(store_event);
      assertNotNull(record_event);

      assertEquals('name', 'RecordEvent', record_event.name);
      assertEquals('type', 'deleted', record_event.type);
      assertEquals('store name', store_name_inline_number, record_event.store_name);
      assertEquals('key', keys[0], record_event.key);
      assertUndefined('value', record_event.value);

      assertEquals('name', 'StoreEvent', store_event.name);
      assertEquals('type', 'deleted', store_event.type);
      assertEquals('store name', store_name_inline_number, store_event.store_name);
      assertUndefined('key', store_event.key);
      assertUndefined('value', store_event.value);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.addEventListener('deleted', function(e) {
    if (e.name == 'StoreEvent') {
      store_event = e;
    } else {
      record_event = e;
    }

    ev_count++;
  });



  db.put(store_name_inline_number, objs).addCallback(function() {
    db.clear(store_name_inline_number, keys[0]);
    db.clear(store_name_inline_number);
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



