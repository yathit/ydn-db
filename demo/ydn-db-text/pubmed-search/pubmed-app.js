
/**
 * @constructor
 */
var PubMedApp = function() {
  var cache = localStorage.getItem('pubmed-setting');
  this.setting = cache ? JSON.parse(cache) : {};
  App.call(this);
  var db_schema = {
    version: 23,
    fullTextCatalogs: [{
      name: 'pubmed-index',
      lang: 'en',
      sources: [
        {
          storeName: 'pubmed',
          keyPath: 'title',
          weight: 1.0
        }, {
          storeName: 'pubmed',
          keyPath: 'abstract',
          weight: 0.5
        }]
    }],
    stores: [
      {
        name: 'pubmed',
        keyPath: 'id'
      }]
  };
  this.db = new ydn.db.Storage('pubmed', db_schema);
  this.db.addEventListener('ready', function(event) {
    this.setStatus('Ready');
    var is_updated = event.getVersion() != event.getOldVersion();
    if (is_updated) {
      this.setStatus('Upgraded from version ' + event.getOldVersion() + ' to ' + event.getVersion());
      this.db.clear();
    }
    this.showStatistic(function() {
      this.tutor();
    }, this);
  }, false, this);
  this.db.addEventListener('fail', function(event) {
    this.setStatus('Database failed ' + event.getError().name);
    this.db = null;
  }, false, this);
  var btn_search = document.getElementById('search');
  btn_search.onclick = this.handleSearch.bind(this);
  var input = document.getElementById('search_input');
  input.onkeyup = this.handleInputChanged.bind(this);

  this.ele_results_.addEventListener('click', function(e) {
    var a = e.target;
    if (a.tagName == 'A' && a.className == 'toggle') {
      var pe = a.nextElementSibling.nextElementSibling;
      if (a.textContent == 'hide') {
        pe.style.display = 'none';
        a.textContent = 'show';
      } else {
        pe.style.display = '';
        a.textContent = 'hide';
      }
    }
  });

  this.stringency = 1.0;
  // this.sel_stc = document.getElementById("sel_stc");
  // this.sel_stc.onchange = this.handleStringencyChanged(this);
};
App.inherits(PubMedApp, App);


PubMedApp.prototype.handleStringencyChanged = function(e) {
  //this.stringency = parseInt(this.sel_stc.value, 10) || 0.4;
  //this.setStatus('set stringency to ' + this.stringency);
};


PubMedApp.prototype.handleInputChanged = function(event) {
  var key = event.keyCode || event.which;
  if (key == 13) {
    this.handleSearch(event);
  }
};


PubMedApp.prototype.ele_results_ = document.getElementById('results');



/**
 * @param {Array.<ydn.db.text.RankEntry>} arr
 */
PubMedApp.prototype.renderResult = function(arr) {
  this.ele_results_.innerHTML = '';
  if (!arr) {
    this.setStatus('no results', true);
    return;
  }
  var ul = document.createElement('ul');
  for (var i = 0; i < arr.length; i++) {
    var entry = arr[i];
    var li = document.createElement('li');
    var span = document.createElement('span');
    var a = document.createElement('A');
    a.target = '_blank';
    var swt = document.createElement('A');
    var div = document.createElement('div');
    div.style.display = 'none';
    swt.textContent = 'show';
    swt.className = 'toggle';
    swt.href = '#';
    // console.log(entry);
    span.textContent = entry.score.toFixed(2) + ' | ' + entry.value + ' ';
    li.appendChild(span);
    li.appendChild(swt);
    li.appendChild(a);
    li.appendChild(div);
    this.db.get(entry.storeName, entry.primaryKey).done(function(x) {
      var li = this.li;
      var entry = this.entry;
      if (entry.tokens.length > 0) {
        // console.log(entry);
      }
      var span = li.children[0];
      var swt = li.children[1];
      var a = li.children[2];
      var div = li.children[3];
      a.href = 'http://www.ncbi.nlm.nih.gov/pubmed/' + x.id;
      var title = new Highlighter(x.title);
      var html = new Highlighter(x.abstract);

      for (var j = 0; j < entry.tokens.length; j++) {
        var token = entry.tokens[j];
        for (var i = 0; i < token.loc.length; ++i) {
          if (token.keyPath == 'title') {
            title.highlight(token.loc[i], token.value.length);
          } else {
            html.highlight(token.loc[i], token.value.length);
          }
        }
      }

      a.appendChild(title.render());
      div.appendChild(html.render());
    }, {li: li, entry: entry});
    ul.appendChild(li);
  }
  this.ele_results_.appendChild(ul);
  this.tutor();
};


PubMedApp.prototype.showStatistic = function(cb, scope) {
  this.db.count('pubmed').done(function(cnt) {
    this.updateEntryCount(cnt);
  }, this);
  this.db.count('pubmed-index').done(function(cnt) {
    this.updateIndexCount(cnt);
    if (cb) {
      setTimeout(function() {
        cb.call(scope, cnt);
      }, 100);
    }
  }, this);
};

PubMedApp.prototype.ele_input_ = document.getElementById('search_input');


/**
 * @param {Event} e
 */
