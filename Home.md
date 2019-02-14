Client-side javascript database module for Indexeddb, Web SQL and localStorage storage mechanisms supporting version migration, advanced query and transaction.

# Goal 

Beautiful API for secure robust high-performance large-scale web apps.

## Features

* Supports IndexedDB, Web SQL and localStorage storage mechanisms.
* Well tested closure library module.
* Supports [version migration](http://dev.yathit.com/ydn-db/using/schema.html), encryption, high level [query](http://dev.yathit.com/ydn-db/starting/query.html) and advanced [transaction workflow](http://dev.yathit.com/ydn-db/starting/transaction.html).
* Each method call is an atomic transaction. All methods are asynchronous.
* We adopt strict javascript coding patterns: no global; no eval; no error globbing; parameterized query; all public methods and all constructors are strongly typed; this is this; and coding errors throw errors. 
* JQuery plugin available (see download section).

## Basic usage 

Import lastest minified JS script (see download section) to your HTML files. This will create a single object in the global scope, called **ydn.db.Storage**.


    var db = new ydn.db.Storage('db name');
    db.put('store1', {test: 'Hello World!'}, 123);
    db.get('store1', 123).done(function(value) {
      console.log(value);
    }

### Resources

* [User Guide](http://dev.yathit.com/ydn-db/getting-started.html)
* [API Reference](http://dev.yathit.com/api-reference/ydn-db/storage.html)
* [Demo applications](http://dev.yathit.com/ydn-db/doc/example/index.html)
* [Example applications](http://yathit.github.io/ydndb-demo/)
* [Release notes](https://bitbucket.org/ytkyaw/ydn-db/wiki/Release_notes)
* [Download](http://dev.yathit.com/ydn-db/downloads.html)


### Setup, download and dependency 
 
For project setup and testing, see readme.md in the source code root folder.

The following compiled js distributions are available on download section. Use only one.

* **Raw:** //ydn-db-x.x.js// a compiled file without minification but with comments stripped. Use this for testing and debugging. Turn on logging or change compiled constants like `ydn.db.con.IndexedDb.DEBUG = true;`. Most files will have one debug flag. Logging is enabled and captured using the standard closure logging system, `goog.debug.Logger`.
* **Production:** //ydn-db-min-x.x.js// for production sites.  
* **Core:** //core-ydn-db-min-x.x.js// minified js file for production sites. It is only a database wrapper. 
* **JQuery** //jquery-ydn-db-min-x.x.js// same as ydn-db-min-x.x.js, but attached to JQuery object.
* **Development:** //dev-ydn-db-min-x.x.js// same as ydn-db-min-x.x.js, with assertion/warning/error display.

If any file is missing, download the source code and compile by running the [JAVA ant](http://ant.apache.org/) task, `ant build`, using the accompanying build.xml file with [closure compiler](https://developers.google.com/closure/compiler/). [Javascript source maps file](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/) will also be generated.  

This repository was originally hosted at [Bitbucket] (http://git.yathit.com/ydn-db/wiki/Home).

This library depends on the following libraries. These are only required if you compiled from source.

* [YDN Base](http://git.yathit.com/ydn-base)
* [Closure library] (http://code.google.com/p/closure-library/)

## Contributing 

For the interested contributor, email to one of the authors in the source code. We follow the [Google JavaScript Style Guide] (http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml). All commits on master branch must pass the most stringent compilation settings and all unit tests.

### Bug reports

Please [file an issue] (https://github.com/yathit/ydn-db/issues/new) for your bug report describing how we can reproduce the problem. Subtle problems, memory/speed performance issues and missing features of  IndexedDB API will be considered.  

## License 

Licensed under the Apache License, Version 2.0 
