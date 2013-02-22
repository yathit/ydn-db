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

var reporter = new ydn.testing.Reporter('ydn-db');

var db_name = 'test_iteration_1';
var store_name = 'st';
var schema = {
  stores: [
    {
      name: store_name,
      keyPath: 'id',
      indexes: [
        {
          keyPath: 'value'
        },
        {
          keyPath: 'tags',
          multiEntry: true
        }
      ]
    }]
};
var data = [
  {id: 0, value: 3, tags: ['b'], msg: 'msg:' + Math.random()},
  {id: 1, value: 2, tags: ['a', 'b'], msg: 'msg:' + Math.random()},
  {id: 2, value: 1, tags: ['b'], msg: 'msg:' + Math.random()},
  {id: 3, value: 3, tags: ['a', 'c'], msg: 'msg:' + Math.random()},
  {id: 4, value: 3, tags: ['c', 'b'], msg: 'msg:' + Math.random()},
  {id: 5, value: 2, tags: ['a', 'd'], msg: 'msg:' + Math.random()},
  {id: 6, value: 8, tags: [], msg: 'msg:' + Math.random()},
  {id: 7, value: 2, tags: ['a', 'b'], msg: 'msg:' + Math.random()}
];
var value_order = [2, 1, 5, 7, 0, 3, 4, 6];
var db = new ydn.db.Storage(db_name, schema, options);
db.clear();
db.put(store_name, data).done(function (value) {
  //console.log(db + 'store: animals ready.');
});



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

  module("open", test_env);
  reporter.createTestSuite('iteration', 'open', ydn.db.version);

  asyncTest("readonly table scan", function () {
    expect(3 * data.length);

    var iter = new ydn.db.ValueCursors(store_name);
    var idx = 0;
    var req = db.open(iter, function(x) {
      deepEqual(x.key(), data[idx].id, 'table scan effective key at ' + idx);
      deepEqual(x.primaryKey(), data[idx].id, 'table scan primary key at ' + idx);
      deepEqual(x.value(), data[idx], 'table scan value at ' + idx);
      idx++;
    });
    req.always(function() {
      start();
    });
  });

  asyncTest("readonly table scan on index", function () {
    expect(3 * data.length);

    var iter = new ydn.db.IndexValueCursors(store_name, 'value');

    var idx = 0;
    var req = db.open(iter, function(x) {
      var exp_obj = data[value_order[idx]];
      deepEqual(x.key(), exp_obj.value, 'table index scan effective key at ' + idx);
      deepEqual(x.primaryKey(), exp_obj.id, 'table index scan primary key at ' + idx);
      deepEqual(x.value(), exp_obj, 'table index scan value at ' + idx);
      idx++;
    });
    req.always(function() {
      start();
    });
  });

})();



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

  module("Streamer", test_env);
  reporter.createTestSuite('iteration', 'Streamer', ydn.db.version);

  asyncTest("synchronous push", function () {
    expect(2);

    var streamer = new ydn.db.Streamer(db, store_name);
    streamer.collect(function(x) {
      deepEqual(x, [data[1], data[3]], 'value of id 1 and 3');
      start();
    });
    streamer.push(data[1].id);
    streamer.push(data[3].id);
  });

})();

QUnit.testDone(function(result) {
  reporter.addResult('iteration', result.module,
    result.name, result.failed, result.passed, result.duration);
});

QUnit.moduleDone(function(result) {
  reporter.endTestSuite('iteration', result.name,
    {passed: result.passed, failed: result.failed});
});

QUnit.done(function(results) {
  reporter.report();
});




