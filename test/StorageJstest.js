/**
 * @fileoverview JsTestDriver test unit for ydn.store.Storage.
 */

goog.provide('ydn.store.StorageJstest');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.Storage');
goog.require('ydn.utils');


ydn.store.StorageJstest = AsyncTestCase("StorageJstest");

ydn.store.StorageJstest.prototype.setUp = function() {
  //console.log('running test for PageJstest');

  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.store').setLevel(goog.debug.Logger.Level.FINEST);

  this.dbname = 'test_1';
  this.table = 'test';
  this.schema = {};
  this.schema[this.table] = {'keyPath': 'id'};

};


/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.store.StorageJstest.prototype.db_clear_tests = function(queue, db) {

  queue.call('clear db', function(callbacks) {
    var df_clear = db.clear();
    df_clear.addCallback(callbacks.add(function(value) {
      assertEquals('clear OK', true, value);
    }));
    df_clear.addErrback(callbacks.add(function(e) {
      window.console.log(e);
      fail(e);
    }));
  });

  queue.call('count', function(callbacks) {
    db.getCount().addCallback(callbacks.add(function(count) {
      assertEquals('count 0', 0, count);
    }));
  });
};

/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.store.StorageJstest.prototype.put_tests = function(queue, db) {

  queue.call('put a', function(callbacks) {
    db.put('a', '1').addCallback(callbacks.add(function(value) {
      assertEquals('put a 1', true, value);
    }));
  });
};

/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.store.StorageJstest.prototype.get_tests = function(queue, db) {

  queue.call('put a', function(callbacks) {
    db.put('a', '1').addCallback(callbacks.add(function(value) {
      assertEquals('put a 1', true, value);
    }));
  });

  queue.call('get a', function(callbacks) {
    db.get('a').addCallback(callbacks.add(function(value) {
      assertEquals('get a 1', '1', value);
    }));
  });
};


/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.store.StorageJstest.prototype.put_get_tests = function(queue, db) {

  queue.call('clear db before start', function(callbacks) {
      db.clear().addCallback(callbacks.add(function(value) {
        var result = value;
        if (goog.isArray(value)) {
          result = value.every(function(ok) {
            return !!ok;
          })
        }
        assertEquals('clear OK', true, result);
      }));
  });

  queue.call('count after clear', function(callbacks) {
    db.getCount().addCallback(callbacks.add(function(count) {
      //console.log('starting count ' + count);
      assertEquals('start with 0', 0, count);
    }));
  });

  var a_value = 'a' + Math.random();

  queue.call('put a', function(callbacks) {
    db.put('a', a_value).addCallback(callbacks.add(function(value) {
      assertEquals('put a ' + a_value, true, value);
    }));
  });


  queue.call('get a', function(callbacks) {
    db.get('a').addCallback(callbacks.add(function(value) {
      assertEquals('get a = ' + a_value, a_value, value);
    }));
  });

  queue.call('count 1', function(callbacks) {
    db.getCount().addCallback(callbacks.add(function(count) {
      //console.log('new count ' + count);
      assertEquals('count 2', 1, count);
    }));
  });

  queue.call('put b', function(callbacks) {
    db.put('b', '2').addCallback(callbacks.add(function(value) {
      assertEquals('put b 2', true, value);
    }));
  });

  queue.call('get b', function(callbacks) {
    db.get('b').addCallback(callbacks.add(function(value) {
      assertEquals('get b 2', '2', value);
    }));
  });

  queue.call('count', function(callbacks) {
    db.getCount().addCallback(callbacks.add(function(count) {
      //console.log('new count 2 ' + count);
      assertEquals('count 2', 2, count);
    }));
  });

  queue.call('update a', function(callbacks) {
    db.put('a', '3').addCallback(callbacks.add(function(value) {
      assertEquals('put a 3', true, value);
    }));
  });

  queue.call('get updated a', function(callbacks) {
    db.get('a').addCallback(callbacks.add(function(value) {
      assertEquals('get a 3', '3', value);
    }));
  });

  queue.call('count again', function(callbacks) {
    db.getCount().addCallback(callbacks.add(function(count) {
      assertEquals('count again', 2, count);
    }));
  });

//  queue.call('clear db', function(callbacks) {
//    db.clear().addCallback(callbacks.add(function(value) {
//      assertEquals('clear OK', true, value);
//    }));
//  });
//
//  queue.call('count', function(callbacks) {
//    db.getCount().addCallback(callbacks.add(function(count) {
//      assertEquals('count 0', 0, count);
//    }));
//  });
};

//ydn.store.StorageJstest.prototype.test_clear_sqllite = function(queue) {
//  var db = new ydn.db.Sqlite('test', 't1');
//  this.db_clear_tests(queue, db);
//};


//ydn.store.StorageJstest.prototype.test_clear_indexeddb = function(queue) {
//  var db = new ydn.db.IndexedDb('idbtest', 't1');
//  this.db_clear_tests(queue, db);
//};


ydn.store.StorageJstest.prototype.test_put_get_sqllite = function(queue) {
  if (ydn.db.Sqlite.isSupported()) {
    var db = new ydn.db.Sqlite(this.dbname, {}, '2');
    this.put_get_tests(queue, db);
  } else {
    fail('websql not supported');
  }
};


ydn.store.StorageJstest.prototype.test_put_get_memory = function(queue) {
  var db = new ydn.db.MemoryStore(this.dbname, {}, '1');
  this.put_get_tests(queue, db);
};


