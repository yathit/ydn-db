/**
 * @fileoverview Zigzag merge algorithm.
 *
 * Zigzag merge join reference values of given composite index iterators (and
 * streamers) to matching value by continuing the last highest element of
 * effective values.
 *
 * Ref: http://www.google.com/events/io/2010/sessions/next-gen-queries-appengine.html
 */

goog.provide('ydn.db.algo.ZigzagMerge');
goog.require('ydn.db.algo.SortedMerge');
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
  this.buffer_ = [];
  this.order_ = [];
  this.merged_ = false;
  this.smallest_ = NaN;
};
goog.inherits(ydn.db.algo.ZigzagMerge, ydn.db.algo.AbstractSolver);


/**
 * @define {boolean}
 */
ydn.db.algo.ZigzagMerge.DEBUG = false;


/**
 * Output buffer is keys from the first iterator that is not verified
 * by the filters.
 * @type {Array}
 * @private
 */
ydn.db.algo.ZigzagMerge.prototype.buffer_ = [];


/**
 * Sort order of buffer_ array.
 * This is a linked list corresponding to each buffer_.
 * @type {Array}
 * @private
 */
ydn.db.algo.ZigzagMerge.prototype.order_ = [];


/**
 *
 * @type {boolean}
 * @private
 */
ydn.db.algo.ZigzagMerge.prototype.merged_ = false;

/**
 *
 * @type {number}
 * @private
 */
ydn.db.algo.ZigzagMerge.prototype.smallest_ = NaN;


/**
 * @inheritDoc
 */
ydn.db.algo.ZigzagMerge.prototype.begin = function(iterators, callback) {
  if (iterators.length == 1) {
    throw new ydn.error.InvalidOperationException('number of iterators must be ' +
      'more than one.');
  }
  if (iterators.length > 2) {
    this.merged_ = true;
  }
  goog.array.clear(this.buffer_);
  goog.array.clear(this.order_);
  this.smallest_ = NaN;
  return false;
};


/**
 * @inheritDoc
 */
ydn.db.algo.ZigzagMerge.prototype.solver = function (keys, values) {

  var advance;
  var all_match = false;
  var skip = false;
  var highest_key;
  if (this.merged_) {
    var sort_out = ydn.db.algo.SortedMerge.sort(keys.slice(1));
    advance = sort_out.advance;
    all_match = sort_out.all_match;
    skip = sort_out.skip;
    highest_key = sort_out.highest_key;
  } else {
    var match = goog.isDefAndNotNull(keys[1]);
    if (match) {
      advance = [true];
      highest_key = keys[1];
      all_match = true;
    } else {
      advance = [];
    }
  }
  if (advance.length == 0) {
    goog.array.clear(this.buffer_);
    return [];
  }



//    while (!isNaN(this.smallest_)) {
//      var key = this.buffer_[this.smallest_];
//      var next = this.order_[this.smallest_];
//      if (ydn.db.cmp(key, highest_key) === 1) {
//        this.buffer_.splice(this.smallest_, 1);
//        this.order_.splice(this.smallest_, 1);
//        var next_smallest = this.order_[next];
//        this.smallest_ = goog.isDef(next_smallest) ? next_smallest : NaN;
//      } else {
//        break;
//      }
//    }
    for (var i = this.buffer_.length - 1; i > 0; i--) {
      if (ydn.db.cmp(this.buffer_[i], highest_key) != -1) {
        this.buffer_.splice(i, 1);
      }
    }

    if (all_match) {
      advance.unshift(true); // advance it
    } else {
      this.buffer_.push(keys[0]);
      advance.unshift(null); // keep it
    }

  return advance;

};