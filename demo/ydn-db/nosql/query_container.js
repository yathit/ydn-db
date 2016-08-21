/**
 * @fileoverview Construct query, run and update UI.
 */



/**
 * Content updator
 * @constructor
 */
var QueryContainer = function() {

  var me = this;
  this.div_base = document.createElement('div');

  // create result holder div

  this.div_base.id = 'app-content-results';

  for (var i = 0; i < this.itemsPerPage; i++) {
    var details = document.createElement('details');

    var summary = document.createElement('summary');
    var btn_delete = document.createElement('button');
    var span_title = document.createElement('span');
    var span_author = document.createElement('span');
    var span_publish = document.createElement('span');
    var span_publisher = document.createElement('span');
    var span_license = document.createElement('span');
    span_publish.className = 'summary-span summary-span-publish';
    span_author.className = 'summary-span summary-span-author';
    span_license.className = 'summary-span summary-span-license';
    span_publisher.className = 'summary-span summary-span-publisher';
    span_title.className = 'summary-span';
    span_publish.title = 'Publish on';
    span_license.title = 'License';
    span_publisher.title = 'Publisher';
    span_author.title = 'Author';
    summary.appendChild(btn_delete);
    summary.appendChild(span_publisher);
    summary.appendChild(span_license);
    summary.appendChild(span_publish);
    summary.appendChild(span_author);
    summary.appendChild(span_title);

    btn_delete.textContent = 'Delete';
    btn_delete.addEventListener('click', this.deleteItem);

    details.appendChild(summary);
    var content = document.createElement('div');
    details.appendChild(content);
    details.style.display = 'none';
    content.style.display = 'none';
    summary.onclick = function(e) {
      var summary = e.target.nodeName == 'SPAN' ? e.target.parentNode : e.target;
      var content = summary.nextSibling;
      content.style.display = content.style.display != 'block' ? 'block' : 'none';
    };
    this.div_base.appendChild(details);
  }

  // attached to main content.
  var div_content = document.getElementById('app-content');
  div_content.appendChild(this.div_base);

};


/**
 *
 * @type {number}
 * @private
 */
QueryContainer.prototype.itemsPerPage = 10;



/**
 *
 * @type {Array}
 * @private
 */
QueryContainer.prototype.startPos_ = [];

/**
 *
 * @type {Array}
 * @private
 */
QueryContainer.prototype.endPos_ = [];

/**
 * Next page.
 */
QueryContainer.prototype.next = function() {
  this.runQuery_();
};


QueryContainer.prototype.deleteItem = function (e) {

  /**
   * @type {Node}
   */
  var button = e.target;
  var details = button.parentElement.parentElement;
  var summary = details.children[0];
  var title = summary.children[4].textContent;
  var author = summary.children[3].textContent;
  var id = [author, title];
  db.clear('article', id).then(function (ok) {
    if (ok) {
      details.style.display = 'none';
      statusBar.message(title + ' deleted.');
      statusBar.updateCount(0, -1);
      queryContainer.invalidate();
    } else {
      statusBar.message('Deleting fail: ' + title);
    }

  }, function (e) {
    throw e;
  });

};


/**
 *
 * @param {number} index
 * @param key
 * @param value
 */
QueryContainer.prototype.updateItem_ = function(index, key, value) {
  var details = this.div_base.children[index];
  if (key  === null) {
    details.style.display = 'none';
    return;
  }
  var summary = details.children[0];
//  if (summary.children[3].textContent == key[0] && summary.children[4].textContent == key[1]) {
//    if (details.style.display != 'block') {
//      details.style.display = 'block';
//    }
//    return;
//  }
  var idx = key.indexOf('/');
  var author = key.substring(0, idx);
  var date = parseInt(key.substring(idx+1), 10);
  summary.children[4].textContent = author; // author
  var d = new Date(date);
  var mo = d.getMonth()+1;
  mo = mo < 10 ? '0' + mo : mo;
  var day = d.getDay();
  day = day < 10 ? '0' + day : day;
  summary.children[3].textContent = d.getFullYear() + '-' + mo + '-' + day;
  // summary.children[0] // delete button
  if (value) {
    summary.children[1].textContent = value.license || '??';
    summary.children[2].textContent = value.publisher || '';
    summary.children[5].textContent = value.title;
    var topics = '<p><b>Topics</b>: ' + value.topics.join(', ') + '</p>';
    details.children[1].innerHTML = topics + value.content;

  } else {
    summary.children[1].textContent = '';
    summary.children[2].textContent = '';
    summary.children[3].textContent = '';
    details.children[1].innerHTML = '';
    summary.children[5].textContent = ''; // title
  }

  details.style.display = 'block';  // show it in block
};


