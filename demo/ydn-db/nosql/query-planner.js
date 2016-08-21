/**
 * @fileoverview Query planer.
 *
 * User: kyawtun
 * Date: 11/2/13
 */


/**
 *
 * @param {string} store_name
 * @param {{index_name: string, value: *, range: *}} filter
 * @param {boolean} reverse
 * @constructor
 */
var BasicQuery = function(store_name, filter, reverse) {
  if (filter) {
    var key_range = filter.range ?
        ydn.db.KeyRange.bound(filter.range.lower, filter.range.upper) :
        ydn.db.KeyRange.only(filter.value);
    this.iterator = new ydn.db.IndexValueIterator(store_name, filter.index_name, key_range, !!reverse);
  } else {
    this.iterator = new ydn.db.ValueIterator(store_name, null, !!reverse);
  }

};

BasicQuery.prototype.name = 'BasicQuery';

/**
 *
 * @type {number}
 */
BasicQuery.prototype.itemsPerPage = 10;



/**
 *
 * @type {ydn.db.Iterator}
 * @protected
 */
BasicQuery.prototype.iterator = null;


/**
 * Execute the query and send each result to update_callback.
 * @param {Function} onNext
 * @param {Function} onCompleted
 */
BasicQuery.prototype.run = function(onNext, onCompleted) {
  var out_idx = 0;
  var query_start = new Date();
  var me = this;
  var req = query_thread.scan(function (keys, values) {
    if (!keys[0]) {
      return [];
    }
    onNext(out_idx, me.iterator.getPrimaryKey(), values[0]);
    out_idx++;
    if (out_idx >= me.itemsPerPage) {
      return [];
    }
    return [true];
  }, [this.iterator]);
  req.then(function() {
    statusBar.message(me.name + ' took ' + (new Date() - query_start) + ' ms.');
    onCompleted();
  }, function(e) {
    throw e;
  });
};


/**
 * A query planer execute by using composite indexes.
 * @param {string} store_name
 * @param {!Array.<{index_name: string, value: *}>} equi_filters equi constrain filter index names and values
 * @param {{index_name: string, range: ydn.db.Range}} postfix range and order index
 * @param {boolean} reverse
 * @constructor
 */
var CompositeQuery = function(store_name, equi_filters, postfix, reverse) {
  var index_names = [];
  var values = [];
  for (var i = 0; i < equi_filters.length; i++) {
    index_names.push(equi_filters[i].index_name);
    values.push(equi_filters[i].value);
  }

  var key_range = null;
  if (postfix) {
    index_names.push(postfix.index_name);
    if (postfix.range) {
      if (values.length == 0) {
        key_range = ydn.db.KeyRange.bound(postfix.range.lower, postfix.range.upper);
      } else {
        var lower = values.concat([postfix.range.lower]);
        var upper = values.concat([postfix.range.upper]);
        key_range = ydn.db.KeyRange.bound(lower, upper);
      }
    } else if (values.length > 0) {
      key_range =  ydn.db.KeyRange.starts(values);
    }
  } else if (values.length > 1) {
    key_range =  ydn.db.KeyRange.only(values);
  } else if (values.length == 1) {
    key_range =  ydn.db.KeyRange.only(values[0]);
  }

  if (index_names.length > 0) {
    var index_name = index_names.join(', ');
    this.iterator = new ydn.db.IndexValueIterator(store_name, index_name, key_range, !!reverse);
  } else {
    this.iterator = new ydn.db.ValueIterator(store_name, key_range, !!reverse);
  }

};
CompositeQuery.prototype = Object.create(BasicQuery.prototype);

CompositeQuery.prototype.name = 'CompositeQuery';

