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


ydn.db.algo.NestedLoop = function() {

};


/**
 * Index of active iterator.
 * @type {Number}
 */
ydn.db.algo.NestedLoop.prototype.current_loop = -1;

/**
 * @inheritDoc
 */
ydn.db.algo.NestedLoop.prototype.next = function (keys, index_keys, values, filters) {
  if (this.current_loop == -1) {
    // we start with innermost loop.
    this.current_loop = keys.length - 1;
  }
  // initialize advancement array
  // all null (undefined) means, none of the iterator is advancing.
  var advancement = [];
  advancement[keys.length - 1] = null;
  var has_adv = false;
  for (var i = 0; i < keys.length; i++) {
    if (!goog.isDef(keys[i])) {
      // completed iterator
      if (i != 0) {
        keys[i] = false; // request to restart the iteration
        keys[i - 1] = true; // advance outer iterator
      } // i == 0 means we are done.
      has_adv = true;
      break;
    }
  }
  if (!has_adv) {
    // continue looping current
    advancement[current_loop] = true;
  }
  return advancement;
};