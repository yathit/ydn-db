


(function() {

  var g_comments = document.querySelector('div.g-comments');
  if (g_comments) {
    var href = g_comments.getAttribute('data-href');
    if (!href) {
      g_comments.setAttribute('data-href', window.location.toString());
    }
    g_comments.setAttribute('data-first_party_property', 'BLOGGER');
    g_comments.setAttribute('data-view_type', 'FILTERED_POSTMOD');
    var js = document.getElementById('plusone');
    if (!js) {
      js = document.createElement('script');
      js.id = 'plusone';
      js.src = 'https://apis.google.com/js/plusone.js';
      var gjs = document.getElementsByTagName('script')[0];
      gjs.parentNode.insertBefore(js, gjs);
    }
  }

  var updateChromeAppInstallButton = function(app_id, el_id) {
    var sugarcrm_install_url = 'https://chrome.google.com/webstore/detail/' + app_id;
    var app_home = 'chrome-extension://' + app_id + '/option-page.html';
    var install_btn = document.getElementById(el_id);
    if (install_btn) {
      if (window.chrome) {
        if (chrome.app.isInstalled) {
          if (el_id.substr(0, 4) != 'link') {
            install_btn.textContent = 'Installed Already';
          }
          install_btn.href = app_home;
          install_btn.setAttribute('title', 'You have already installed, visit extension page.');
        } else {
          if (!install_btn.href) {
            install_btn.href = sugarcrm_install_url;
          }
          install_btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            chrome.webstore.install(sugarcrm_install_url, function successCallback(opt) {
              if (chrome.app.isInstalled) {
                install_btn.textContent = 'Setup';
                install_btn.href = app_home;
                install_btn.setAttribute('title', 'Installed, visit extension page to get started.');
              }
            }, function failureCallback(e) {
              window.console.error(e);
              var a = document.querySelector('.alternative-install');
              if (a) {
                a.style.display = '';
              }
            });
          }
        }
      } else {
        if (el_id.substr(0, 4) != 'link') {
          install_btn.textContent = 'Install on Chrome';
        }
        install_btn.href = sugarcrm_install_url;
      }
    }
  };
  updateChromeAppInstallButton('iccdnijlhdogaccaiafdpjmbakdcdakk', 'install-sugarcrm');
  updateChromeAppInstallButton('iccdnijlhdogaccaiafdpjmbakdcdakk', 'link-install-sugarcrm');
  updateChromeAppInstallButton('ldikiokclnbceabnlbkabmcacpiednop', 'install-gmail-tracking');
  updateChromeAppInstallButton('ldikiokclnbceabnlbkabmcacpiednop', 'link-install-gmail-tracking');


  var tweetWidget = function (d) {
    var id = "twitter-wjs";
    var js, fjs = d.getElementsByTagName("script")[0], p = /^http:/.test(d.location) ? 'http' : 'https';
    if (!d.getElementById(id)) {
      js = d.createElement("script");
      js.id = id;
      js.src = p + "://platform.twitter.com/widgets.js";
      fjs.parentNode.insertBefore(js, fjs);
    }
  };
  var tweetLink = document.querySelector('a.twitter-timeline');
  if (tweetLink) {
    tweetWidget(document);
  }

  var openToc = function(el) {
    if (el) {
      if (el.tagName == 'UL') {
        el.classList.add('open');
      }
      openToc(el.parentElement);
    }
  };
  var api_toc = document.querySelector('div.api-toc');
  if (api_toc) {
    var namespace = api_toc.getAttribute('data-namespace');
    openToc(api_toc.querySelector('ul[name="' + namespace + '"]'));

    // update view source
    var view_source_link = document.querySelector('a[name="view-source"]');
    var feedback_link = document.querySelector('a[name="feedback-link"]');
    if (view_source_link) {
      if (location.pathname.substr(0, 22) == '/api/ydn/crm/sugarcrm/') {
        var path = location.pathname.replace('/api/', 'https://github.com/yathit/sugarcrm/blob/master/src/');
        path = path.replace('.html', '.js');
        view_source_link.href = path;
        feedback_link.href = 'https://github.com/yathit/sugarcrm/issues/new?title=Feedback%20for:%20' + path;
      } else if (location.pathname.substr(0, 17) == '/api/ydn/crm/inj/') {
        var path = location.pathname.replace('/api/', 'https://github.com/yathit/sugarcrm-gmail-chrome-extension/blob/master/src/');
        path = path.replace('.html', '.js');
        view_source_link.href = path;
        feedback_link.href = 'https://github.com/yathit/sugarcrm-gmail-chrome-extension/crm/issues/new?title=Feedback';
      } else if (location.pathname.substr(0, 13) == '/api/ydn/crm/') {
          var path = location.pathname.replace('/api/', 'https://github.com/yathit/crm/blob/master/src/');
          path = path.replace('.html', '.js');
          view_source_link.href = path;
          feedback_link.href = 'https://github.com/yathit/crm/issues/new?title=Feedback%20for:%20' + path;
      } else if (location.pathname.substr(0, 12) == '/api/ydn/db/') {
        // location cannot be derived for YDN-DB
        view_source_link.href = 'https://github.com/yathit/ydn-db/tree/master/src/ydn/db';
        feedback_link.href = 'https://github.com/yathit/ydn-db/issues/new?title=Feedback';
      }
    }
  }

  // show doc marker at main menu if the page is doc article page.
  var page_doc = document.querySelector('body.page-doc');
  if (page_doc) {
    var doc_li = document.querySelector('li.main-nav__item--documentation') ||
        document.querySelector('li.main-nav__item--user-guides');
    if (doc_li) {
      doc_li.classList.add('main-nav__item--current');
    }
  }

})();

// from WebFundamental
(function(document) {
  var toggleDocumentationMenu = function() {
    var navBtn = document.querySelector('.main-nav__btn');
    var navList = document.querySelector('.main-nav__list');
    var navIsOpenedClass = 'nav-is-opened';
    var navListIsOpened = false;

    navBtn.addEventListener('click', function (event) {
      event.preventDefault();

      if (!navListIsOpened) {
        addClass(navList, navIsOpenedClass);
        navListIsOpened = true;
      } else {
        removeClass(navList, navIsOpenedClass);
        navListIsOpened = false;
      }
    });
  };

  var isTouch = function() {
    return ('ontouchstart' in window) ||
        window.DocumentTouch && document instanceof DocumentTouch;
  };

  var addClass = function (element, className) {
    if (!element) { return; }
    element.className = element.className.replace(/\s+$/gi, '') + ' ' + className;
  }

  var removeClass = function(element, className) {
    if (!element) { return; }
    element.className = element.className.replace(className, '');
  }

  var html = document.querySelector('html');
  removeClass(html, 'no-js');
  addClass(html, 'js');

  if (isTouch()) {
    removeClass(html, 'no-touch');
    addClass(html, 'is-touch');
  }

  toggleDocumentationMenu();
})(document);
