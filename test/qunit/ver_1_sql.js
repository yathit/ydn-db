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

var db_name = 'test_sql_1';
var store_name = 'st';
var schema = {
  stores: [
    {
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [
        {
          keyPath: 'value',
          type: 'TEXT'
        },
        {
          keyPath: 'x',
          type: 'NUMERIC'
        }
      ]
    }]
};

var data = [
  {id: 0, x: 3.5, value: 'ab', msg: 'msg:' + Math.random()},
  {id: 1, x: 0,   value: 'ba', msg: 'msg:' + Math.random()},
  {id: 2, x: 1,   value: 'c', msg: 'msg:' + Math.random()},
  {id: 3, x: 3.1, value: 'ca', msg: 'msg:' + Math.random()},
  {id: 4, x: -1,  value: 'a', msg: 'msg:' + Math.random()}
];


var db = new ydn.db.Storage(db_name, schema, options);
db.clear();
db.put(store_name, data).always(function (value) {
  // console.log(db + 'store ready ' + JSON.stringify(value));
});



(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('SELECT test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("SELECT", test_env);
  reporter.createTestSuite('sql', 'SELECT', ydn.db.version);

  asyncTest("*", function () {
    expect(1);

    var sql = 'SELECT * FROM "st"';
    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, data, sql);
      start();
    });
  });

  asyncTest("primary field", function () {
    expect(1);

    var sql = 'SELECT "id" FROM "st"';
    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, [0, 1, 2, 3, 4], sql);
      start();
    });
  });

  asyncTest("a field", function () {
    expect(1);

    var sql = 'SELECT x FROM "st"';
    var exp_result = data.map(function(x) {return x.x});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("fields", function () {
    expect(1);

    var sql = 'SELECT x, "value" FROM "st"';
    var exp_result = data.map(function(x) {
        return {x: x.x, value: x.value};
      }
    );

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

})();


(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('SELECT test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Paging", test_env);
  reporter.createTestSuite('sql', 'Paging', ydn.db.version);

  var ids = data.map(function(x) {
      return x.id;
    }
  );

  asyncTest("LIMIT", function () {
    expect(1);

    var sql = 'SELECT id FROM st LIMIT 3';
    var exp_result = ids.slice(0, 3);
    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("LIMIT OFFSET", function () {
    expect(1);

    var sql = 'SELECT id FROM st LIMIT 3 OFFSET 2';
    var exp_result = ids.slice(2, 5);
    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("LIMIT with WHERE", function () {
    expect(1);

    var sql = 'SELECT * FROM st WHERE x > 0 ORDER BY x LIMIT 2';

    var exp_result = data.filter(function (x) {
      return x.x > 0;
    });
    exp_result.sort(function (a, b) {
      return a.x > b.x ? 1 : -1;
    });
    exp_result = exp_result.slice(0, 2);


    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("LIMIT OFFSET with WHERE", function () {
    expect(1);

    var sql = 'SELECT * FROM st WHERE x > 0 ORDER BY x LIMIT 2 OFFSET 1';

    var exp_result = data.filter(function (x) {
      return x.x > 0;
    });
    exp_result.sort(function (a, b) {
      return a.x > b.x ? 1 : -1;
    });
    exp_result = exp_result.slice(1, 3);


    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

})();


(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('ORDER test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("ORDER", test_env);
  reporter.createTestSuite('sql', 'ORDER', ydn.db.version);


  asyncTest("primary key", function () {
    expect(1);

    var sql = 'SELECT id FROM "st" ORDER BY "id"';
    var exp_result = data.map(function(x) {
        return x.id;
      }
    );

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("reverse primary key", function () {
    expect(1);

    var sql = 'SELECT id FROM "st" ORDER BY "id" DESC';
    var exp_result = data.map(function(x) {
        return x.id;
      }
    );
    exp_result.reverse();

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("a field", function () {
    expect(1);

    var sql = 'SELECT id FROM "st" ORDER BY "x"';
    var exp_result = data.map(function(x) {
        return x.id;
      }
    );
    exp_result.sort(function(a, b) {
      return data[a].x > data[b].x ? 1 : -1;
    });

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("reverse a field", function () {
    expect(1);

    var sql = 'SELECT id FROM "st" ORDER BY "value" DESC';
    var exp_result = data.map(function(x) {
        return x.id;
      }
    );
    exp_result.sort(function(a, b) {
      return data[a].value > data[b].value ? -1 : 1;
    });

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


})();

(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('ORDER test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("WHERE", test_env);
  reporter.createTestSuite('sql', 'WHERE', ydn.db.version);

  asyncTest("number: =", function () {
    expect(1);

    var sql = 'SELECT * FROM "st" WHERE x = 1';
    var exp_result = data.filter(function (x) { return x.x == 1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  module("WHERE", test_env);
  reporter.createTestSuite('sql', 'WHERE', ydn.db.version);

  asyncTest("string: =", function () {
    expect(1);

    var sql = "SELECT * FROM st WHERE value = 'ba'";
    var exp_result = data.filter(function (x) { return x.value == 'ba'});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("number: >", function () {
    expect(1);

    var sql = 'SELECT * FROM "st" WHERE x > 1 ORDER BY "x"';
    var exp_result = data
      .filter(function (x) { return x.x > 1})
      .sort(function (a, b) {return a.x > b.x ? 1 : -1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("number: >=", function () {
    expect(1);

    var sql = 'SELECT * FROM "st" WHERE x >= 1 ORDER BY "x"';
    var exp_result = data
      .filter(function (x) { return x.x >= 1})
      .sort(function (a, b) {return a.x > b.x ? 1 : -1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("number: > AND <", function () {
    expect(1);

    var sql = 'SELECT * FROM "st" WHERE x > 1 AND x < 3.1 ORDER BY "x"';
    var exp_result = data
      .filter(function (x) { return x.x > 1 && x.x < 3.1})
      .sort(function (a, b) {return a.x > b.x ? 1 : -1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("number: > AND <=", function () {
    expect(1);

    var sql = 'SELECT * FROM "st" WHERE x > 1 AND x <= 3.1 ORDER BY "x"';
    var exp_result = data
      .filter(function (x) { return x.x > 1 && x.x <= 3.1})
      .sort(function (a, b) {return a.x > b.x ? 1 : -1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

})();


(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('ORDER test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Aggregate", test_env);
  reporter.createTestSuite('sql', 'Aggregate', ydn.db.version);

  asyncTest("COUNT(*)", function () {
    expect(1);

    var sql = 'SELECT COUNT (*) FROM st';

    var n = data.length;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });

  asyncTest("COUNT (x) where", function () {
    expect(1);

    var sql = 'SELECT COUNT (x) FROM st WHERE x > 3';

    var n = data.filter(function (x) {return x.x > 3;}).length;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });

  asyncTest("COUNT (x) AND where", function () {
    expect(1);

    var sql = 'SELECT COUNT (x) FROM st WHERE x >= 0 AND x < 3';

    var n = data.filter(function (x) {return x.x >= 0 && x.x < 3;}).length;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });

  asyncTest("MAX (x)", function () {
    expect(1);

    var sql = 'SELECT MAX (x) FROM st';

    var n = 3.5;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });

  asyncTest("MIN (x)", function () {
    expect(1);

    var sql = 'SELECT MIN (x) FROM st';

    var n = -1;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });

  asyncTest("SUM (x)", function () {
    expect(1);

    var sql = 'SELECT SUM (x) FROM st';

    var xs = data.map(function (x) { return x.x});
    var result = xs.reduce(function (x, p) { return x + p}, 0);

    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, result, sql);
      start();
    });
  });


  asyncTest("AVG (x)", function () {
    expect(1);

    var sql = 'SELECT AVG (x) FROM st';

    var xs = data.map(function (x) { return x.x});
    var result = xs.reduce(function (x, p) { return x + p}, 0);
    result = result / data.length;

    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, result, sql);
      start();
    });
  });

})();


QUnit.testDone(function(result) {
  reporter.addResult('sql', result.module,
    result.name, result.failed, result.passed, result.duration);
});

QUnit.moduleDone(function(result) {
  reporter.endTestSuite('sql', result.name,
    {passed: result.passed, failed: result.failed});
});

QUnit.done(function(results) {
  reporter.report();
  var type = db.getType();
  ydn.db.deleteDatabase(db_name, type);
});