//
///**
// * @override
// */
//CompositeQuery.prototype.run = function(onNext, onCompleted) {
//  var out_idx = 0;
//  var query_start = new Date();
//  var me = this;
//  var req = query_thread.scan([this.iterator], function (keys, values) {
//    if (!keys[0]) {
//      return [];
//    }
//    onNext(out_idx, me.iterator.getPrimaryKey(), values[0]);
//    out_idx++;
//    if (out_idx >= me.itemsPerPage) {
//      return [];
//    }
//    return [true];
//  });
//  req.then(function() {
//    statusBar.message('CompositeQuery took ' + (new Date() - query_start) + ' ms.');
//    onCompleted();
//  }, function(e) {
//    throw e;
//  });
//};


/**
 * A query planer execute by using composite indexes.
 * @param {string} store_name
 * @param {!Array.<{index_name: string, value: *}>} equi_filters equi constrain filter index names and values
 * @param {boolean} reverse
 * @constructor
 */
var SortedMergeQuery = function(store_name, equi_filters, reverse) {

  this.out = new ydn.db.Streamer(db, store_name);

  this.iterators = [];
  for (var i = 0; i < equi_filters.length; i++) {
    var range = ydn.db.KeyRange.only(equi_filters[i].value);
    var iter = new ydn.db.IndexIterator(store_name, equi_filters[i].index_name, range, reverse);
    this.iterators.push(iter);
  }
};
SortedMergeQuery.prototype = Object.create(BasicQuery.prototype);


/**
 *
 * @type {ydn.db.Streamer}
 * @private
 */
SortedMergeQuery.prototype.out = null;


/**
 *
 * @type {!Array.<ydn.db.IndexIterator>}
 * @protected
 */
SortedMergeQuery.prototype.iterators = [];


/**
 * @override
 */
SortedMergeQuery.prototype.run = function(onNext, onCompleted) {

  var out_idx = 0;
  var me = this;

  this.out.setSink(function(key, value) {
    if (out_idx < me.itemsPerPage) {
      onNext(out_idx, key, value);
    }
    out_idx++;
  });

  var query_start = new Date();
  var solver = new ydn.db.algo.SortedMerge(this.out, this.itemsPerPage);
  var req = query_thread.scan(solver, this.iterators);
  req.then(function() {
    statusBar.message('SortedMergeQuery took ' + (new Date() - query_start) + ' ms.');
    onCompleted();
  }, function(e) {
    throw e;
  });
};


/**
 * A query planer execute by using composite indexes.
 * @param {string} store_name
 * @param {!Array.<{index_name: string, value: *}>} equi_filters equi constrain filter index names and values
 * @param {{index_name: string, range: ydn.db.Range}} postfix range and order index
 * @param {boolean} reverse
 * @constructor
 */
var ZigzagMergeQuery = function(store_name, equi_filters, postfix, reverse) {

  this.out = new ydn.db.Streamer(db, store_name);

  this.prefix_iterators = [];
  for (var i = 0; i < equi_filters.length; i++) {
    var range = ydn.db.KeyRange.starts([equi_filters[i].value]);
    var index_name = equi_filters[i].index_name + ', ' + postfix.index_name;
    var iter = new ydn.db.IndexIterator(store_name, index_name, range, reverse);
    this.prefix_iterators.push(iter);
  }
};
ZigzagMergeQuery.prototype = Object.create(BasicQuery.prototype);


/**
 *
 * @type {Array.<ydn.db.IndexIterator>}
 */
ZigzagMergeQuery.prototype.prefix_iterators = [];


/**
 *
 * @type {ydn.db.Streamer}
 * @private
 */
ZigzagMergeQuery.prototype.out = null;


/**
 * @override
 */
ZigzagMergeQuery.prototype.run = function(onNext, onCompleted) {

  var out_idx = 0;
  var me = this;

  this.out.setSink(function(key, value) {
    if (out_idx < me.itemsPerPage) {
      onNext(out_idx, key, value);
    }
    out_idx++;
  });

  var query_start = new Date();
  var solver = new ydn.db.algo.ZigzagMerge(this.out, this.itemsPerPage);
  var req = query_thread.scan(solver, this.prefix_iterators);
  req.then(function() {
    statusBar.message('ZigzagMergeQuery took ' + (new Date() - query_start) + ' ms.');
    onCompleted();
  }, function(e) {
    throw e;
  });
};