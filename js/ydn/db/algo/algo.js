/**
 * @fileoverview Basic algorithm for database operations.
 */


goog.provide('ydn.db.algo');


/**
 * Nested Loop Join algorithm.
 *
 * A simple nested-loop join (NLJ) algorithm reads rows from the first table in
 * a loop one at a time, passing each row to a nested loop that processes the
 * next table in the join. This process is repeated as many times as there
 * remain tables to be joined.
 *
 * Ref: http://dev.mysql.com/doc/refman/5.1/en/nested-loop-joins.html
 *
 * @const
 * @type {function(!Array, !Array)}
 */
ydn.db.algo.NESTED_LOOP_JOIN = function (keys, index_keys) {

};