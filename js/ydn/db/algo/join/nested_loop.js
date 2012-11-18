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
 * @param {(function(!Array, !Array): !Array)=} adapter transform scan result
 * to algorithm input and output.
 * @constructor
 * @extends {ydn.db.algo.AbstractSolver}
 */
ydn.db.algo.NestedLoop = function(out, adapter) {
  goog.base(this, out, adapter);
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
  // the innermost loop is always iterating
  if (goog.isDef(keys[keys.length - 1])) {
    advancement[keys.length - 1] = false; // restart
    advancement[this.current_loop] = true; // next
  } else {
    advancement[keys.length - 1] = false; // the innermost loop is always iterating
  }

  if (!goog.isDef(keys[this.current_loop])) {
    // current loop is finished.
    if (this.current_loop == 0) {
      return []; // last loop. done.
    } else {
      this.current_loop--;
      advancement[this.current_loop] = false; // restart
    }
  }

  if (ydn.db.algo.NestedLoop.DEBUG) {
    window.console.log([keys, values, advancement]);
  }

  return advancement;
};