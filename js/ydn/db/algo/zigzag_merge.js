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
ydn.db.algo.ZigzagMerge.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.algo.ZigzagMerge.prototype.solver = function (keys, values) {

  var advancement = [];

  /**
   * Return postfix value from the key.
   * @param {!Array} x the key.
   * @return {*}
   */
  var postfix = function(x) {
    return x[x.length - 2];
  };

  /**
   * Return prefix value from the key.
   * @param {!Array} x the key.
   * @return {!Array}
   */
  var prefix = function (x) {
    return x.slice(0, x.length - 2);
  };

  /**
   * Make full key from the prefix of given key and postfix parts.
   * @param {!Array} key original key.
   * @param {*} post_fix
   * @return {!Array} newly constructed key.
   */
  var makeKey = function(key, post_fix) {
    var new_key = prefix(key);
    new_key.push(post_fix);
    return new_key;
  };

  goog.asserts.assertArray(keys[0]);
  var base_key = postfix(keys[0]);

  if (!goog.isDefAndNotNull(base_key)) {
    if (ydn.db.algo.SortedMerge.DEBUG) {
      window.console.log('SortedMerge: done.');
    }
    return [];
  }
  var all_match = true; // let assume
  var skip = false;     // primary_key must be skip

  var highest_key = base_key;
  var cmps = [];

  for (var i = 1; i < keys.length; i++) {
    if (goog.isDefAndNotNull(keys[i])) {
      //console.log([values[0], keys[i]])
      var postfix_part = postfix(keys[i]);
      var cmp = ydn.db.cmp(base_key, postfix_part);
      cmps[i] = cmp;
      if (cmp === 1) {
        // base key is greater than ith key, so fast forward to ith key.
        all_match = false;
      } else if (cmp === -1) {
        // ith key is greater than base key. we are not going to get it
        all_match = false;
        skip = true; //
        if (ydn.db.cmp(postfix_part, highest_key) === 1) {
          highest_key = postfix_part;
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
        goog.asserts.assertArray(keys[j]);
        if (ydn.db.cmp(highest_key, postfix(keys[j])) === 1) {
          advancement[j] = makeKey(keys[j], highest_key);
        }
      }
    }
  } else {
    // some need to catch up to base key
    for (var j = 1; j < keys.length; j++) {
      if (cmps[j] === 1) {
        advancement[j] = makeKey(keys[j], base_key);
      }
    }
  }

  if (ydn.db.algo.ZigzagMerge.DEBUG) {
    window.console.log('ZigzagMerge: match: ' + all_match +
      ', skip: ' + skip +
      ', highest_key: ' + JSON.stringify(/** @type {Object} */ (highest_key)) +
      ', keys: ' + JSON.stringify(keys) +
      ', cmps: ' + JSON.stringify(cmps) +
      ', advancement: ' + JSON.stringify(advancement));
  }

  if (all_match) {
    this.match_count++;
    //console.log(['match key', match_key, JSON.stringify(keys)]);
    if (this.out) {
      this.out.push(highest_key);
    }
    return advancement;
  } else {
    return {'continue': advancement};
  }

};