/**
 * @fileoverview Demonstrate YDN-AUTH module login system to GAE server.
 */


var options = {
  app_id: 'test',
  login_server_url: 'http://kyawtun-ubuntu:8888', // 'https://yathit-api.appspot.com',
  proxy_server_url: 'http://kyawtun-ubuntu:8888/proxy', // 'https://yathit-api.appspot.com'
  app_server_url: 'http://kyawtun-ubuntu:8888' // 'https://yathit-api.appspot.com'
};

app = new ydn.api.App(options);
app.setAssess({cloudyrec: 1});

user = app.getUser();

var login_ele = document.getElementById('login');
var nickname_ele = document.getElementById('nickname');
var user_display = {
  setLoginUrl: function(label) {
    login_ele.textContent = 'login';
    login_ele.href = label;
  },
  setLogoutUrl: function(label) {
    login_ele.textContent = 'logout';
    login_ele.href = label;
  },
  setNickname: function(label) {
    nickname_ele.textContent = label;
  }
};
user.setView(user_display);
app.run(); // this will invoke user.refresh();

buildRestUri = function(token, resource_key, is_authenticated) {
  var version = '0';
  var base = "http://sandbox.cloudyrec.com";
  var appKey = token.app_key;
  var uri = base + "/" + version + "/" + appKey + "/" + resource_key;
  if (is_authenticated) {
    uri += '?_uname=' + token.user_id + '&' + token.password;
  }
  return uri;
};

var listResource = function() {
  var resource_key = document.getElementById('resource_key').value;
  var tr = ydn.http.getTransport('basic_auth_proxy:cloudyrec');
  var uri = buildRestUri(tr.getData(), resource_key, true);
  tr.send(uri).success(function(result) {
    var ele = document.getElementById('result');
    ele.textContent = result.text;
  });
};
