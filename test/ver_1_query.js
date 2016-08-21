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

QUnit.config.testTimeout = 2000;
var reporter = new ydn.testing.Reporter('ydn-db');

var db_name = 'test_query_1';
var store_inline = 'ts';    // in-line key store
var store_outline = 'ts2'; // out-of-line key store
var store_inline_auto = 'ts3'; // in-line key + auto
var store_outline_auto = 'ts4'; // out-of-line key + auto
var store_inline_index = 'ts6';    // in-line key store


var schema_1 = {
  stores: [
    {
      name: store_inline,
      keyPath: 'id'},
    {
      name: store_outline},
    {
      name: store_inline_auto,
      keyPath: 'id',
      autoIncrement: true},
    {
      name: store_outline_auto,
      autoIncrement: true
    },
    {
      name: store_inline_index,
      keyPath: 'id',
      type: 'NUMERIC',
      indexes: [
        {name: 'name', type: 'TEXT'},
        {name: 'value', type: 'NUMERIC'},
        {name: 'name, value', keyPath: ['name', 'value']},
        {name: 'tags', type: 'TEXT', multiEntry: true}
      ]
    }
  ]
};


(function() {

  var db_name = 'test_query_count';
  var db_r;

  var df = $.Deferred();

  // persist store data.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1, options);
    _db.clear(store_inline_index);
    _db.put(store_inline_index, [
      {id: 1, value: 2, name: 'a' + Math.random()},
      {id: 2, value: 2, name: 'b' + Math.random()},
      {id: 3, value: 2, name: 'b' + Math.random()},
      {id: 4, value: 3, name: 'c' + Math.random()}
    ]);
    _db.clear(store_inline);
    _db.put(store_inline, [
      {id: 1, value: 'v' + Math.random()},
      {id: 2, value: 'v' + Math.random()},
      {id: 3, value: 'v' + Math.random()},
      {id: 4, value: 'v' + Math.random()}
    ]);
    _db.count(store_inline).always(function() {
      df.resolve();  // this ensure all transaction are completed
    });
    _db.close();
  })();

  var test_count = 0;

  var test_env = {
    setup: function() {
      db_r = new ydn.db.Storage(db_name, schema_1, options);

    },
    teardown: function() {
      db_r.close();
      test_count++;
      if (test_count >= 2) {
        //console.log(db_r.getName() + ' deleted.')
        var type = db_r.getType();
        db_r.close();
        ydn.db.deleteDatabase(db_r.getName(), type);
      }
    }
  };

  module('count', test_env);
  reporter.createTestSuite('query', 'count', ydn.db.version);

  asyncTest('1. primary key', 2, function() {

    df.always(function() {
      var q = db_r.from(store_inline);
      q.count().always(function(x) {
        equal(x, 4, 'all records');
      });

      q = db_r.from(store_inline, '>', 1, '<=', 3);
      q.count().always(function(x) {
        equal(x, 2, 'number of records in a bounded range');
        start();
      });
    });

  });

  asyncTest('2. by index iterator', 3, function() {
    df.always(function() {

      var value_iter = db_r.from(store_inline_index)
          .where('value', '>', 2, '<=', 3);
      value_iter.count().always(function(x) {
        //console.log('count value')
        equal(x, 1, 'number of values in the range');
      });

      var name_iter = db_r.from(store_inline_index).where('name', '^', 'b');
      name_iter.count().always(function(x) {
        equal(x, 2, 'number of name in the range');
      });

      var iter = db_r.from(store_inline_index).select('value').unique(true);
      iter.count().always(function(x) {
        equal(x, 2, 'unique count');
        start();
      });
    });

  });

})();




