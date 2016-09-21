/**
 * Created with IntelliJ IDEA.
 * User: kyawtun
 * Date: 14/10/13
 * Time: 12:37 PM
 * To change this template use File | Settings | File Templates.
 */

goog.provide('ydn.Hi');


/**
 * @param {string} name
 * @constructor
 */
ydn.Hi = function(name) {
  /**
   * @type {string}
   * @private
   */
  this.name_ = name;
};


/**
 * greet
 */
ydn.Hi.prototype.greet = function() {
  return('hi ' + this.name_);
};


/**
 * greet
 */
ydn.Hi.prototype.insult = function() {
  return('shit ' + this.name_);
};



