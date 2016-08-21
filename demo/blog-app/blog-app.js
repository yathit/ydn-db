/**
 * @fileoverview CMS web app using Google Sites API.
 */



/**
 * Create CMS app.
 * @constructor
 */
var BlogApp = function() {
  var schema = {
    stores: [
      {
        name: 'blog',
        Sync: {
          format: 'gcs',
          Options: {
            bucket: 'ydn-note-data',
            prefix: 'blog/'
          }
        }
      }]
  };
  this.db = new ydn.db.Storage('blog-app', schema);
};


/**
 * Run application.
 */
BlogApp.prototype.run = function() {
  var req = this.db.values('blog');
  req.progress(function(x) {
    console.log('progress');
    console.log(x);
  });
  req.then(function(x) {
    console.log(x);
  }, function(e) {
    throw e;
  }, this);
};

