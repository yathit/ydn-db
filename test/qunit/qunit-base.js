
var options = {}; // options = {mechanisms: ['websql']};
if (/log/.test(location.hash)) {
  if (/ui/.test(location.hash)) {
    if (ydn.debug && ydn.debug.log) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      ydn.debug.log('ydn.db', 'finest', div);
    } else {
      console.log('no logging facility');
    }
  } else {
    if (ydn.debug && ydn.debug.log) {
      ydn.debug.log('ydn.db', 'finest');
    } else {
      console.log('no logging facility');
    }
  }
}
if (/websql/.test(location.hash)) {
  options['mechanisms'] = ['websql'];
}
if (/localstorage/.test(location.hash)) {
  options['mechanisms'] = ['localstorage'];
}


QUnit.config.testTimeout = 2000;

// unit test runner must define suite name be for starting a module.
var suite_name = '';
var reporter = new ydn.testing.Reporter('ydn-db', ydn.db.version);


QUnit.testDone(function(result) {
  reporter.addResult(suite_name, result.module,
    result.name, result.failed, result.passed, result.duration);
});

QUnit.moduleDone(function(result) {
  reporter.endTestSuite(suite_name, result.name,
      {passed: result.passed, failed: result.failed});
});

QUnit.done(function() {
  reporter.report();
});





