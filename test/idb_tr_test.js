
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';
var stubs;

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.tr').setLevel(goog.debug.Logger.Level.FINEST);

	basic_schema = new ydn.db.DatabaseSchema(1);
  var index = new ydn.db.IndexSchema('id');
  var store = new ydn.db.StoreSchema(table_name, 'id', false, undefined, [index]);
	basic_schema.addStore(store);
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var options = {preference: ['indexeddb']};


var test_2_idb_basic = function() {

  var db_name = 'test_2_idb_basic2';
  var db = new ydn.db.Storage(db_name, basic_schema, options);

  var arr = [
    {id: 'a', value: 1},
    {id: 'b', value: 2},
    {id: 'c', value: 3}
  ];

  var amt = 7;

  var t1_fired = false;
  var t2_fired = false;

  waitForCondition(
      // Condition
      function() { return t2_fired; },
      // Continuation
      function() {
        reachedFinalContinuation = true;

      },
      100, // interval
      2000); // maxTimeout

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        db.get(table_name, 'a').addCallback(function(a_obj) {
          assertEquals('a value after adding ' + amt, 1+amt, a_obj.value);
          t2_fired = true;
        })
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addCallback(function(value) {
    console.log(db + ' put: ' + JSON.stringify(value));

    db.run(function(idb) {
      assertEquals('tx 0', 1, idb.getTxNo());
      idb.get(table_name, 'a').addCallback(function(a_obj) {
        console.log(idb + ' get a ' + JSON.stringify(a_obj));
        assertEquals('get 0', 1, idb.getTxNo());
        a_obj.value += amt;
        idb.put(table_name, a_obj).addCallback(function(out) {
          console.log(idb + ' put a ' + JSON.stringify(a_obj));
          assertEquals('put 0', 1, idb.getTxNo());
          t1_fired = true;
          assertEquals('tr addCallback', 'a', out);
        });
      });
    }, [table_name], 'readwrite');

    var q = db.query(table_name);
    q.select('value');
    db.fetch(q).addCallback(function(q_result) {
      console.log(db + ' receiving fetch ' + JSON.stringify(q_result));
    })
  });
};

var schema = {
  stores: [{
    name: 'player',
    keyPath: 'id',
    indexes: [{
      name: 'id',
      type: 'INTEGER',
      unique: true
    }, {
      name: 'health',
      type: 'REAL'
    }]
  }, {
    name: 'weapon',
    keyPath: 'name'
  }]
};

var player_data = [{
  id: 1,
  health: 50,
  weapon: 'gun',
  first: 'A',
  last: 'Z',
  full_name: 'A Z',
  sex: 'FEMALE',
  age: 24,
  country: 'SG'
}, {
  id: 2,
  health: 50,
  weapon: 'gun',
  first: 'B',
  last: 'Z',
  full_name: 'B Z',
  sex: 'FEMALE',
  age: 18,
  country: 'US'
}, {
  id: 3,
  health: 50,
  weapon: 'laser',
  first: 'C',
  last: 'Z',
  full_name: 'C Z',
  sex: 'MALE',
  age: 19,
  country: 'SG'
}, {
  id: 4,
  health: 50,
  weapon: 'sword',
  first: 'D',
  last: 'Z',
  full_name: 'D Z',
  sex: 'FEMALE',
  age: 19,
  country: 'SG'
}];
var weapon_data = [{
  name: 'gun',
  count: 5
}, {
  name: 'sword',
  count: 10
}, {
  name: 'laser',
  count: 1
}];


var test_4_multi_stores = function() {
  var db = new ydn.db.Storage('idb_tr_test3', schema);
  assertEquals('base tx', 0, db.getTxNo());
  db.put('player', player_data).addCallback(function(x) {
    assertEquals('put 1', 1, db.getTxNo());
  });
  db.put('weapon', weapon_data).addCallback(function(x) {
    assertEquals('put 2', 2, db.getTxNo());
  });

  var print_both = function(pid) {
    db.get('player', pid).addCallback(function(player) {
      db.get('weapon', player.weapon).addCallback(function(weapon) {
        console.log([player, weapon]);
      });
    })
  };

  var change_weapon = function (pid, new_weapon_name) {
    db.run(function tx_change(idb) {
      var get_ini_data = idb.get([idb.key('player', pid), idb.key('weapon', new_weapon_name)]);
      get_ini_data.addCallback(function get_pre_data(data) {
        var player = data[0];
        var new_weapon = data[1];
        idb.get('weapon', player.weapon).addCallback(function (old_weapon) {
          console.log('Changing from ' + old_weapon.name + ' to ' + new_weapon.name);
          new_weapon.count--;
          old_weapon.count++;
          player.weapon = new_weapon.name;
          idb.put('weapon', [new_weapon, old_weapon]);
          idb.put('player', player);
        })
      });
    }, ['player', 'weapon'], 'readwrite');
  };

  var pid = 1;
  print_both(pid);
  change_weapon(1, 'laser');
  print_both(pid);
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



