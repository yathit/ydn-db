/**
 * @fileoverview Naive Nested Loop Join algorithm.
 *
 * A simple nested-loop join (NLJ) algorithm reads rows from the first table in
 * a loop one at a time, passing each row to a nested loop that processes the
 * next table in the join. This process is repeated as many times as there
 * remain tables to be joined.
 *
 * Ref: http://dev.mysql.com/doc/refman/5.1/en/nested-loop-joins.html
 */

goog.provide('ydn.db.algo.NestedLoop');
goog.require('ydn.db.algo.AbstractSolver');


/**
 *
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)=} out output receiver.
 * @param {number=} limit limit.
 * @constructor
 * @extends {ydn.db.algo.AbstractSolver}
 */
ydn.db.algo.NestedLoop = function(out, limit) {
  goog.base(this, out, limit);
};
goog.inherits(ydn.db.algo.NestedLoop, ydn.db.algo.AbstractSolver);


/**
 * @define {boolean}
 */
ydn.db.algo.NestedLoop.DEBUG = true;

/**
 * Index of active iterator.
 * @type {number}
 */
ydn.db.algo.NestedLoop.prototype.current_loop = -1;


/**
 * @inheritDoc
 */
ydn.db.algo.NestedLoop.prototype.begin = function(iterators, callback) {
  // we start with innermost loop.
  this.current_loop = iterators.length - 1;
  return false;
};


/**
 * @inheritDoc
 */
ydn.db.algo.NestedLoop.prototype.solver = function (keys, values) {

  // initialize advancement array
  var advancement = [];

  var all_restarting = true;

  var next = function (idx) {
    if (!goog.isDef(keys[idx])) {
      advancement[idx] = false; // restart
      if (idx - 1 >= 0) {
        next(idx - 1);
      }
    } else {
      all_restarting = false;
      advancement[idx] = true;
    }
  };

  next(keys.length - 1); // the innermost loop is always iterating

  if (ydn.db.algo.NestedLoop.DEBUG) {
    window.console.log([keys, values, advancement]);
  }

  return all_restarting ? [] : advancement;
};