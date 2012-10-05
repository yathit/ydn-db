/**
 * @fileoverview JsTestDriver test unit for ydn.store.Storage.
 */

goog.provide('ydn.store.StorageJstest');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.Storage');
goog.require('ydn.db.test');


ydn.store.StorageJstest = AsyncTestCase('StorageJstest');

ydn.store.StorageJstest.prototype.setUp = function() {
  //console.log('running test for PageJstest');

  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.Storage').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);

  this.dbname = 'storage_test_4-';

};


ydn.store.StorageJstest.prototype.test_setItem = function(queue) {
  var db = new ydn.db.Storage(this.dbname + '1');

  queue.call('not initialized', function(callbacks) {
    assertUndefined('not initialized', db.db);
  });

  queue.call('set schema', function(callbacks) {
    db.setSchema(ydn.db.test.getSchema());
  });

  queue.call('initialized', function(callbacks) {
    assertTrue('db initialized', db.isReady());
  });

  queue.call('put a', function(callbacks) {
    db.setItem('a', '1').addBoth(callbacks.add(function(value) {
      assertEquals('put a OK', 'a', value);
    }));
  });

};


/**
 * Test database can be use before initialized.
 * @param queue
 */
ydn.store.StorageJstest.prototype.test_setItem_getItem = function(queue) {
  var db = new ydn.db.Storage(this.dbname + '2');

  var v = 'a' + Math.random();
  db.setItem('a', v); // using db before initialized.

  queue.call('not initialized', function(callbacks) {
    assertFalse('not initialized', db.isReady());
  });

  queue.call('set schema', function(callbacks) {
    db.setSchema(ydn.db.test.getSchema());
  });

  queue.call('initialized', function(callbacks) {
    assertTrue('db initialized', db.isReady());
  });

  queue.call('get a', function(callbacks) {
    db.getItem('a').addBoth(callbacks.add(function(value) {
      assertEquals('get a OK', v, value);
    }));
  });

  // to make sure transaction can continue.
  queue.call('get a again', function(callbacks) {
    db.getItem('a').addBoth(callbacks.add(function(value) {
      assertEquals('get a again', v, value);
    }));
  });

  queue.call('get b', function(callbacks) {
    db.getItem('b').addBoth(callbacks.add(function(value) {
      assertUndefined('no b', value);
    }));
  });

  queue.call('get a again 2', function(callbacks) {
    db.getItem('a').addBoth(callbacks.add(function(value) {
      assertEquals('get a again 2', v, value);
    }));
  });
};



/**
 * Test database can be use before initialized.
 * @param queue
 */
ydn.store.StorageJstest.prototype.test_put_get = function(queue) {
  var db = new ydn.db.Storage(this.dbname + '3');
	this.table = ydn.db.test.table;
  var self = this;

  var v = {'id': 'a', 'value': 'a' + Math.random()};
  db.put(this.table, v); // using db before initialized.

  queue.call('not initialized', function(callbacks) {
		assertFalse('not initialized', db.isReady());
  });

  queue.call('set schema', function(callbacks) {
    db.setSchema(ydn.db.test.getSchema());
  });

  queue.call('initialized', function(callbacks) {
    assertTrue('db initialized', db.isReady());
  });

  queue.call('get a', function(callbacks) {
    db.get(self.table, 'a').addBoth(callbacks.add(function(value) {
      assertEquals('get a OK', v, value);
    }));
  });

  // to make sure transaction can continue.
  queue.call('get a again', function(callbacks) {
    db.get(self.table, 'a').addBoth(callbacks.add(function(value) {
      assertEquals('get a again', v, value);
    }));
  });

  queue.call('get b', function(callbacks) {
    db.get(self.table, 'b').addBoth(callbacks.add(function(value) {
      assertUndefined('no b', value);
    }));
  });

  queue.call('get a again 2', function(callbacks) {
    db.get(self.table, 'a').addBoth(callbacks.add(function(value) {
      assertEquals('get a again 2', v, value);
    }));
  });
};


/**
 * Test for JSON configruation
 * @param queue
 */
ydn.store.StorageJstest.prototype.test_json_config = function(queue) {

  var store = {name:'todo', keyPath:"timeStamp"};

  var schema_ver1 = {
    version: 2,
    size: 1 * 1024 * 1024, // 1 MB
    Stores:[store]
  };

  var db = new ydn.db.Storage('todo_test', schema_ver1);

  // it is wired that without this initialized test, it fail.
  // it is likely from js test bug.
  queue.call('initialized', function(callbacks) {
    assertTrue('db initialized', db.isReady());
  });

  queue.call('get todo table', function(callbacks) {
    db.get('todo').addCallback(callbacks.add(function(value) {
      assertEquals('empty', [], value);
    }));
  })
};