//
//ydn.store.StorageJstest.prototype.test_get_indexeddb = function(queue) {
//  var db = new ydn.db.IndexedDb('idbtest2', 't1');
//  this.get_tests(queue, db);
//};
//
//ydn.store.StorageJstest.prototype.test_put_indexeddb = function(queue) {
//  var db = new ydn.db.IndexedDb('idbtest3', 't1');
//  this.put_tests(queue, db);
//};


ydn.store.StorageJstest.prototype.test_put_get_indexeddb = function(queue) {
  var db = new ydn.db.IndexedDb(this.dbname, {});
  this.put_get_tests(queue, db);
};


ydn.store.StorageJstest.prototype.test_put_get_html5 = function(queue) {
  var db = new ydn.db.Html5Db(this.dbname, {});
  this.put_get_tests(queue, db);
};


/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.store.StorageJstest.prototype.special_keys_test = function(queue, db) {

  var test_key = function(key) {
    var key_value = 'a' + Math.random();
    queue.call('put ' + key, function(callbacks) {
      window.console.log('putting ' + key + key_value);
      db.put(key, key_value).addCallback(callbacks.add(function(value) {
        window.console.log('put ' + key + ' ' + value);
        assertEquals('put a 1', true, value);
      }));
    });

    queue.call('get ' + key, function(callbacks) {
      window.console.log('getting ' + key);
      db.get(key).addCallback(callbacks.add(function(value) {
        window.console.log('get ' + key + ' ' + value);
        assertEquals('get ' +  key, key_value, value);
      }));
    });
  };

  test_key('x');

  var key = 't@som.com';
  test_key('t@som.com');
  test_key('http://www.ok.com');
  test_key('http://www.ok.com/ereom\ere#code?oer=ere');

};


/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.store.StorageJstest.prototype.putObject_test = function(queue, db) {

};

ydn.store.StorageJstest.prototype.test_special_key_indexeddb = function(queue) {
  var db = new ydn.db.IndexedDb(this.dbname + '2', {});
  this.special_keys_test(queue, db);
};

ydn.store.StorageJstest.prototype.test_special_key_sqlite = function (queue) {
  if (ydn.db.Sqlite.isSupported()) {
    var db = new ydn.db.Sqlite(this.dbname + '2', {});
    this.special_keys_test(queue, db);
  } else {
    fail('websql not supported');
  }
};

ydn.store.StorageJstest.prototype.test_special_key_html5 = function(queue) {
  var db = new ydn.db.Html5Db(this.dbname + '2', {});
  this.special_keys_test(queue, db);
};

ydn.store.StorageJstest.prototype.test_special_key_memory = function(queue) {
  var db = new ydn.db.MemoryStore(this.dbname + '2', {});
  this.special_keys_test(queue, db);
};


/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.store.StorageJstest.prototype.put_get_object_tests = function(queue, db) {

  queue.call('clear db before start', function(callbacks) {
    db.clear(self.table).addCallback(callbacks.add(function(value) {
      assertTrue('clear OK', value);
    }));
  });

  queue.call('count after clear', function(callbacks) {
    db.getCount(self.table).addCallback(callbacks.add(function(count) {
      //console.log('starting count ' + count);
      assertEquals('start with 0', 0, count);
    }));
  });

  var self = this;
  var key = 'id' + Math.random();
  var ori_value = {'id': key, value: 'value' + Math.random()};

  queue.call('put a', function(callbacks) {
    db.putObject(self.table, ori_value).addCallback(callbacks.add(function(value) {
      assertTrue('put a = ' + JSON.stringify(ori_value), value);
    }));
  });


  queue.call('get a', function(callbacks) {
    db.getObject(self.table, key).addCallback(callbacks.add(function(value) {
      assertTrue('get a = ' + JSON.stringify(value) + ' of ' + JSON.stringify(ori_value),
          ydn.object.isSame(ori_value, value));
    }));
  });

  queue.call('count after put', function(callbacks) {
    db.getCount(self.table).addCallback(callbacks.add(function(count) {
      //console.log('starting count ' + count);
      assertEquals('now 1', 1, count);
    }));
  });

  queue.call('clear on exit', function(callbacks) {
    db.clear(self.table).addCallback(callbacks.add(function(value) {
      assertTrue('clear OK', value);
    }));
  });
};


ydn.store.StorageJstest.prototype.test_put_get_object_indexeddb = function(queue) {
  var db = new ydn.db.IndexedDb(this.dbname + '3', this.schema);
  this.put_get_object_tests(queue, db);
};

ydn.store.StorageJstest.prototype.test_put_get_object_memory = function(queue) {
  var db = new ydn.db.MemoryStore(this.dbname + '3', this.schema);
  this.put_get_object_tests(queue, db);
};

ydn.store.StorageJstest.prototype.test_put_get_object_sqlite = function (queue) {
  if (ydn.db.Sqlite.isSupported()) {
    var db = new ydn.db.Sqlite(this.dbname + '3', this.schema);
    this.put_get_object_tests(queue, db);
  } else {
    fail('websql not supported');
  }
};

ydn.store.StorageJstest.prototype.test_put_get_object_html5 = function(queue) {
  var db = new ydn.db.Html5Db(this.dbname + '3', this.schema, '3');
  this.put_get_object_tests(queue, db);
};