# Overview #

Beautiful API for secure robust high-performance large-scale web app.

# Setup #

If you haven't try [Closure Tools] (https://developers.google.com/closure/) before,
setup can be time consuming and painful. I recommend to read
Michael Bolin book's [Closure: The Definitive Guide] (http://shop.oreilly.com/product/0636920001416.do).
A good understanding of closure coding pattern is necessary to understand and
follow this library codes.

[Apache ant] (http://ant.apache.org/) is used to build javascript compiler. ydn-base repo
[build.xml] (https://bitbucket.org/ytkyaw/ydn-base/raw/master/build.xml) defines compiler
and others tools setting. You must change according to your local machine setting.

Downloads the following three repos a directory.

    svn checkout http://closure-library.googlecode.com/svn/trunk/
    git clone git@bitbucket.org:ytkyaw/ydn-db.git
    git clone https://bitbucket.org/ytkyaw/ydn-base.git

that should create three directories for closure-library, ydn-base and ydn-db.

Run apache or a static server on that directory.

    python -m SimpleHTTPServer 8001

# Testing #

You should able to run /ydn-db/test/all-test.html and pass all tests. These test
file are for baisc testing and debuging.

Coverage test is performed by [JsTestDriver]  (http://code.google.com/p/js-test-driver/)
test. Notice that `ant gen-alltest-js` generate jsTestDriver.conf to prepare testing
configuration.

    java -jar JsTestDriver.jar --tests all

# Using #

Nice documentation on [YDN] (http://dev.yathit.com)


# License #
Licensed under the Apache License, Version 2.0