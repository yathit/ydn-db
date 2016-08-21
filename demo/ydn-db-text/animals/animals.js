/**
 * @constructor
 */
var Animals = function() {
  var db_schema = {
    fullTextCatalogs: [{
      name: 'name',
      lang: 'en',
      sources: [
        {
          storeName: 'animal',
          keyPath: 'binomial',
          weight: 1.0
        }, {
          storeName: 'animal',
          keyPath: 'name',
          weight: 0.5
        }]
    }],
    stores: [
      {
        name: 'animal',
        keyPath: 'binomial'
      }]
  };
  this.db = new ydn.db.Storage('animals-3', db_schema);
  var btn_search = document.getElementById('search');
  btn_search.addEventListener('click', this.handleSearch.bind(this));
  var input = document.getElementById('search_input');
  input.onkeyup = this.handleInputChanged.bind(this);
};

Animals.prototype.ele_hint_ = document.getElementById('search_hint');

/**
 * @param {Array.<ydn.db.text.RankEntry>} arr
 */
Animals.prototype.hintResult = function(arr) {
  if (!arr) {
    return;
  }
  var options = [];
  var fg = document.createDocumentFragment();
  for (var i = 0; i < arr.length; ++i) {
    var tokens = arr[i].tokens;
    for (var j = 0; j < tokens.length; j++) {
      var v = tokens[j].value.toLowerCase();
      if (options.indexOf(v) == -1) {
        var opt = document.createElement('option');
        opt.value = tokens[j].value;
        fg.appendChild(opt);
        options.push(v);
      }
    }
  }
  this.ele_hint_.innerHTML = '';
  this.ele_hint_.appendChild(fg);
  this.setStatus(options.length + ' suggestion found.');
};



Animals.prototype.handleInputChanged = function(e) {
  var key = e.keyCode || e.which;
  if (key == 13) {
    this.handleSearch(e);
  } else if (this.ele_input_.value.length == 1) {
    var rq = this.db.search('name', this.ele_input_.value + '*');
    rq.progress(function(pe) {
      // console.log(pe.length + ' results found');
    }, this);
    rq.done(function(pe) {
      // console.log(pe);
      this.hintResult(pe);
    }, this);
  }
};


/**
 * @param {Array.<ydn.db.text.RankEntry>} arr
 */
Animals.prototype.renderResult = function(arr) {
  this.ele_results_.innerHTML = '';
  var ul = document.createElement('ul');
  for (var i = 0; i < arr.length; i++) {
    var entry = arr[i];
    var li = document.createElement('li');
    var span = document.createElement('span');
    // console.log(entry);
    span.textContent = entry.score.toFixed(2) + ' | ' + entry.value + ' : ' + entry.primaryKey;
    this.db.get(entry.storeName, entry.primaryKey).done(function(x) {
      this.textContent += ' [Full name: ' + x.name + ']';
    }, span);
    li.appendChild(span);
    ul.appendChild(li);
  }
  this.ele_results_.appendChild(ul);
  this.ele_hint_.innerHTML = '';
};


Animals.prototype.ele_input_ = document.getElementById('search_input');


/**
 * @param {Event} e
 */
Animals.prototype.handleSearch = function(e) {
  var rq = this.db.search('name', this.ele_input_.value);
  rq.progress(function(pe) {
    // console.log(pe.length + ' results found');
  }, this);
  rq.done(function(pe) {
    // console.log(pe);
    this.renderResult(pe);
  }, this);
};


/**
 * @param {string} url
 */
Animals.prototype.load = function(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  var me = this;
  xhr.onload = function(e) {
    var lines = xhr.responseText.split('\n');
    var animals = [];
    for (var i = 0; i < lines.length; i++) {
      var data = lines[i].split(';');
      if (data.length == 2) {
        animals.push({
          name: data[0].trim(),
          binomial: data[1].trim()
        });
      }
    }
    // console.log(animals);
    var msg = animals.length + ' animals loaded, indexing...';
    me.setStatus(msg);
    var load = function(i) {
      var n = 9;
      me.db.put('animal', animals.slice(i, i + n)).then(function(keys) {
        i = i + n;
        if (i < animals.length) {
          this.setStatus(msg + ' ' + i);
          load(i);
        } else {
          this.setStatus(msg + ' done.');
        }
      }, function(e) {
        throw e;
      }, me);
    };
    load(0);
  };
  xhr.send();
  this.setStatus('loading ' + url);
};


/**
 * Run the app.
 */
Animals.prototype.run = function() {
  this.db.addEventListener('ready', function(e) {
    this.db.count('animal').then(function(cnt) {
      // console.log(cnt);
      if (cnt < 2345) {
        this.load('data.csv');
      } else {
        this.setStatus(cnt + ' animals in this database.');
      }
    }, function(e) {
      throw e;
    }, this);
  }, false, this);
};

Animals.prototype.ele_status_ = document.getElementById('status');

Animals.prototype.ele_results_ = document.getElementById('results');


Animals.prototype.setStatus = function(msg) {
  this.ele_status_.textContent = msg;
};

