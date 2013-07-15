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
 * @fileoverview Performance test runner.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
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
  this.results_ = [[], [], [], [], []];
  this.tr_ = tr;
};


/**
 * @type {HTMLElement}
 * @private
 */
RowView.prototype.ele_result_ = document.getElementById('result-tbody');


RowView.std = function(mean, items) {
  var deltaSquaredSum = 0;
  for (var i = 0; i < items.length; i++) {
    var delta = items[i] - mean;
    deltaSquaredSum += delta * delta;
  }
  var variance = deltaSquaredSum / (items.length - 1);
  return Math.sqrt(variance);
};


RowView.tDist = function(n) {
  var tDistribution = [NaN, NaN, 12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20];
  return tDistribution[n] || 2.20;
};


/**
 * Add a new test result.
 * @param {number} idx index of thread type.
 * @param {number} op_sec operations per second.
 */
RowView.prototype.addResult = function(idx, op_sec) {
  if (idx == 0) {
    return;
  }
  var scores = this.results_[idx];
  var td = this.tr_.children[idx];
  scores.push(op_sec);
  setTimeout(function() {
    // update in separate thread.
    var total = scores.reduce(function(x, p) {return x + p}, 0);
    var mean = (total / scores.length);
    var count = scores.length;
    if (count > 2) {
      var sqrtCount = Math.sqrt(count);
      var stdDev = RowView.std(mean, scores);
      var stdErr = stdDev / sqrtCount;
      var tDist = RowView.tDist(count);
      // http://stackoverflow.com/questions/4448600
      // http://www.webkit.org/perf/sunspider-0.9.1/sunspider-compare-results.js
      var error = ' ± ' + ((tDist * stdErr / mean) * 100).toFixed(1) + '%';
      td.innerHTML = '<span>' + (mean | 0) + '</span><sup>' + error + '</sup>';
    } else {
      td.textContent = (mean | 0);
    }
  }, 10);
};


/**
 * @param {Object} test test object.
 * @param {Function} onFinished callback on finished the test.
 */
Pref.prototype.runTest = function(test, onFinished) {
  var me = this;
  var view = new RowView(test);
  var onReady = function(data) {
    var runRepeat = function(lap) {
      if (lap == test.nRepeat) {
        onFinished();
        return;
      }
      lap++;
      // run test for each thread.
      var runTest = function(idx) {
        var start = + new Date();
        var onComplete = function() {
          var end = + new Date();
          var elapse = end - start;
          var op_sec = (1000 * test.nOp / elapse) | 0;
          view.addResult(idx, op_sec);
          idx++;
          if (idx < me.threads.length) {
            runTest(idx);
          } else {
            runRepeat(lap);
          }
        };
        test.test(me.threads[idx], data, onComplete, test.nOp);
      };
      runTest(0);
    };
    runRepeat(0);
  };
  if (test.init) {
    test.init(function(data) {
      me.prev_data_ = data;
      onReady(data);
    }, test.nOp);
  } else {
    onReady(me.prev_data_);
  }

};


/**
 * @param {string} title test title.
 * @param {Function} test test function.
 * @param {Function} init initialization function.
 * @param {number=} nOp number of op. Default to 1.
 * @param {number=} nRepeat number of op. Default to 1.
 */
Pref.prototype.addTest = function(title, test, init, nOp, nRepeat) {
  this.tests_.push({
    db: db,
    title: title,
    test: test,
    init: init,
    nOp: nOp || 1,
    nRepeat: nRepeat || 1
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
