/**
 * @fileoverview Performance test runner.
 */


document.getElementById('version').textContent = ydn.db.version;



/**
 * Performance test runner.
 * @param {ydn.db.Storage} db database.
 * @constructor
 */
var Pref = function(db) {
  this.db = db;
  db.addEventListener('ready', function() {
    document.getElementById('mechanism').textContent = db.getType();
  });
  this.tests_ = [];
  this.ele_result = document.getElementById('result-tbody');

  var mode = 'readwrite';
  this.threads = [
    db.branch('single', false, undefined, mode),
    db.branch('multi', false, undefined, mode),
    db.branch('single', true, undefined, mode),
    db.branch('multi', true, undefined, mode),
    db.branch('single', false, undefined, mode)
  ];
};


Pref.prototype.runTest = function(test, onFinished) {
  var me = this;
  var tr = document.createElement('TR');
  var td = document.createElement('TD');
  td.innerHTML = '<details><summary>' + test.title + '</summary><pre>' +
      test.test.toString() + '</pre></details>';
  tr.appendChild(td);
  var onReady = function(data) {
    me.ele_result.appendChild(tr);
    // run test for each thread.
    var runTest = function(idx) {
      var start = + new Date();
      var onComplete = function() {
        var end = + new Date();
        var elapse = end - start;
        var op_sec = (1000 * test.n / elapse) | 0;
        var td = document.createElement('TD');
        td.textContent = op_sec;
        tr.appendChild(td);
        idx++;
        if (idx < me.threads.length) {
          runTest(idx);
        } else {
          onFinished();
        }
      };
      test.test(me.threads[idx], data, onComplete, test.n);
    };
    runTest(0);
  };
  this.db.clear().always(function() {
    if (test.init) {
      test.init(function(data) {
        onReady(data);
      }, test.n);
    } else {
      onReady();
    }
  });

};


/**
 * @param {string} title test title.
 * @param {Function} test test function.
 * @param {Function} init initialization function.
 * @param {number=} n number of op. Default to 1.
 */
Pref.prototype.addTest = function(title, test, init, n) {
  this.tests_.push({
    db: db,
    title: title,
    test: test,
    init: init,
    n: n || 1
  });
};


Pref.prototype.tearDown = function() {
  // clean up.
  ydn.db.deleteDatabase(this.db.getName(), this.db.getType());
  this.db.close();
};


Pref.prototype.run = function() {
  var test = this.tests_.shift();
  var me = this;
  var onComplete = function() {
    me.run();
  };
  if (test) {
    this.runTest(test, onComplete);
  } else {
    this.tearDown();
  }
};
