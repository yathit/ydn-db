# Overview #

Web client database API for Indexeddb, Web SQL and
localStorage storage mechanisms supporting version migration, advanced query and transaction.

# Setup #

Run apache or a static server. On it public directory, downloads repo as follow

svn checkout http://closure-library.googlecode.com/svn/trunk/ closure-library
git clone git@bitbucket.org:ytkyaw/ydn-db.git
git clone https://bitbucket.org/ytkyaw/ydn-base.git

that should create three director for closure-library, ydn-base and ydn-db

# Testing #

You should able to run /ydn-db/test/all-test.html and pass all tests. Yes, it does when not raining :-)

And then, setup JsTestDriver  (http://code.google.com/p/js-test-driver/)
And test it

java -jar JsTestDriver.jar --tests all

# Using #

Nice tutorial on http://dev.yathit.com


# License #
Licensed under the Apache License, Version 2.0