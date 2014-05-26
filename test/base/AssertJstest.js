/**
 * Created with IntelliJ IDEA.
 * User: kyawtun
 * Date: 22/8/12
 * Time: 10:24 PM
 * To change this template use File | Settings | File Templates.
 */

goog.provide('ydn.db.AssertJstest');
goog.require('goog.asserts');

ydn.db.AssertJstest = TestCase('ydn.db.AssertJstest');

ydn.db.AssertJstest.prototype.setUp = function() {



};


ydn.db.AssertJstest.prototype.tearDown = function() {

};



ydn.db.AssertJstest.prototype.testAssert = function() {
  goog.asserts.assert(1, 'asserted');
  assertTrue('done', true);
};



