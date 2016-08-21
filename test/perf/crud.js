// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Performance test.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

// ydn.debug.log('ydn.db', 'finest');

var db_name = 'pref-test-1';
var schema = {
  stores: [
    {
      name: 'st',
      autoIncrement: true
    }, {
      name: 'big',
      autoIncrement: true,
      indexes: [
        {
          name: 'n',
          unique: true,
          type: 'NUMERIC'
        }, {
          name: 't',
          type: 'TEXT'
        }, {
          name: 'm',
          multiEntry: true
        }]
    }]
};
var options = {size: 200 * 1024 * 1024};
if (/websql/.test(location.hash)) {
  options.mechanisms = ['websql'];
} else if (/indexeddb/.test(location.hash)) {
  options.mechanisms = ['indexeddb'];
} else if (/localstorage/.test(location.hash)) {
  options.mechanisms = ['localstorage'];
} else if (/memory/.test(location.hash)) {
  options.mechanisms = ['memory'];
}
var db = new ydn.db.Storage(db_name, schema, options);


var testPutTightSmall = function(db, data, onComplete, n) {
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


var testPutSmall = function(db, data, onComplete, n) {
  var small_data = {foo: 'bar'};
  var test = function(i) {
    var req = db.put('st', small_data);
    i++;
    req.always(function(x) {
      if (i == n) {
        onComplete(); // timer end
      } else {
        test(i);
      }
    });
  };
  test(0);
};


var testPutOnRunSmall = function(th_db, data, onComplete, n) {
  // NOTE: thread policy don't metter in this test.
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


var initClear = function(cb) {
  db.clear().always(function() {
    cb();
  });
};


var initPutArraySmall = function(cb, n) {
  // small data put test
  var data = [];
  for (var i = 0; i < n; i++) {
    data[i] = {foo: 'bar'};
  }
  db.clear().always(function() {
    cb(data);
  });
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

var initGetSmall = function(onComplete, n) {
  db.clear('st').always(function() {
    var data = [];
    for (var i = 0; i < n; i++) {
      data[i] = {foo: 'bar'};
    }
    var req = db.put('st', data);
    req.always(function() {
      // make sure it complete write
      db.keys('st', null, 1).always(function(x) {
        // smallest key
        onComplete(x[0]);
      });
    });
  });
};


var testGetTightSmall = function(db, start, onComplete, nOp, n) {
  // small data put test
  var cnt = 0;
  for (var i = 0; i < nOp; i++) {
    var id = (start + (n * Math.random())) | 0;
    var req = db.get('st', id);
    req.id = id;
    req.always(function(x) {
      if (!x) {
        var msg = this + ' id ' + this.id + ' not found';
        setTimeout(function() {
          throw new Error(msg);
        }, 1);
      }
      cnt++;
      if (cnt == nOp) {
        onComplete(); // timer end
      }
    }, req);
  }
};


var testGetSmall = function(db, start, onComplete, nOp, n) {
  // small data put test
  var test = function(i) {
    var id = (start + (n * Math.random())) | 0;
    var req = db.get('st', id);
    i++;
    req.id = id;
    req.always(function(x) {
      if (!x) {
        var msg = this + ' id ' + this.id + ' not found';
        setTimeout(function() {
          throw new Error(msg);
        }, 1);
      }
      if (i == nOp) {
        onComplete(); // timer end
      } else {
        test(i);
      }
    }, req);
  };
  test(0);
};


var testValuesKeyRangeSmall = function(db, start, onComplete, nOp, nData) {
  var safeRange = nData - nOp;
  var range = ydn.db.KeyRange.lowerBound(safeRange * Math.random());
  db.values('st', range, nOp).always(function(x) {
    onComplete();
    if (x.length != nOp) {
      throw new Error('result must have ' + nOp + ' objects, but found ' +
          x.length, x);
    }
  });
};


var testKeysKeyRangeSmall = function(db, start, onComplete, nOp, nData) {
  var safeRange = nData - nOp;
  var range = ydn.db.KeyRange.lowerBound(safeRange * Math.random());
  db.keys('st', range, nOp).always(function(x) {
    onComplete();
    if (x.length != nOp) {
      throw new Error('keys result must have ' + nOp + ' objects, but found ' +
          x.length, x);
    }
  });
};

var initBigData = function(cb, n) {
  var long =  (new Array(1000)).join(
      (new Array(10)).join('abcdefghijklmnopuqstubc'));
  var data = [];
  for (var i = 0; i < n; i++) {
    var arr = [];
    for (var j = 0; j < 16; j++) {
      arr[j] = Math.random();
    }
    data[i] = {
      load: long,
      n: Math.random(),
      m: arr,
      t: Math.random().toString(36).slice(2)
    };
  }
  console.log(n + ' big data generated');
  cb(data);
};


var testPutBig = function(db, data, onComplete, n) {
  // small data put test
  var small_data = {foo: 'bar'};
  for (var i = 0; i < n; i++) {
    var req = db.put('big', small_data);
    if (i == n - 1) {
      req.always(function() {
        onComplete(); // timer end
      });
    }
  }
};

var init100IndexData = function(cb) {
  initBigData(function(data) {
    db.clear('big').always(function() {
      var req = db.put('big', data);
      req.always(function() {
        cb(data); // timer end
      });
    });
  }, 100);
};


var valuesIndexKeyRangeBig = function(db, start, onComplete, n) {
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var range = ydn.db.KeyRange.lowerBound(Math.random());
    db.values('big', 'n', range, 1).always(function(x) {
      cnt++;
      if (cnt == n) {
        onComplete(); // timer end
      } else {
        // console.log(x); // ok
      }
    });
  }
};



var keysIndexKeyRangeBig = function(db, start, onComplete, n) {
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var range = ydn.db.KeyRange.lowerBound(Math.random());
    db.keys('big', 'n', range, 1).always(function(x) {
      cnt++;
      if (cnt == n) {
        onComplete(); // timer end
      } else {
        // console.log(x); // ok
      }
    });
  }
};

var valuesIndexKeyRangeBigLimit5 = function(db, start, onComplete, n) {
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var range = ydn.db.KeyRange.lowerBound(Math.random());
    db.values('big', 'n', range, 10).always(function(x) {
      cnt++;
      if (cnt == n) {
        onComplete(); // timer end
      } else {
        // console.log(x); // ok
      }
    });
  }
};


