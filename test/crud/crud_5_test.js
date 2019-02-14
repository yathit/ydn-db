
goog.require('goog.debug.Console');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.debug');

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();


var setUp = function() {

  ydn.json.POLY_FILL = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.crud.req.WebSql.DEBUG = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.tr.Serial.DEBUG = true;
  //ydn.db.crud.req.IndexedDb.DEBUG = true;
  // ydn.db.con.IndexedDb.DEBUG = true;

};

var tearDown = function() {

};


function test_index_values() {
  var db_name = 'test_index_values';
  var schema = {
    stores: [{
      name: 'store1',
      autoIncrement: true,
      indexes: [{
        name: 'id'
      }]
    }]
  };
  var data = [
    {id: 1, value: 'a' + Math.random()},
    {id: 3, value: 'a' + Math.random()},
    {id: 0, value: 'a' + Math.random()},
    {id: 2, value: 'a' + Math.random()}
  ];
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    return a.id < b.id ? -1 : 1;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.valuesByIndex('store1', 'id').addCallback(function(arr) {
      assertArrayEquals(sorted, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}


function test_index_values_unique() {
  var db_name = 'test_index_values_unique';
  var schema = {
    stores: [{
      name: 'store1',
      autoIncrement: true,
      indexes: [{
        name: 'id'
      }]
    }]
  };
  var data = [
    {id: 1, value: 'a' + Math.random()},
    {id: 1, value: 'a' + Math.random()},
    {id: 2, value: 'a' + Math.random()},
    {id: 3, value: 'a' + Math.random()},
    {id: 3, value: 'a' + Math.random()},
    {id: 3, value: 'a' + Math.random()}
  ];
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.valuesByIndex('store1', 'id', null, 10, 0, false, true).addCallback(function(arr) {
      var exp = [data[0], data[2], data[3]];
      assertArrayEquals(exp, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}


function test_index_values_reverse() {
  var db_name = 'test_index_values_reverse';
  var schema = {
    stores: [{
      name: 'store1',
      autoIncrement: true,
      indexes: [{
        name: 'id'
      }]
    }]
  };
  var data = [
    {id: 1, value: 'a' + Math.random()},
    {id: 3, value: 'a' + Math.random()},
    {id: 0, value: 'a' + Math.random()},
    {id: 2, value: 'a' + Math.random()}
  ];
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    return a.id < b.id ? 1 : -1;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.valuesByIndex('store1', 'id', null, 10, 0, true).addCallback(function(arr) {
      assertArrayEquals(sorted, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}


function test_index_values_with_limit() {
  var db_name = 'test_index_values_with_limit';
  var schema = {
    stores: [{
      name: 'store1',
      autoIncrement: true,
      indexes: [{
        name: 'id'
      }]
    }]
  };
  var data = [
    {id: 1, value: 'a' + Math.random()},
    {id: 3, value: 'a' + Math.random()},
    {id: 0, value: 'a' + Math.random()},
    {id: 2, value: 'a' + Math.random()}
  ];
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    return a.id < b.id ? -1 : 1;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.valuesByIndex('store1', 'id', null, 3).addCallback(function(arr) {
      var exp = sorted.slice(0, 3);
      assertArrayEquals(exp, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}


function test_index_values_with_limit_offset() {
  var db_name = 'test_index_values_with_limit';
  var schema = {
    stores: [{
      name: 'store1',
      autoIncrement: true,
      indexes: [{
        name: 'id'
      }]
    }]
  };
  var data = [
    {id: 1, value: 'a' + Math.random()},
    {id: 3, value: 'a' + Math.random()},
    {id: 0, value: 'a' + Math.random()},
    {id: 2, value: 'a' + Math.random()}
  ];
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    return a.id < b.id ? -1 : 1;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.valuesByIndex('store1', 'id', null, 2, 1).addCallback(function(arr) {
      var exp = sorted.slice(1, 3);
      assertArrayEquals(exp, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}


function test_index_keys() {
  var db_name = 'test_index_keys';
  var schema = {
    stores: [{
      name: 'store1',
      keyPath: 'id',
      indexes: [{
        name: 'idx'
      }]
    }]
  };
  var data = [
    {idx: 1, value: 'a' + Math.random(), id: Math.random()},
    {idx: 3, value: 'a' + Math.random(), id: Math.random()},
    {idx: 0, value: 'a' + Math.random(), id: Math.random()},
    {idx: 2, value: 'a' + Math.random(), id: Math.random()}
  ];
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    return a.idx < b.idx ? -1 : 1;
  });
  var keys = sorted.map(function(x) {
    return x.id;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.keysByIndex('store1', 'idx').addCallback(function(arr) {
      assertArrayEquals(keys, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}


function test_index_keys_with_keyRange() {
  var db_name = 'test_index_keys_with_keyRange';
  var schema = {
    stores: [{
      name: 'store1',
      keyPath: 'id',
      indexes: [{
        name: 'idx'
      }]
    }]
  };
  var data = [
    {idx: 1, value: 'a' + Math.random(), id: Math.random()},
    {idx: 3, value: 'a' + Math.random(), id: Math.random()},
    {idx: 0, value: 'a' + Math.random(), id: Math.random()},
    {idx: 2, value: 'a' + Math.random(), id: Math.random()}
  ];
  var sorted = data.slice();
  sorted = sorted.filter(function(x) {
    return x.idx >= 1 && x.idx <= 2;
  });
  sorted.sort(function(a, b) {
    return a.idx < b.idx ? -1 : 1;
  });
  var keys = sorted.map(function(x) {
    return x.id;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    var kr = ydn.db.KeyRange.where('>=', 1, '<=', 2);
    tdb.keysByIndex('store1', 'idx', kr).addCallback(function(arr) {
      assertArrayEquals(keys, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}

function test_index_keys_with_limit() {
  var db_name = 'test_index_keys';
  var schema = {
    stores: [{
      name: 'store1',
      keyPath: 'id',
      indexes: [{
        name: 'idx'
      }]
    }]
  };
  var data = [
    {idx: 1, value: 'a' + Math.random(), id: Math.random()},
    {idx: 3, value: 'a' + Math.random(), id: Math.random()},
    {idx: 0, value: 'a' + Math.random(), id: Math.random()},
    {idx: 2, value: 'a' + Math.random(), id: Math.random()}
  ];
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    return a.idx < b.idx ? -1 : 1;
  });
  var keys = sorted.map(function(x) {
    return x.id;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.keysByIndex('store1', 'idx', null, 2).addCallback(function(arr) {
      assertArrayEquals(keys.slice(0, 2), arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}


function test_index_keys_reverse() {
  var db_name = 'test_index_keys_reverse';
  var schema = {
    stores: [{
      name: 'store1',
      keyPath: 'id',
      indexes: [{
        name: 'idx'
      }]
    }]
  };
  var data = [
    {idx: Math.random(), value: 'a' + Math.random(), id: Math.random()},
    {idx: Math.random(), value: 'a' + Math.random(), id: Math.random()},
    {idx: Math.random(), value: 'a' + Math.random(), id: Math.random()},
    {idx: Math.random(), value: 'a' + Math.random(), id: Math.random()}
  ];
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    return a.idx < b.idx ? 1 : -1;
  });
  var keys = sorted.map(function(x) {
    return x.id;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.keysByIndex('store1', 'idx', null, 10, 0, true).addCallback(function(arr) {
      assertArrayEquals(keys, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}


function test_index_keys_reverse_limit_offset() {
  var db_name = 'test_index_keys_reverse';
  var schema = {
    stores: [{
      name: 'store1',
      keyPath: 'id',
      indexes: [{
        name: 'idx'
      }]
    }]
  };
  var data = [
    {idx: Math.random(), value: 'a' + Math.random(), id: Math.random()},
    {idx: Math.random(), value: 'a' + Math.random(), id: Math.random()},
    {idx: Math.random(), value: 'a' + Math.random(), id: Math.random()},
    {idx: Math.random(), value: 'a' + Math.random(), id: Math.random()}
  ];
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    return a.idx < b.idx ? 1 : -1;
  });
  var keys = sorted.map(function(x) {
    return x.id;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.keysByIndex('store1', 'idx', null, 2, 1, true).addCallback(function(arr) {
      var exp = keys.slice(1, 3);
      assertArrayEquals(exp, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}

function test_index_keys_limit_offset() {
  var db_name = 'test_index_keys_limit_offset';
  var schema = {
    stores: [{
      name: 'store1',
      keyPath: 'id',
      indexes: [{
        name: 'idx'
      }]
    }]
  };
  var data = [
    {idx: 1, value: 'a' + Math.random(), id: Math.random()},
    {idx: 3, value: 'a' + Math.random(), id: Math.random()},
    {idx: 0, value: 'a' + Math.random(), id: Math.random()},
    {idx: 2, value: 'a' + Math.random(), id: Math.random()}
  ];
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    return a.idx < b.idx ? -1 : 1;
  });
  var keys = sorted.map(function(x) {
    return x.id;
  });
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put('store1', data).addCallback(function() {
    db.close();
    var tdb = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('values');
    tdb.keysByIndex('store1', 'idx', null, 2, 1).addCallback(function(arr) {
      var exp = keys.slice(1, 3);
      assertArrayEquals(exp, arr);
      asyncTestCase.continueTesting();
      ydn.db.deleteDatabase(db_name, tdb.getType());
      tdb.close();
    });
  });
}


function test_list_primary_key_resume() {

  var db_name = 'test_list_resume';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      indexes: [{
        keyPath: 'value'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: 0, value: 2, type: 'a'},
    {id: 1, value: 3, type: 'a'},
    {id: 2, value: 2, type: 'b'},
    {id: 3, value: 2, type: 'b'},
    {id: 4, value: 1, type: 'c'},
    {id: 5, value: 1, type: 'c'},
    {id: 6, value: 3, type: 'c'}
  ];

  var arr = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : a.value < b.value ? -1 :
        a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
  });
  var keys = arr.map(function(x) {return x.id;});
  var rev = arr.slice().reverse();
  var rev_keys = keys.slice().reverse();
  var mth = ydn.db.base.QueryMethod.LIST_PRIMARY_KEY;

  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put(store_name, objs).addCallback(function(value) {
    db.close();
    db = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('list');
    db.list(mth, 'st', undefined, null, 10, 0, false, false, [4])
        .addBoth(function(value) {
          assertArrayEquals([5, 6], value);
          asyncTestCase.continueTesting();
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        });
  });
}


function test_list_primary_key_index_resume() {

  var db_name = 'test_list_index_resume';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      indexes: [{
        keyPath: 'value'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: 0, value: 2, type: 'a'},
    {id: 1, value: 3, type: 'a'},
    {id: 2, value: 2, type: 'b'},
    {id: 3, value: 2, type: 'b'},
    {id: 4, value: 1, type: 'c'},
    {id: 5, value: 1, type: 'c'},
    {id: 6, value: 3, type: 'c'}
  ];

  var arr = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : a.value < b.value ? -1 :
        a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
  });
  var keys = arr.map(function(x) {return x.id;});
  var rev = arr.slice().reverse();
  var rev_keys = keys.slice().reverse();
  var mth = ydn.db.base.QueryMethod.LIST_PRIMARY_KEY;

  asyncTestCase.waitForAsync('put');
  db.clear();
  db.put(store_name, objs).addCallback(function(value) {
    db.close();
    db = new ydn.db.crud.Storage(db_name, schema, options);
    asyncTestCase.continueTesting();
    asyncTestCase.waitForAsync('list');
    db.list(mth, 'st', 'value', null, 10, 0, false, false, [1, 5])
        .addBoth(function(value) {
          assertArrayEquals(keys.slice(2), value);
          asyncTestCase.continueTesting();
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        });
  });
}
