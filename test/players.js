schema = {
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

player_data = [{
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

db = new ydn.db.Storage('tr_test3', schema);
db.put('player', player_data);
db.put('weapon', weapon_data);

print_player = function(obj) {
  if (obj instanceof Array) {
    for (var i = 0; i < obj.length; i++) {
      print_player(obj[i]);
    }
    return;
  }
  if (obj) {
    console.log((new Date()).toISOString() + ' Player ' + obj.id + ' (' + obj.full_name + '), health: ' + obj.health);
  } else {
    console.log(obj);
  }
};



var log_them = function(pid, sno, tdb) {
  tdb = tdb || db;
  db.getItem('current_weapon').done(function(wp) {console.log(sno + ': current_weapon: ' + wp)});
  tdb.transaction(function tx_log(idb) {
    idb.get('player', pid).done(function(player) {
      console.log(sno + ': player weapon: ' + player.weapon);
      idb.get('weapon', player.weapon).done(function(weapon) {
        console.log(sno + ': weapon ' + weapon.name + ' count: ' + weapon.count);
      });
    })
  }, ['player', 'weapon'], 'readonly');
  console.log(sno + ': out.');
};
var change_weapon = function (pid, new_weapon_name) {
  db.transaction(function tx_change(idb) {
    console.log('Transaction started.');
    var get_player_data = idb.get('player', pid);
    get_player_data.done(function get_pre_data(player) {
      var old_weapon_name = player.weapon;
      db.setItem('current_weapon', old_weapon_name).done(
        function(x) {console.log('current_weapon updated to ' + old_weapon_name)});
      console.log('old_weapon_name: ' + old_weapon_name);
      log_them(pid, 3, idb);
      log_them(pid, 4);
      idb.transaction(function tx_readwrite(idb) {
        var get_all_data = idb.get([idb.key('player', pid), idb.key('weapon', new_weapon_name), idb.key('weapon', old_weapon_name)]);
        get_all_data.done(function (data) {
          var player = data[0];
          var new_weapon = data[1];
          idb.get('weapon', player.weapon).done(function (old_weapon) {
            idb.setItem('current_weapon', old_weapon.name + '->' + new_weapon.name).done(
              function(x) {console.log('current_weapon updating to ' + new_weapon.name)});
            console.log('Changing from ' + old_weapon.name + ' to ' + new_weapon.name);
            new_weapon.count--;
            old_weapon.count++;
            player.weapon = new_weapon.name;
            log_them(pid, 5, idb);
            log_them(pid, 6);
            idb.put('weapon', [new_weapon, old_weapon]);
            idb.put('player', player).done(function () {
              idb.setItem('current_weapon', new_weapon.name).done(
                function(x) {console.log('current_weapon updated to ' + new_weapon.name)});
              console.log('transaction done.');
              log_them(pid, 7);
            });
          })
        });
      }, ['player', 'weapon'], 'readwrite');
    });
  }, ['player', 'weapon'], 'readonly');
  console.log('change_weapon out.')
};
