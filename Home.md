Client-side javascript database module.

=== Goal ===

Beautiful API for secure robust high-performance large-scale web app.

=== Features ===

* Support IndexedDB, Web SQL and localStorage storage mechanisms.
* Well tested closure library module.
* Support [version migration](http://dev.yathit.com/ydn-db/using/schema.html), encryption, high level [query](http://dev.yathit.com/ydn-db/starting/query.html) and advance [transaction workflow](http://dev.yathit.com/ydn-db/starting/transaction.html).
* Each method call is an atomic transaction. All methods are asynchronous.
* We adopt strict javascript coding pattern: no global, no eval, no error globbing, parameterized query, all public methods and constructors are strongly type, this is this, coding error throw error. 
* JQuery plugin available (see download section).

=== Basic usage ===

Import lastest minified JS script (see download section) to your HTML files. This will create single object in the global scope, call **ydn.db.Storage**.

{{{
#!javascript

var db = new ydn.db.Storage('db name');

db.setItem('x', 'some value')

db.getItem('x').success(function(value) {
  console.log('x = ' + value);
}
}}}

==== Query ====
Calculate average by using query
{{{
#!javascript

q = db.query('customer').average('age');
avg = q.fetch()

}}}
Key-range query 
{{{
#!javascript
q = db.query('customer', 'age', 18, 25).where('sex', '=', 'FEMALE').select('full_name')
young_girl_names = q.fetch()
}}}

==== Transaction ====

Example for updating an entity with a new property value relative to its current value.
{{{
#!javascript

db.transaction(function(tdb) {
   tdb.get('player', 1).success(function(p1_obj) {
        p1_obj.health += 10;
        tdb.put('player', p123_obj);
   });
}, ['player'], 'readwrite');

}}}

==== Encryption ====
String value data can be optionally encrypted using SHA-1 cipher. 
{{{
#!javascript
db = new ydn.db.Store('store name')
db.setSecret(passphase); // generally send from server side upon login
db.setItem(key, value, 3600*1000); // data expire on one hour
db.getItem(key); // data will be decrypted using the provided passphase
}}}

=== Resources ===

* [[http://dev.yathit.com/ydn-db/using.html | Using YDN-DB]] 
* [[http://dev.yathit.com/api-reference/ydn-db-storage.html | API Reference]]
* [[http://dev.yathit.com/ydn-db/demos.html | Demo applications]]


=== Setup, download and dependency ===
 
For project setup and testing, see readme.md in the source code root folder.

The following compiled distribution js are available on download section. Use only one.

* **Raw:** //ydn-db-x.x.js// a compiled file without minification, but comments are stripped. Use this for testing and debugging. Turn on logging or change compiled constant like {{{ydn.db.adapter.IndexedDb.DEBUG = true;}}}. Most file will have one debug flag. Logging are enable and capture by using standard closure logging system, {{{goog.debug.Logger}}}.
* **Production:** //ydn-db-min-x.x.js// for production site.  
* **Core:** //core-ydn-db-min-x.x.js// minified js file for production site. It is only a database wrapper. 
* **JQuery** //jquery-ydn-db-min-x.x.js// same as ydn-db-min-x.x.js, but attached to JQuery object.
* **Development:** //dev-ydn-db-min-x.x.js// same as ydn-db-min-x.x.js, with assertion/warning/error are display.

If any file is missing, download the source codes and compile them by running [[http://ant.apache.org/ | JAVA ant]] task, {{{ant build}}}, to accompanying build.xml file with [[https://developers.google.com/closure/compiler/ | closure compiler]]. [[http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/ | Javascript source maps file]] will also be generated.  

This library depend on the following library. This is required only if you compiled from source.

* [[http://git.yathit.com/ydn-base | YDN Base]]
* [[http://code.google.com/p/closure-library/ | Closure library]]

=== Contributing ===

For interested contributor, email to one of the authors in the source code. We follow [[http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml | Google JavaScript Style Guide]]. All commit on master branch must pass most stringent setting compilation and all unit tests.

=== Bug report ===

Please [[https://bitbucket.org/ytkyaw/ydn-db/issues/new | file an issue]] for bug report describing how we could reproduce the problem. Any subtle problem, memory/speed performance issue and missing feature from stand point of IndexedDB API will be considered.  

=== License ===

Licensed under the Apache License, Version 2.0 