/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 5/8/12
 */

goog.provide('ydn.db.test');
goog.require('ydn.db.Db');

ydn.db.test.table = 't1';

/**
 * @return {ydn.db.DatabaseSchema}
 */
ydn.db.test.getSchema = function() {
	var basic_schema = new ydn.db.DatabaseSchema(1);
	basic_schema.addStore(new ydn.db.TableSchema(ydn.db.test.table));
	return basic_schema;
};


/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.db.test.db_clear_tests = function(queue, db) {

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
ydn.db.test.put_tests = function(queue, db) {

  queue.call('put a', function(callbacks) {
    db.setItem('a', '1').addCallback(callbacks.add(function(value) {
      assertEquals('put a 1', true, value);
    }));
  });
};


/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.db.test.get_tests = function(queue, db) {

  queue.call('put a', function(callbacks) {
    db.setItem('a', '1').addCallback(callbacks.add(function(value) {
      assertEquals('put a 1', true, value);
    }));
  });

  queue.call('get a', function(callbacks) {
    db.getItem('a').addCallback(callbacks.add(function(value) {
      assertEquals('get a 1', '1', value);
    }));
  });
};




/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.db.test.run_put_get_tests = function(queue, db) {

  queue.call('clear db before start', function(callbacks) {
    db.clear(ydn.db.test.table).addCallback(callbacks.add(function(value) {
      var result = value;
      if (goog.isArray(value)) {
        result = value.every(function(ok) {
          return !!ok;
        });
      }
      assertEquals('clear OK', true, result);
    }));
  });

  queue.call('count after clear', function(callbacks) {
    db.getCount(ydn.db.test.table).addCallback(callbacks.add(function(count) {
      //console.log('starting count ' + count);
      assertEquals('start with 0', 0, count);
    }));
  });

  var a_value = 'a' + Math.random();

  queue.call('put a', function(callbacks) {
    db.put(ydn.db.test.table, {id: 'a', value: a_value}).addCallback(callbacks.add(function(value) {
      assertEquals('put a ' + a_value, true, value);
    }));
  });


  queue.call('get a', function(callbacks) {
    db.get(ydn.db.test.table, 'a').addCallback(callbacks.add(function(value) {
      assertEquals('get a = ' + a_value, a_value, value.value);
    }));
  });

  queue.call('count 1', function(callbacks) {
    db.getCount(ydn.db.test.table).addCallback(callbacks.add(function(count) {
      //console.log('new count ' + count);
      assertEquals('count 2', 1, count);
    }));
  });

  queue.call('put b', function(callbacks) {
    db.put(ydn.db.test.table, {id: 'b', value: '2'}).addCallback(callbacks.add(function(value) {
      assertEquals('put b 2', true, value);
    }));
  });

  queue.call('get b', function(callbacks) {
    db.get(ydn.db.test.table, 'b').addCallback(callbacks.add(function(value) {
      assertEquals('get b 2', '2', value.value);
    }));
  });

  queue.call('count', function(callbacks) {
    db.getCount(ydn.db.test.table).addCallback(callbacks.add(function(count) {
      //console.log('new count 2 ' + count);
      assertEquals('count 2', 2, count);
    }));
  });

  queue.call('update a', function(callbacks) {
    db.put(ydn.db.test.table, {id: 'a', value: '3'}).addCallback(callbacks.add(function(value) {
      assertTrue('put a 3', value);
    }));
  });

  queue.call('get updated a', function(callbacks) {
    db.get(ydn.db.test.table, 'a').addCallback(callbacks.add(function(value) {
      assertEquals('get a 3', '3', value.value);
    }));
  });

  queue.call('count again', function(callbacks) {
    db.getCount(ydn.db.test.table).addCallback(callbacks.add(function(count) {
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


/**
 * @param queue
 * @param {ydn.db.Db} db
 */
ydn.db.test.special_keys_test = function(queue, db) {

  var test_key = function(key) {
    var key_value = 'a' + Math.random();
    queue.call('put ' + key, function(callbacks) {
      window.console.log('putting ' + key + key_value);
      db.put(ydn.db.test.table, {id: key, value: key_value}).addCallback(callbacks.add(function(value) {
        window.console.log('put ' + key + ' ' + value);
        assertTrue('put a 1', value);
      }));
    });

    queue.call('get ' + key, function(callbacks) {
      window.console.log('getting ' + key);
      db.get(ydn.db.test.table, key).addCallback(callbacks.add(function(value) {
        window.console.log('get ' + key + ' ' + value);
        assertEquals('get ' + key, key_value, value.value);
      }));
    });
  };

  test_key('x');

  var key = 't@som.com';
  test_key('t@som.com');
  test_key('http://www.ok.com');
  test_key('http://www.ok.com/ereom\ere#code?oer=ere');

};