/**
 * @fileoverview Zigzag merge algorithm.
 *
 * The first iterator is primary iterator. The result come from ordering the
 * primary iterator.
 * This algorithm require monotoniously ascending or descending key from
 * iterators.
 *
 * Ref: http://www.google.com/events/io/2010/sessions/next-gen-queries-appengine.html
 */

goog.provide('ydn.db.algo.ZigzagMerge');
goog.require('ydn.db.algo.AbstractSolver');
goog.require('ydn.db');


/**
 *
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)=} out output receiver.
 * @param {number=} limit limit.
 * @constructor
 * @extends {ydn.db.algo.AbstractSolver}
 */
ydn.db.algo.ZigzagMerge = function(out, limit) {
  goog.base(this, out, limit);

};
goog.inherits(ydn.db.algo.ZigzagMerge, ydn.db.algo.AbstractSolver);


/**
 * @define {boolean}
 */
ydn.db.algo.ZigzagMerge.DEBUG = true;

///**
// *
// * @type {boolean}
// * @private
// */
//ydn.db.algo.ZigzagMerge.prototype.sorted_ = false;
//
///**
// *
// * @type {Array}
// * @private
// */
//ydn.db.algo.ZigzagMerge.prototype.starting_keys_ = null;


///**
// *
// * @type {Array.<boolean>}
// * @private
// */
//ydn.db.algo.ZigzagMerge.prototype.reverses_ = [];
//
///**
// *
// * @type {Array.<boolean>}
// * @private
// */
//ydn.db.algo.ZigzagMerge.prototype.degrees_ = [];


/**
 * @inheritDoc
 */
ydn.db.algo.ZigzagMerge.prototype.begin = function(iterators, callback) {
//  this.reverses_ = [];
//  this.degrees_ = [];
//  for (var i = 0; i < iterators.length; i++) {
//    this.reverses_[i] = iterators[i].isReversed();
//    this.degrees_[i] = iterators[i].degree();
//  }
  return false;
};


/**
 * @inheritDoc
 */
ydn.db.algo.ZigzagMerge.prototype.solver = function (keys, values) {

  //console.log(['scanning', keys]);
//  // we keep starting keys so that we know the minimum (or maximum) of the key.
//  if (this.sorted_ && !this.starting_keys_) {
//    this.starting_keys_ = [];
//    for (var i = 0; i < keys.length; i++) {
//      this.starting_keys_[i] = goog.isArray(keys[i]) ?
//          goog.array.clone(keys[i]) : keys[i];
//    }
//  }

  var advancement = [];

  var all_match = goog.isDefAndNotNull(keys[0]);
  if (!all_match) {
    return [];
  }
  var skip = false;

  for (var i = 1; i < keys.length; i++) {
    if (goog.isDefAndNotNull(keys[i])) {
      //console.log([keys[0], keys[i]])
      var cmp = ydn.db.cmp(keys[0], keys[i]);
      if (cmp == 0) {
        // we get a match, so looking forward to next key.
        advancement[i] = true;
      } else if (cmp == 1) {
        // base key is greater than ith key, so fast forward to ith key.
        advancement[i] = true;
        all_match = false;
      } else {
        // ith key is greater than base key. we are not going to get it
        skip = true; // rewind
        break;
      }
      //i += this.degrees_[i]; // skip peer iterators.
    }
  }

  if (skip) {
    advancement[0] = true;
    // all other keys are rewind (should move forward to base key?)
    for (var j = 1; j < keys.length; j++) {
      advancement[i] = false;
    }
  } else if (all_match) {
    // we get a match, so looking forward to next key.
    advancement[0] = true;
    // all other keys are rewind
    for (var j = 1; j < keys.length; j++) {
      advancement[j] = false;
    }
  }


  return advancement;
};