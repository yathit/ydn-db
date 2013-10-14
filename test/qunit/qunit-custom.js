
var m = location.search.match(/module=(\w+)/);
var module = m ? m[1] : 'all';
m = location.search.match(/filename=(\w+)/);
var filename = m ? m[1] : 'ydn.db-isw-e.js';
m = location.search.match(/mechanism=(\w+)/);
var mechanisms = m ? [m[1]] : [];
m = location.search.match(/log=(\w+)/);
var log = m ? m[1] : '';
m = /ui/.test(location.search);
var ui = m ? !!m[1] : false;

var injectJs = function(url) {
  var node = document.createElement('script');
  node.type = 'text/javascript';
  node.src = url;
  var head = document.getElementsByTagName('head')[0];
  head.appendChild(node);
};

injectJs('../../jsc/' + filename);

var options = {mechanisms: mechanisms};
if (log) {
  if (ui) {
    if (ydn.debug && ydn.debug.log) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      ydn.debug.log('ydn.db', 'finest', div);
    } else {
      console.log('no logging facility');
    }
  } else {
    if (ydn.debug && ydn.debug.log) {
      ydn.debug.log('ydn.db', log);
    } else {
      console.log('no logging facility');
    }
  }
}

QUnit.config.testTimeout = 2000;
QUnit.config.reorder = false;
QUnit.config.autoStart = false;

// unit test runner must define suite name be for starting a module.
var reporter = new ydn.testing.Reporter('ydn-db', ydn.db.version);


QUnit.testDone(function(result) {
  reporter.addResult(result.module,
      result.name, result.failed, result.passed, result.duration);
});

QUnit.moduleDone(function(result) {
  reporter.endTestSuite(result.name, result);
});

QUnit.done(function() {
  // reporter.report();
});





