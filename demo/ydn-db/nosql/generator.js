/**
 * @fileoverview Generate random records.
 */


/**
 * Generate random authors and topics.
 * @constructor
 */
var RecordGenerator = function() {
  var me = this;
  this.topic_names = [];
  this.stop_ = false;
  this.running_ = false;
  this.btn_generate_ = document.getElementById('app-menu_bar-gen_author-btn');
  this.input_num_author_ = document.getElementById('app-menu_bar-gen_author-num_author');
  this.btn_generate_.onclick = function(e) {
    if (me.running_) {
      me.stop_ = true;
    } else {
      var n = parseInt(me.input_num_author_.value, 10);
      setTimeout(function() {
        me.generate(n);
      }, 4);
    }
  }
};


/**
 *
 * @param {Array} topic_names
 */
RecordGenerator.prototype.setTopics = function(topic_names) {

  this.topic_names = [];
  var frag = document.createDocumentFragment();
  for (var i = 0; i < topic_names.length; i++) {
    this.topic_names[i] = topic_names[i];
    var opt = document.createElement('option');
    opt.value = topic_names[i];
    frag.appendChild(opt)
  }
  var data = document.getElementById('app-menu_bar-query-topics-data');
  data.appendChild(frag);
};




/**
 * Generate authors along with their articles.
 * @param {number} num_authors
 */
RecordGenerator.prototype.generate = function (num_authors) {

  var cnt = 0;
  this.stop_ = false;
  this.running_ = true;
  this.btn_generate_.textContent = 'Stop';
  var me = this;
  var gen_authors = function() {

    if (me.stop_ || cnt >= num_authors) {
      me.stop_ = false;
      me.running_ = false;
      me.input_num_author_.value = num_authors - cnt;
      me.btn_generate_.textContent = 'Generate';
      queryContainer.invalidate();
      return;
    }
    cnt++;
    var author = genAuthors(1)[0];
    var keywords = [];
    for (var j = 0, nj = Math.random()*4 + 1; j < nj; j++) {
      keywords[j] = me.topic_names[(Math.random()*me.topic_names.length) | 0];
    }
    var na = Math.random() * 10;
    var articles = genArticles(na, keywords);
    db.put('author', author);
    // since IE10 do not support array key, we use compose composite key
    // by using '/'
    var keys = articles.map(function(a) {return author.email + '/' + a.publish});
    db.put('article', articles, keys).then(function(x) {
      var msg = 'New author ' + author.email + ' added with ' +
        articles.length + ' articles.';
      //console.log(msg);
      //statusBar.message(msg);
      statusBar.updateCount(1, articles.length);
      queryContainer.invalidate();
      gen_authors();
    }, function(e) {
      throw e;
    });

  };

  gen_authors();

};