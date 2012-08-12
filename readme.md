Overview
Wrapper for web client databases, supporting HTML5 Indexeddb, Web SQL and localStorage.

This is designed to be web app friendly use case using twisted deferred pattern as implemented in Google Closure Library goog.async.Deferred module.

Features
Support IndexedDB, Web SQL and localStorage storage mechanisms.
Closure library module. Minified by closure compiler.
Database functions can be invoked even before database is fully initialised.
Well tested on both JsTestDriver and closure test suite.
Provide mocking by on memory store.
Support draft and almost-final standard, i.e, both setVersion and onupgradeneeded are handled behind the sense. Seamless version migration planned.
Each method call is an atomic transaction.
All methods are asynchronous.
Basic query support (not available in minified source).
Follow usual javascript etiquette like: single namespace, no global, no error globbing, good security practice, no eval, parameterized query.
Basic usage
Import lastest minified JS file from the downloaded page.

var db = new ydn.db.Storage('db name', {});

db.setItem('x', 'some value')

db.getItem('x').success(function(value) {
  console.log('x = ' + value);
}
For complete example, see in example.html source.

Depedency
This is require only if you compiled from source.

YDN Base

License
Licensed under the Apache License, Version 2.0