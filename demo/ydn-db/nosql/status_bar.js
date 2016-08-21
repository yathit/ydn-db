/**
 * Created with IntelliJ IDEA.
 * User: kyawtun
 */


/**
 * Static updator. Use updateStatic instead.
 */
StatusBar = function() {
  
  this.num_authors_ = 0;
  this.num_articles_ = 0;

  this.span_n_authors_ = document.getElementById('app-status_bar-num_authors');
  this.span_n_articles_ = document.getElementById('app-status_bar-num_articles');

  this.div_status_ = document.getElementById('app-status_bar-msg');
};


StatusBar.prototype.redrawCount_ = function() {
  this.span_n_authors_.textContent = this.num_authors_ + '';
  this.span_n_articles_.textContent = this.num_articles_ + '';
  this.is_updating_ = false;
};


/**
 * Update author and article count by adding.
 * @param {number} n_authors
 * @param {number} n_articles
 */
StatusBar.prototype.updateCount = function (n_authors, n_articles) {
  if (typeof n_authors != 'number' || typeof n_articles != 'number') {
    throw Error('number require');
  }
  this.num_authors_ += n_authors;
  this.num_articles_ += n_articles;

  if (!this.is_updating_) {
    this.is_updating_ = true;
    var me = this;
    setTimeout(function () {
      me.redrawCount_();
    }, 500);
  }

};

/**
 * Update author and article count.
 * @return {{done: function(number, number)}}
 */
StatusBar.prototype.update = function () {
  var me = this;

  var req = {done: null};
  var start = new Date();
  db.count('author').then(function (author_count) {
    //console.log(count);
    var time_taken = new Date() - start;
    me.message('Counting ' + author_count + ' authors take ' + time_taken + ' ms');
    me.updateCount(author_count, 0);
    start = new Date();
    db.count('article').then(function (article_count) {
      time_taken = new Date() - start;
      me.message('Counting ' + article_count + ' articles take ' + time_taken + ' ms');
      me.updateCount(0, article_count);
      if (req.done) {
        req.done(author_count, article_count);
      }
    }, function(e) {
      throw e;
    });
  }, function (e) {
    throw e;
  });
  return req;

};


/**
 * Change status to new message.
 * @param {string} msg status message.
 */
StatusBar.prototype.message = function(msg) {
  var div_status = this.div_status_;
    setTimeout(function(e) {
      div_status.textContent = msg;
    }, 4);

};