var keysIndexKeyRangeBigLimit5 = function(db, start, onComplete, n) {
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var range = ydn.db.KeyRange.lowerBound(Math.random());
    db.keys('big', 'n', range, 10).always(function(x) {
      cnt++;
      if (cnt == n) {
        onComplete(); // timer end
      } else {
        // console.log(x); // ok
      }
    });
  }
};

var valuesIndexIterBig = function(db, start, onComplete, n) {
  for (var i = 0; i < n; i++) {
    var iter = ydn.db.IndexValueIterator.where('big', 'n', '>', Math.random());
    db.values(iter, 1).always(function(x) {
      if (i == n - 1) {
        onComplete(); // timer end
      } else {

      }
    });
  }
};


var pref = new Pref(db);

pref.addTest('Put (small-object)', testPutSmall, initClear, 100);
pref.addTest('Put tight loop (small-object)', testPutTightSmall, initClear, 100);
pref.addTest('Put array (small-object)', testPutArraySmall, initPutArraySmall, 100);
pref.addTest('Put on a transaction (small-object)', testPutOnRunSmall, initClear, 100);

pref.addTest('Get (small-object), 100 records', testGetSmall, initGetSmall, 100);
pref.addTest('Get (small-object), 1000 records', testGetSmall, initGetSmall, 100, 1000);
pref.addTest('Get (small-object), 10000 records', testGetSmall, initGetSmall, 100, 10000);
pref.addTest('Get tight loop (small-object), 100 records', testGetTightSmall, initGetSmall, 100);
pref.addTest('Get tight loop (small-object), 100000 records', testGetTightSmall, initGetSmall, 100, 100000);
pref.addTest('Values by key range (small-object), 100 records', testValuesKeyRangeSmall, initGetSmall, 100, 101);
pref.addTest('Keys by key range (small-object), 100 records', testKeysKeyRangeSmall, null, 100, 101);
pref.addTest('Values by key range (small-object), 10000 records', testValuesKeyRangeSmall, initGetSmall, 100,  10000);
pref.addTest('Keys by key range (small-object), 10000 records', testKeysKeyRangeSmall, null, 100,10000);
pref.addTest('Put (with indexes)', testPutBig, initBigData, 20);

pref.addTest('Keys index key range limit 1', keysIndexKeyRangeBig, init100IndexData, 20);
pref.addTest('Values index key range limit 1', valuesIndexKeyRangeBig, null, 20);
pref.addTest('Values index key range limit 10', valuesIndexKeyRangeBigLimit5, null, 20);
pref.addTest('Keys index key range limit 10', keysIndexKeyRangeBigLimit5, null, 20);

pref.run();
