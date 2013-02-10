var options = {}; // options = {mechanisms: ['websql']};
if (/log/.test(location.hash)) {
  if (/ui/.test(location.hash)) {
    if (ydn.debug && ydn.debug.log) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      ydn.debug.log('ydn.db', 'finest', div);
    } else {
      console.log('no logging facility');
    }
  } else {
    if (ydn.debug && ydn.debug.log) {
      ydn.debug.log('ydn.db', 'finest');
    } else {
      console.log('no logging facility');
    }
  }
}
if (/websql/.test(location.hash)) {
  options['mechanisms'] = ['websql'];
}


var schema = {
  stores: [
    {
      name: 'animals',
      keyPath: 'id',
      indexes: [
        {
          keyPath: 'color'
        },
        {
          keyPath: 'horn'
        },
        {
          keyPath: 'legs'
        },
        {
          keyPath: ['horn', 'name']
        }, {
          keyPath: ['legs', 'name']
        }]
    }]
};
var db = new ydn.db.Storage('test_algo_2', schema, options);

var animals = [
  {id: 1, name: 'rat', color: 'brown', horn: 0, legs: 4},
  {id: 2, name: 'leopard', color: 'spots', horn: 2, legs: 4},
  {id: 3, name: 'galon', color: 'gold', horn: 10, legs: 2},
  {id: 4, name: 'cat', color: 'spots', horn: 0, legs: 4},
  {id: 5, name: 'snake', color: 'spots', horn: 0, legs: 0},
  {id: 6, name: 'ox', color: 'black', horn: 2, legs: 4},
  {id: 7, name: 'cow', color: 'spots', horn: 2, legs: 4},
  {id: 8, name: 'chicken', color: 'red', horn: 0, legs: 2}
];
db.clear();
db.put('animals', animals).done(function (value) {
  //console.log(db + 'store: animals ready.');
});
var num_color = animals.reduce(function (p, x) {
  return x.color == 'spots' ? p + 1 : p;
}, 0);
var num_legs = animals.reduce(function (p, x) {
  return x.legs == 4 ? p + 1 : p;
}, 0);
var num_horn = animals.reduce(function (p, x) {
  return x.horn == 2 ? p + 1 : p;
}, 0);


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

  module("Algo", test_env);


  asyncTest("NestedLoop", function () {
    expect(4);

    var iter_color = ydn.db.Cursors.where('animals', 'color', '=', 'spots');
    var iter_horn = ydn.db.Cursors.where('animals', 'horn', '=', 2);
    var iter_legs = ydn.db.Cursors.where('animals', 'legs', '=', 4);

    var result = [];
    var solver = new ydn.db.algo.NestedLoop(result);
    var req = db.scan([iter_horn, iter_color, iter_legs], solver);
    req.always(function() {
      // ['leopard', 'cow']
      deepEqual(result, [2, 7], 'correct result');
      equal(iter_horn.count(), num_horn, 'horn table scan count');
      // why '+ 1' ?
      equal(iter_color.count(), num_color * (num_horn + 1), 'color table scan count');
      equal(iter_legs.count(), num_legs * (num_color + 1) * (num_horn + 1), 'legs table scan count');
      start();
    });

  });

  asyncTest("SortedMerge", function () {
    expect(4);

    var iter_color = ydn.db.Cursors.where('animals', 'color', '=', 'spots');
    var iter_horn = ydn.db.Cursors.where('animals', 'horn', '=', 2);
    var iter_legs = ydn.db.Cursors.where('animals', 'legs', '=', 4);

    var result = [];
    var solver = new ydn.db.algo.SortedMerge(result);
    var req = db.scan([iter_horn, iter_color, iter_legs], solver);
    req.always(function() {
      // ['leopard', 'cow']
      deepEqual(result, [2, 7], 'correct result');
      ok(iter_horn.count() <= num_horn, 'horn table scan count less than or equal to ' + num_horn);
      ok(iter_color.count() <= num_color , 'color table scan count less than or equal to ' + num_color);
      ok(iter_legs.count() <= num_legs, 'legs table scan count less than or equal to ' + num_legs);
      start();
    });

  });

  asyncTest("ZigzagMerge", function () {
    expect(3);

    var iter_horn_name = new ydn.db.Cursors('animals', 'horn, name', ydn.db.KeyRange.starts([2]));
    var iter_legs_name = new ydn.db.Cursors('animals', 'legs, name', ydn.db.KeyRange.starts([4]));

    var result = [];
    var solver = new ydn.db.algo.ZigzagMerge(result);
    var req = db.scan([iter_horn_name, iter_legs_name], solver);
    req.always(function() {
      deepEqual(result, ['cow', 'leopard', 'ox'], 'correct result');
      ok(iter_horn_name.count() <= num_horn, 'horn table scan count less than or equal to ' + num_horn);
      ok(iter_legs_name.count() <= num_legs, 'legs table scan count less than or equal to ' + num_legs);
      start();
    });

  });

})();