/**
 *
 * @param {!Array.<!ydn.db.Iterator>} iterators
 * @param {Function} on_exist
 * @private
 */
QueryContainer.prototype.zigzagSort_ = function(iterators, on_exist) {
  var me = this;

//  var out = new ydn.db.Streamer(db, 'article');
//  var out_idx = 0;
//  out.setSink(function(key, value) {
//    updateItem(out_idx, key, value);
//    out_idx++;
//  });

  var keys = [];

  var out_idx = 0;
  var out = {
    push: function (key, value) {
      me.updateItem_(out_idx, key, null);
      keys.push(key);
      if (out_idx == 0) {
        for (var i = 1; i < me.itemsPerPage; i++) {
          me.updateItem_(i, null, null);
        }
      }
      out_idx++;
    }
  };

  var join = new ydn.db.algo.ZigzagMerge(out, this.itemsPerPage);

  var query_start = new Date();
  var req = query_thread.scan(iterators, join);
  req.then(function() {
    //console.log('result ready');
    statusBar.message('query take ' + (new Date() - query_start) + ' ms.');
    db.list('article', keys).then(function(values) {
      //console.log(['zigzag ', keys, values]);
      for (var i = 0; i < keys.length; i++) {

        me.updateItem_(i, keys[i], values[i]);
      }
      for (var i = keys.length; i < me.itemsPerPage; i++) {
        me.updateItem_(i, null, null);
      }
    }, function(e) {
      throw e;
    });
    on_exist();
  }, function(e) {
    throw e;
  });
};


/**
 *
 * @param {!Array.<!ydn.db.Iterator>} iterators
 * @param {Function} on_exist
 * @private
 */
QueryContainer.prototype.compoundIndexSort_ = function(iterators, on_exist) {

  if (iterators.length > 1) {

    var index_names = [];
    var pre_fix_key = [];

    for (var i = 1; i < iterators.length; i++) {
      if (i > 1) {
        pre_fix_key.push(iterators[i].getKeyRange().lower);
      }
      var index = iterators[i].getIndexName();

        index_names.unshift(index);

    }

    var order_by = iterators[0].getIndexName();
    if (order_by) {
      index_names.push(order_by);
    }

    // this last key range is only one allow to be unequal upper and lower
    var range = iterators[1].getKeyRange();

    if (index_names.length > 1) {
      range = new ydn.db.KeyRange(
        pre_fix_key.concat(range.lower),
        pre_fix_key.concat([range.upper, '\uffff']));
    }

    console.log('indexes: "' + index_names.join(', ') + '" range: ' + JSON.stringify(range));

    var compoundIterator = new ydn.db.IndexValueIterator('article',
      index_names.join(', '), range,
      iterators[0].isReversed(), iterators[0].isUnique());
    iterators = [compoundIterator];
  } else {
    // change from KeyIterator to ValueIterator.
    var index_name = iterators[0].getIndexName();
    iterators[0] = index_name ? new ydn.db.IndexValueIterator('article',
      index_name, iterators[0].getKeyRange(),
      iterators[0].isReversed(), iterators[0].isUnique()) :
      new ydn.db.ValueIterator('article', iterators[0].getKeyRange(),
        iterators[0].isReversed());
  }

  var me = this;
  for (var i = 0; i < me.itemsPerPage; i++) {
    me.updateItem_(i, null, null);
  }
  var out_idx = 0;
  var query_start = new Date();
  var req = query_thread.scan([iterators[0]], function (keys, values) {
    if (!keys[0]) {
      return [];
    }
    me.updateItem_(out_idx, iterators[0].key(), values[0]);
    out_idx++;
    if (out_idx >= me.itemsPerPage) {
      return [];
    }
    return [true];
  });
  req.then(function() {
    statusBar.message('query take ' + (new Date() - query_start) + ' ms.');
    on_exist();
  }, function(e) {
    throw e;
  })
};