(function() {

  var db_name = 'test_query_to_list';
  var test_count = 0;
  var df = $.Deferred();

  var objs = [
    {test: 't' + Math.random(), value: 4, id: 0, name: 'a', tags: ['a', 'b']},
    {test: 't' + Math.random(), value: 10, id: 1, name: 'a', tags: ['x']},
    {test: 't' + Math.random(), value: 0, id: 2, name: 'a', tags: ['z']},
    {test: 't' + Math.random(), value: 6, id: 3, name: 'bc',
      tags: ['a', 'd', 'c']},
    {test: 't' + Math.random(), value: 7, id: 4, name: 'bc', tags: ['e', 'c']},
    {test: 't' + Math.random(), value: 8, id: 5, name: 'c', tags: ['b']},
    {test: 't' + Math.random(), value: 2, id: 6, name: 'c', tags: ['a']}
  ];

  // persist store data.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1, options);
    _db.clear(store_inline_index);
    _db.put(store_inline_index, objs);

    _db.count(store_inline_index).always(function() {
      df.resolve();  // this ensure all transactions are completed
    });
    _db.close();
  })();

  var db;
  var test_env = {
    setup: function() {
      db = new ydn.db.Storage(db_name, schema_1, options);
    },
    teardown: function() {
      var type = db.getType();
      test_count++;
      if (test_count >= 4) {
        db.close();
        ydn.db.deleteDatabase(db_name, type);
      }
    }
  };

  module('list', test_env);
  reporter.createTestSuite('query', 'list', ydn.db.version);
  var sorted_objs = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });
  var keys = objs.map(function(x) {return x.id;});

  asyncTest('1. by primary key range', 3, function() {
    df.always(function() {

      var q = db.from(store_inline_index, '>=', 1, '<=', 3);
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, objs.slice(1, 4), 'closed bound');
      });

      q.copy().reverse().list().always(function(x) {
        var exp = objs.slice(1, 4).reverse();
        deepEqual(x, exp, 'closed bound reverse');
      });

      q.copy().list(1).always(function(x) {
        deepEqual(x, objs.slice(1, 2), 'closed bound limit');
        start();
      });

    });
  });

  asyncTest('2. by index key range', 2, function() {
    df.always(function() {
      var q = db.from(store_inline_index).where('value', '>=', 2, '<=', 4);
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, sorted_objs.slice(1, 3), 'closed bound');
      });

      q = db.from(store_inline_index).where('value', '<', 4);
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, sorted_objs.slice(0, 2), 'open upperBound');
        start();
      });
    });
  });

  asyncTest('3. ordering', 5, function() {
    df.always(function() {
      /*
      db.values(store_inline_index).done(function(x) {
        console.log('values', x);
      })

      var iter = new ydn.db.ValueIterator(store_inline_index);
      db.values(iter).done(function(x) {
        console.log('iter', x);
      })
      */

      var q = db.from(store_inline_index);
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, objs, 'natural order');
      });

      q = db.from(store_inline_index).order('value');
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, sorted_objs, 'simple index order');
      });

      q = db.from(store_inline_index).where('value', '>=', 2, '<=', 4);
      q = q.order('value');
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, sorted_objs.slice(1, 3), 'closed bound');
      });

      q = db.from(store_inline_index).where('name', '>', 'a');
      throws(function() {
        q = q.order('value');
      }, Error, 'impossible ordering'
      );

      q = db.from(store_inline_index).where('name', '=', 'a');
      q = q.order('value');
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, [objs[2], objs[0], objs[1]], 'compound order');
        start();
      });


    });
  });

  asyncTest('4. primary keys by key range', 3, function() {
    df.always(function() {

      var q = db.from(store_inline_index, '>=', 1, '<=', 3);
      q.select('id').list().always(function(x) {
        // console.log(x, keys.slice(1, 4))
        deepEqual(x, keys.slice(1, 4), 'closed bound');
      });

      q.copy().reverse().select('id').list().always(function(x) {
        var exp = keys.slice(1, 4).reverse();
        deepEqual(x, exp, 'closed bound reverse');
      });

      q.copy().select('id').list(1).always(function(x) {
        deepEqual(x, keys.slice(1, 2), 'closed bound limit');
        start();
      });

    });
  });

})();




/*
 QUnit.testDone(function(result) {
 reporter.addResult('iterator', result.module,
 result.name, result.failed, result.passed, result.duration);
 });

 QUnit.moduleDone(function(result) {
 reporter.endTestSuite('iterator', result.name,
 {passed: result.passed, failed: result.failed});
 });

 QUnit.done(function(results) {
 reporter.report();
 });
 */
