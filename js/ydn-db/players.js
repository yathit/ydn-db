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
      type: 'NUMERIC'
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
  count: 3
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


