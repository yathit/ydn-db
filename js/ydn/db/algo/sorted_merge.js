/**
 * @fileoverview Sorted merge algorithm.
 *
 * Sorted merge algorithm join reference values of given iterators (and
 * streamers) to matching value by continuing them by highest reference value.
 *
 */

goog.provide('ydn.db.algo.SortedMerge');
goog.require('ydn.db.algo.AbstractSolver');
goog.require('ydn.db');


/**
 *
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)=} out output receiver.
 * @param {number=} limit limit.
 * @constructor
 * @extends {ydn.db.algo.AbstractSolver}
 */
ydn.db.algo.SortedMerge = function(out, limit) {
  goog.base(this, out, limit);

};
goog.inherits(ydn.db.algo.SortedMerge, ydn.db.algo.AbstractSolver);


/**
 * @define {boolean}
 */
ydn.db.algo.SortedMerge.DEBUG = false;

///**
// *
// * @type {boolean}
// * @private
// */
//ydn.db.algo.SortedMerge.prototype.sorted_ = false;
//
///**
// *
// * @type {Array}
// * @private
// */
//ydn.db.algo.SortedMerge.prototype.starting_keys_ = null;


///**
// *
// * @type {Array.<boolean>}
// * @private
// */
//ydn.db.algo.SortedMerge.prototype.reverses_ = [];
//
///**
// *
// * @type {Array.<boolean>}
// * @private
// */
//ydn.db.algo.SortedMerge.prototype.degrees_ = [];


/**
 * @inheritDoc
 */
ydn.db.algo.SortedMerge.prototype.begin = function(iterators, callback) {
//  this.reverses_ = [];
//  this.degrees_ = [];
//  for (var i = 0; i < iterators.length; i++) {
//    this.reverses_[i] = iterators[i].isReversed();
//    this.degrees_[i] = iterators[i].degree();
//  }
  return false;
};


/**
 * Sorted join algorithm.
 * @param {Array} keys keys.
 * @return {{
    advance: !Array,
    highest_key: *,
    all_match: boolean,
    skip: boolean
  }} sorted results.
 */
ydn.db.algo.SortedMerge.sort = function(keys) {

  var advancement = [];

  var base_key = keys[0];

  if (!goog.isDefAndNotNull(base_key)) {
    if (ydn.db.algo.SortedMerge.DEBUG) {
      window.console.log('SortedMerge: done.');
    }
    return  {
      advance: [],
      highest_key: null,
      all_match: false,
      skip: false
    };
  }
  var all_match = true; // let assume
  var skip = false;     // primary_key must be skip
  var highest_key = base_key;
  var cmps = [];

  for (var i = 1; i < keys.length; i++) {
    if (goog.isDefAndNotNull(keys[i])) {
      //console.log([keys[0], keys[i]])
      var cmp = ydn.db.cmp(base_key, keys[i]);
      cmps[i] = cmp;
      if (cmp === 1) {
        // base key is greater than ith key, so fast forward to ith key.
        all_match = false;
      } else if (cmp === -1) {
        // ith key is greater than base key. we are not going to get it
        all_match = false;
        skip = true; //
        if (ydn.db.cmp(keys[i], highest_key) === 1) {
          highest_key = keys[i];
        }
      }
      //i += this.degrees_[i]; // skip peer iterators.
    } else {
      all_match = false;
      skip = true;
    }
  }

  if (all_match) {
    // we get a match, so looking forward to next key.
    // all other keys are rewind
    for (var j = 0; j < keys.length; j++) {
      if (goog.isDefAndNotNull(keys[j])) {
        advancement[j] = true;
      }
    }
  } else if (skip) {
    // all jump to highest key position.
    for (var j = 0; j < keys.length; j++) {
      if (goog.isDefAndNotNull(keys[j])) {
        // we need to compare again, because intermediate highest
        // key might get cmp value of 0, but not the highest key
        if (ydn.db.cmp(highest_key, keys[j]) === 1) {
          advancement[j] = highest_key;
        }
      }
    }
  } else {
    // some need to catch up to base key
    for (var j = 1; j < keys.length; j++) {
      if (cmps[j] === 1) {
        advancement[j] = base_key;
      }
    }
  }

  if (ydn.db.algo.SortedMerge.DEBUG) {
    window.console.log('SortedMerge: match: ' + all_match +
      ', skip: ' + skip +
      ', highest_key: ' + JSON.stringify(highest_key) +
      ', keys: ' + JSON.stringify(keys) +
      ', cmps: ' + JSON.stringify(cmps) +
      ', advancement: ' + JSON.stringify(advancement));
  }

  return {
    advance: advancement,
    highest_key: highest_key,
    all_match: all_match,
    skip: skip
  }
};


/**
 * @inheritDoc
 */
ydn.db.algo.SortedMerge.prototype.solver = function (keys, values) {

  var sort_result = ydn.db.algo.SortedMerge.sort(keys);
  var match_key = sort_result.all_match ? sort_result.highest_key : null;

  return this.pusher(sort_result.advance, keys, values, match_key);
};