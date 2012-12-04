# Overview #

Beautiful database API for `(` secure `>` robust `>` high-performance `>` maintainable `)`
large-scale javascript web app.

# Setup #

If you haven't try [Closure Tools](https://developers.google.com/closure/) before,
setup can be time consuming and painful. I recommend to read
Michael Bolin book's [Closure: The Definitive Guide](http://shop.oreilly.com/product/0636920001416.do).
A good understanding of closure coding pattern is necessary to understand and
follow this library codes.

[Apache ant](http://ant.apache.org/) is used to build javascript compiler. ydn-base repo
[build.xml](https://bitbucket.org/ytkyaw/ydn-base/raw/master/build.xml) defines compiler
and others tools setting. You must change according to your local machine setting.

Downloads the following three repos a directory.

    svn checkout http://closure-library.googlecode.com/svn/trunk/
    git clone git@bitbucket.org:ytkyaw/ydn-db.git
    git clone https://bitbucket.org/ytkyaw/ydn-base.git

that should create three directories for closure-library, ydn-base and ydn-db.

Run local apache (recommended) or a static server on that directory.

    python -m SimpleHTTPServer 8001

Use HTML files in the /test folder for getting started. These files are also used debug development.

Note, we use master track version of closure tools. Compiling with pre-build jar
may encounter compile error.


# Testing #

You should able to run /ydn-db/test/all-test.html and pass all tests. These test
file are for basic testing and debugging.

Coverage test is performed by [JsTestDriver](http://code.google.com/p/js-test-driver/)
test. Notice that `ant gen-alltest-js` generate jsTestDriver.conf to prepare testing
configuration.

    java -jar JsTestDriver.jar --tests all

Use [qunit test kits](http://dev.yathit.com/test/compatibility_test.html) for end-to-end testing.


# Contributing #

For interested contributor, email to one of the authors in the source code.
We follow [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml).
All commit on master branch must pass most stringent setting compilation and all unit tests.

Few coding dialect we have as follow:

* Preferred variable naming is `like_this` `notLikeThis`. For function name, `useLikeThis` as usual.
* Assume native types (boolean, number, string) are not nullable. If nullable type is used,
it is different from `undefined`. Using `undefined` for missing value in native type
is encourage over `null`.

# Bug report #

Please [file an issue](https://bitbucket.org/ytkyaw/ydn-db/issues/new) for bug
report describing how we could reproduce the problem. Any subtle problem,
memory/speed performance issue and missing feature from stand point of IndexedDB
API will be considered.


# Documentation #

* Nice API documentation on [YDN](http://dev.yathit.com/api-reference/ydn-db/storage.html)
* [Release notes](https://bitbucket.org/ytkyaw/ydn-db/wiki/Release_notes)


# License #
Licensed under the Apache License, Version 2.0