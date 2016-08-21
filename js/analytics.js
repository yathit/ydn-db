/**
 * @fileOverview Google analytics
 */

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','googleAnalytic');

(function(hostname) {

  var getUserId = function() {
    var user_name = document.getElementById('gae-user-name') || document.getElementById('user-name');
    if (user_name) {
      return user_name.textContent;
    } else {
      return '';
    }
  };

  var prepareAnalyticForCrmWebSite = function() {
    var install_link = document.getElementById('install-sugarcrm');
    if (install_link) {
      install_link.addEventListener('click', function(e) {
        googleAnalytic('send', 'event', 'sugarcrm-extension', 'install', getUserId());
      });
    }
  };

  var profile = '1';
  if (hostname == 'dev.yathit.com') {
    profile = '2';
  } else if (hostname == 'crm.yathit.com') {
    prepareAnalyticForCrmWebSite();
    profile = '3';
  }
  googleAnalytic('create', 'UA-54994894-' + profile, 'auto');
  googleAnalytic('require', 'displayfeatures');
  googleAnalytic('send', 'pageview');
})(location.hostname);
