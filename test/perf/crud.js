/**
 * @fileoverview Performance test.
 */


var db_name = 'pref-test-1';
var schema = {
  stores: [
    {
      name: 'st',
      autoIncrement: true
    }]
};
var db = new ydn.db.Storage(db_name, schema);


var testPutSmall = function(db, data, onComplete, n) {
  // small data put test
  var small_data = {foo: 'bar'};
  for (var i = 0; i < n; i++) {
    var req = db.put('st', small_data);
    if (i == n - 1) {
      req.always(function() {
        onComplete(); // timer end
      });
    }
  }
};


var testPutOnRunSmall = function(th_db, data, onComplete, n) {
  // small data put test
  var small_data = {foo: 'bar'};
  var req = db.run(function(tdb) { // make sure req is committed.
    for (var i = 0; i < n; i++) {
      tdb.put('st', small_data);
    }
  }, null, 'readwrite');
  req.always(function() {
    onComplete();
  });
};


var initPutArraySmall = function(cb, n) {
  // small data put test
  var data = [];
  for (var i = 0; i < n; i++) {
    data[i] = {foo: 'bar'};
  }
  cb(data);
};


var testPutArraySmall = function(db, data, onComplete, n) {
  var req = db.put('st', data);
  req.always(function() {
    // make sure it complete write
    db.get('st', 1).always(function() {
      onComplete();
    });
  });
};

var initGetSmall = function(onComplete) {
  var data = [];
  for (var i = 0; i < n; i++) {
    data[i] = {foo: 'bar'};
  }
  var req = db.put('st', data);
  req.always(function() {
    // make sure it complete write
    db.get('st', 1).always(function() {
      onComplete();
    });
  });
};

var testGetSmall = function(db, data, onComplete, n) {
  // small data put test
  var small_data = {foo: 'bar'};
  for (var i = 0; i < n; i++) {
    var req = db.put('st', small_data);
    if (i == n - 1) {
      req.always(function() {
        onComplete(); // timer end
      });
    }
  }
};


var pref = new Pref(db);
pref.addTest('Put (small-object)', testPutSmall, null, 1000);
pref.addTest('Put array (small-object)', testPutArraySmall, initPutArraySmall, 1000);
pref.addTest('Put on a transaction (small-object)', testPutOnRunSmall, null, 1000);
pref.run();