PubMedApp.prototype.handleSearch = function(e) {
  var start = Date.now();

  var term = this.ele_input_.value;
  var rq = this.db.search('pubmed-index', term);
  rq.progress(function(pe) {
    // console.log(pe.length + ' results found');
  }, this);
  rq.done(function(pe) {
    this.renderResult(pe);
    var etime = (Date.now() - start);
    this.setStatus(pe.length + ' results found in the database. Search took ' + etime + ' ms.');
    if (e && (pe.length == 0 || pe[0].score < this.stringency)) {
      this.setStatus(' Searching on PubMed...', true);
      this.pubmedSearch(term, function(results) {
        this.setStatus(results.length + ' results found in PubMed. indexing...');
        if (results.length > 0) {
          this.db.put('pubmed', results).done(function(x) {
            this.setStatus('Indexing done.');
            this.showStatistic(function() {
              this.handleSearch(null);
            }, this);
          }, this);
        } else {
          this.setStatus('No result for "' + term + '"');
        }
      }, this);
    }
  }, this);
};



PubMedApp.prototype.pubmedFetch = function(ids, cb, scope) {
  if (ids.length == 0) {
    cb.call(scope, []);
  }
  var url = this.pubmedUrl('efetch', ['db=pubmed', 'rettype=xml',
    'id=' + ids.join(',')]);
  App.get(url, function(json) {
    // console.log(json);
    window.ans = json;
    var articles = [];
    if (json.PubmedArticleSet) {
      var arts = json.PubmedArticleSet[1].PubmedArticle || [];
      for (var i = 0; i < arts.length; i++) {
        var cit = arts[i];
        var art = cit.MedlineCitation.Article;
        articles[i] = {
          id: cit.MedlineCitation.PMID.$t,
          title: art.ArticleTitle.$t,
          abstract: art.Abstract ? art.Abstract.AbstractText.$t : ''
        };
      }
    }
    cb.call(scope, articles);
  }, this);
};


/**
 * @param {string} type
 * @param {Array} params
 * @returns {string}
 */
PubMedApp.prototype.pubmedUrl = function(type, params) {
  var url = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/' + type + '.fcgi?';
  if (this.setting.tool) {
    params.push('tool=' + this.setting.tool);
  }
  if (this.setting.email) {
    params.push('email=' + this.setting.email);
  }
  return url += params.join('&');
};


PubMedApp.prototype.pubmedSearch = function(term, cb, scope) {
  var url = this.pubmedUrl('esearch', ['db=pubmed', 'retmode=xml',
    'term=' + term]);
  App.get(url, function(json) {
    // console.log(json);
    var id_list = json.eSearchResult[1].IdList.Id;
    var ids = [];
    if (id_list) {
      if (id_list.$t) {
        ids = [id_list.$t];
      } else {
        ids = id_list.map(function(x) {
          return x.$t;
        });
      }
    }
    this.pubmedFetch(ids, cb, scope);
  }, this);
};


/**
 * Run the app.
 */
PubMedApp.prototype.run = function() {
  // get consumer api key and emails.
  // register at: http://www.ncbi.nlm.nih.gov/books/NBK25497/#chapter2.Introduction
  if (!this.setting.tool) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', location.href);
    var me = this;
    xhr.onload = function(e) {
      // put api key in HTTMl header so that it is not copied.
      me.setting.tool = xhr.getResponseHeader('x-goog-meta-pubmed-tool');
      me.setting.email = xhr.getResponseHeader('x-goog-meta-pubmed-email');
      localStorage.setItem('pubmed-setting', JSON.stringify(me.setting));
    };

    xhr.send();
  }
};


PubMedApp.prototype.ele_tutor_ = document.getElementById('tutor');

PubMedApp.prototype.tutor = function() {
  if (!('placeholder' in this.ele_input_)) {
    return;
  }
  var hint = this.ele_input_.placeholder;
  var n_entry = this.ele_entry_.textContent;
  if (n_entry == 0) {
    this.ele_input_.placeholder = 'p53';
    this.ele_tutor_.innerHTML = 'Enter a serach term, such as: <code>p53</code>';
  } else if (n_entry <= 20) {
    this.ele_input_.placeholder = '"MDM4"';
    this.ele_tutor_.innerHTML = 'Exact stern are searched by using double quote: <code>"MDM4"</code>';
  } else if (hint == 'mdm4 p53' || (n_entry > 40 && n_entry < 60)) {
    this.ele_input_.placeholder = 'p53 -cancer';
    this.ele_tutor_.innerHTML = 'Use <code>-</code> to remove a term: <code>p53 -cancer</code>';
  } else if (hint == 'p53 mdm4') {
    this.ele_input_.placeholder = 'mdm4 p53';
    this.ele_tutor_.innerHTML = 'If we flip the two search terms, <code>mdm4 p53</code>, more weight is put in first terms';
  } else if (n_entry <= 40) {
    this.ele_input_.placeholder = 'p53 mdm4';
    this.ele_tutor_.innerHTML = 'Search two terms: <code>p53 mdm4</code>';
  } else {
    this.ele_input_.placeholder = '';
    this.ele_tutor_.innerHTML = '';
  }
};


