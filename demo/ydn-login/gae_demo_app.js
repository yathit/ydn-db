/**
 * @fileoverview Demonstrate YDN-AUTH module login system to GAE server.
 */


var gae_options = {
  appId: 'test',
  loginServerOrigin: 'https://gae-login-server.appspot.com'
};


app = new ydn.api.App(gae_options);

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
user.refresh();
