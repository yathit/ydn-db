



(function () {


  asyncTest("abort in run", 4, function () {

    var db_name = 'test_abort_2';

    var schema = {
      stores: [
        {
          name: 's1',
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: 's2',
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: 's3',
          keyPath: 'id',
          type: 'NUMERIC'
        }]
    };
    var obj = {
      id: Math.random(),
      value: 'msg' + Math.random()
    };
    var obj2 = {
      id: Math.random(),
      value: 'msg' + Math.random()
    };

    var db = new ydn.db.Storage(db_name, schema);
    var adb = db.branch('atomic', true); // atomic-serial

    var done_count = 0;
    var done = function() {
      done_count++;
      if (done_count >= 2) {
        start();
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      }
    };

    var req = db.run(function (tdb) {
      tdb.put('s1', obj).always(function (key) {
        tdb.get('s1', obj.id).then(function (result) {
          equal(obj.value, result.value, 'store 1 result');
          req.abort();
        }, function (e) {
          ok(false, 'store 1 get not error');
        });
      });

    }, ['s1'], 'readwrite');
    req.always(function (x) {
      // console.log(x);
      db.get('s1', obj.id).always(function (result) {
        equal(undefined, result, 'aborted store 1 done result');
        done();
      });
    });

    db.run(function (tdb) {
      tdb.put('s2', obj).always(function (key) {
        tdb.get('s2', obj.id).always(function (result) {
          equal(obj.value, result.value, 'store 2 result');
        });
      });

    }, ['s2'], 'readwrite').always(function (t, e) {
          db.get('s2', obj.id).always(function (result) {
            equal(obj.value, result.value, 'store 2 done result');
            done();
          });
        });

  });

})();