/**
 * @type {Array}
 */
QueryContainer.prototype.query_planer = null;


/**
 * Run the query and update UI.
 */
QueryContainer.prototype.runQuery_ = function(cb) {

  var me = this;
  var on_exist = function() {
    if (cb) {
      cb();
    }
  };

  var update = function(i, key, value) {
    me.updateItem_(i, key, value);
  };

  this.query_planer.run(update, on_exist);

};


/**
 * Collect query parameter from the UI.
 * @private
 */
QueryContainer.prototype.getQueryParams_ = function() {

  var order_by = document.getElementById('app-menu_bar-query-sort').value;

  var reverse = document.getElementById('app-menu_bar-query-direction').value == 'DES';

  var equi_filters = [];
  var pushEquiFilter = function(id) {
    var value = document.getElementById(id).value;
    if (value) {
      equi_filters.push(value);
    }
  };
  pushEquiFilter('app-menu_bar-query-license');
  pushEquiFilter('app-menu_bar-query-publisher');
  pushEquiFilter('app-menu_bar-query-topic');

  var publish_range = {
    lower: parseInt(document.getElementById('app-menu_bar-query-publish-before').value, 10),
    upper: parseInt(document.getElementById('app-menu_bar-query-publish-after').value, 10)
  };


};

QueryContainer.prototype.newQuery = function (cb) {


  var order_by = document.getElementById('app-menu_bar-query-sort').value;

  var reverse = document.getElementById('app-menu_bar-query-direction').value == 'DES';

  var equi_filters = [];
  var pushEquiFilter = function(id) {
    var value = document.getElementById('app-menu_bar-query-' + id).value;
    if (value) {
      equi_filters.push({index_name: id, value: value});
    }
  };
  pushEquiFilter('license');
  pushEquiFilter('publisher');
  pushEquiFilter('topic');

  var before = parseInt(document.getElementById('app-menu_bar-query-publish-before').value, 10);
  var after = parseInt(document.getElementById('app-menu_bar-query-publish-after').value, 10);

  var publish_range = (!isNaN(before) && !isNaN(after)) ?
      ydn.db.KeyRange.bound(+new Date(after, 1, 0), +new Date(before, 1, 0)) :
      !isNaN(before) ? ydn.db.KeyRange.upperBound(+new Date(before, 1, 0)) :
      !isNaN(after) ? ydn.db.KeyRange.lowerBound(+new Date(after, 1, 0)) : null;

  var postfix = null;
  if (!!order_by && !!publish_range) {
    throw new Error('range filter and order must be same index name');
  } else if (order_by) {
    postfix = {index_name: order_by};
  } else if (publish_range) {
    postfix = {index_name: 'publish', range: publish_range}
  }

  var system = document.getElementById('app-menu_bar-query-system').value;
  if (equi_filters.length <= 1 && !postfix) {
    this.query_planer = new BasicQuery('article', equi_filters[0], reverse);
  } else if (equi_filters.length == 0) {
    this.query_planer = new BasicQuery('article', postfix, reverse);
  } else if (system == 'zigzag') {
    if (equi_filters.length >= 1 && !!postfix) {
      this.query_planer = new ZigzagMergeQuery('article', equi_filters, postfix, reverse);
    } else {
      this.query_planer = new SortedMergeQuery('article', equi_filters, reverse);
    }
  } else {
    this.query_planer = new CompositeQuery('article', equi_filters, postfix, reverse);
  }

  this.runQuery_(cb);
};


QueryContainer.prototype.throttledUpdate_ = function () {

  if (!this.is_updating_) {
    this.is_updating_ = true;
    var me = this;
    this.newQuery(function () {
      me.is_updating_ = false;
    });
  }
};


/**
 * Data are invalidated, updating UI require.
 */
QueryContainer.prototype.invalidate = function() {
  this.throttledUpdate_();
};

