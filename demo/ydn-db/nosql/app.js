/**
 * NoSQL query demo
 */

var options = {}; // options = {mechanisms: ['websql']};
if (/log/.test(location.hash)) {
  if (/ui/.test(location.hash)) {
    if (ydn.debug && ydn.debug.log) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      ydn.debug.log('ydn.db', 'finest', div);
    } else {
      console.log('no logging facility');
    }
  } else {
    if (ydn.debug && ydn.debug.log) {
      ydn.debug.log('ydn.db', 'finest');
    } else {
      console.log('no logging facility');
    }
  }
}
if (/websql/.test(location.hash)) {
  options['mechanisms'] = ['websql'];
}

// ydn.debug.log('ydn.db', 'finest');

var db_name = 'nosql_demo_7';

db = new ydn.db.Storage(db_name, author_article_topic_schema, options);
// query_thread = db.branch('multirequest-parallel', 'qt'); OK in Firefox, not OK in chrome
query_thread = db.branch('single', false);
topic_names = []; // list of topic names.


/**
 * No no incresement information is given, this will fetch from the database.
 * @param {number=} n_authors changes to number of authors.
 * @param {number=} n_article changes to number of articles.
 * @return {{req: Function}} done callback.
 */                
statusBar = new StatusBar();


/**
 * Generate authors along with their articles.
 * @type {RecordGenerator}
 */
generator = new RecordGenerator();

/**
 * Query container.
 * @type {QueryContainer}
 */
queryContainer = new QueryContainer();

var init = function(keys) {
  generator.setTopics(keys);
  queryContainer.newQuery(); // first display
  statusBar.update();
};


/**
 * Initialize topics.
 */
db.keys('topic').then(function(keys) {
  if (keys.length < 10) {
    var topics = genTopics(200);
    db.put('topic', topics).then(function(t_keys) {
      statusBar.message(t_keys.length + ' topics created.');
      init(t_keys);
    }, function(e) {
      throw e;
    });
  } else {
    statusBar.message( keys.length + ' topics in the database.');
    init(keys);
  }
}, function(e) {
  throw e;
});


document.getElementById('app-menu_bar-query-sort').onchange = function() {
  queryContainer.newQuery();
};

document.getElementById('app-menu_bar-query-license').onchange = function() {
  queryContainer.newQuery();
};

ele_publisher = document.getElementById('app-menu_bar-query-publisher');
var frag = document.createDocumentFragment();
for (var i = 0; i < publishers.length; i++) {
  var option = document.createElement('option');
  option.value = publishers[i];
  option.textContent = publishers[i];
  frag.appendChild(option)
}
ele_publisher.appendChild(frag);
ele_publisher.onchange = function() {
  queryContainer.newQuery();
};

document.getElementById('app-menu_bar-query-topic').onchange = function() {
  queryContainer.newQuery();
};

document.getElementById('app-menu_bar-query-publish-after').onchange = function() {
  queryContainer.newQuery();
};
document.getElementById('app-menu_bar-query-publish-before').onchange = function() {
  queryContainer.newQuery();
};

document.getElementById('app-menu_bar-query-direction').onchange = function() {
  queryContainer.newQuery();
};

document.getElementById('app-menu_bar-query-system').onchange = function() {
  queryContainer.newQuery();
};


