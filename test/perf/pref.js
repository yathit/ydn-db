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

  this.threads = [
    db,
    db.branch('single', false),
    db.branch('multi', false),
    db.branch('single', true),
    db.branch('multi', true)
  ];
};


var RowView = function(test) {
  var tr = document.createElement('TR');
  var webkit = /WebKit/.test(navigator.userAgent);
  // details tag is only supported by webkit browser.
  var disp = webkit ? '' : 'style="display: none;"';
  var init = test.init ? '<p>Initialization function</p><pre>' +
      test.init.toString() + '</pre>' : '';
  tr.innerHTML = '<td><details><summary>' + test.title + '</summary>' +
      '<div ' + disp + '>' + init +
      '<p>Test function</p><pre>' +
      test.test.toString() + '</pre></div></details></td>' +
      '<td></td><td></td><td></td><td></td>';
  this.ele_result_.appendChild(tr);
  this.results_ = [];
  this.tr_ = tr;
};


/**
 * @type {HTMLElement}
 * @private
 */
RowView.prototype.ele_result_ = document.getElementById('result-tbody');

RowView.prototype.addResult = function(idx, op_sec) {
  this.results_.push(op_sec);
  var total = this.results_.reduce(function(x, p) {return x + p}, 0);
  var avg = (total / this.results_.length) | 0;
  var td = this.tr_.children[idx];
  setTimeout(function() {
    td.textContent = avg;
  }, 10);
};


Pref.prototype.runTest = function(test, onFinished) {
  var me = this;
  var view = new RowView(test);
  var onReady = function(data) {
    // run test for each thread.
    var runTest = function(idx) {
      var start = + new Date();
      var onComplete = function() {
        var end = + new Date();
        var elapse = end - start;
        var op_sec = (1000 * test.n / elapse) | 0;
        if (idx > 0) { // first result is discarded
          view.addResult(idx, op_sec);
        }
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
  if (test.init) {
    test.init(function(data) {
      me.prev_data_ = data;
      onReady(data);
    }, test.n);
  } else {
    onReady(me.prev_data_);
  }

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
